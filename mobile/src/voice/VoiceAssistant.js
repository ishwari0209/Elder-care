import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import { decide, buildBriefing } from './voiceBrain';
import {
  speak, stopSpeaking, setListeningBusy, loadVoicePreference, setVoiceEnabled, isVoiceEnabled, isSpeechAvailable,
} from './speech';

// Speech recognition lives in a native module. If this build does not include it
// yet, we keep the app running and just show that listening is unavailable.
let SR = null;
try { SR = require('expo-speech-recognition'); } catch { SR = null; }
const Recognizer = SR?.ExpoSpeechRecognitionModule;
const useRecognitionEvent = SR?.useSpeechRecognitionEvent || (() => {});

const STT_LANG = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };
const LABELS = {
  en: { listening: 'Listening… speak now', thinking: 'Thinking…', tapToTalk: 'Tap the mic and speak', yes: 'Yes', no: 'No', close: 'Close', you: 'You said', voiceOn: 'Voice on', voiceOff: 'Voice off', micLabel: 'Talk to Saathi' },
  hi: { listening: 'सुन रहा हूँ… बोलिए', thinking: 'सोच रहा हूँ…', tapToTalk: 'माइक दबाइए और बोलिए', yes: 'हाँ', no: 'नहीं', close: 'बंद करें', you: 'आपने कहा', voiceOn: 'आवाज़ चालू', voiceOff: 'आवाज़ बंद', micLabel: 'साथी से बात करें' },
  mr: { listening: 'ऐकत आहे… बोला', thinking: 'विचार करत आहे…', tapToTalk: 'माइक दाबा आणि बोला', yes: 'होय', no: 'नाही', close: 'बंद करा', you: 'तुम्ही म्हणालात', voiceOn: 'आवाज चालू', voiceOff: 'आवाज बंद', micLabel: 'साथीशी बोला' },
};

// props: language, env() -> latest {routines, medicines, done, taken, name, language},
//        onAction(action) -> Promise<boolean>, greetOnOpen (bool, data ready)
let lastGreetingAt = 0;

export default function VoiceAssistant({
  language = 'en',
  getEnv,
  onAction,
  onAIQuestion,
  greetReady,
}) {
  const L = LABELS[language] || LABELS.en;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | listening | thinking | speaking
  const [heard, setHeard] = useState('');
  const [reply, setReply] = useState('');
  const [needsYesNo, setNeedsYesNo] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);

  const pendingRef = useRef(null);
  const finalText = useRef('');
  const gotResult = useRef(false);
  const sessionDone = useRef(true);
  const alive = useRef(true);
  const languageRef = useRef(language);
  languageRef.current = language;
  // Always call the latest callbacks: the first render may happen before login.
  const getEnvRef = useRef(getEnv);
  const onActionRef = useRef(onAction);
  const onAIQuestionRef = useRef(onAIQuestion);
  getEnvRef.current = getEnv;
  onActionRef.current = onAction;
onAIQuestionRef.current = onAIQuestion;
  useEffect(() => {
    alive.current = true;
    loadVoicePreference().then(setVoiceOn);
    return () => { alive.current = false; stopSpeaking(); try { Recognizer?.abort(); } catch {} setListeningBusy(false); };
  }, []);

  // ---- say something (also shows it on screen) ----
  const say = useCallback(async (text, force = true) => {
    if (!text) return;
    setReply(text);
    setStatus('speaking');
    await speak(text, languageRef.current, { force });
    if (alive.current) setStatus('idle');
  }, []);

  // ---- greet when the dashboard opens ----
  useEffect(() => {
    if (!greetReady) return;
    if (Date.now() - lastGreetingAt < 30 * 60 * 1000) return;
    lastGreetingAt = Date.now();
    (async () => {
      await loadVoicePreference();
      if (!isVoiceEnabled()) return;
      const text = buildBriefing({ ...getEnv(), language: languageRef.current });
      await speak(text, languageRef.current);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greetReady]);



// ---- handle recognized speech and AI fallback ----
const handleText = useCallback(async (text) => {
  const recognizedText = text?.trim();

  if (!recognizedText) {
    setStatus('idle');
    return;
  }

  setStatus('thinking');
  setHeard(recognizedText);

  const env = {
    ...(getEnvRef.current?.() || {}),
    language: languageRef.current,
  };

  // First, preserve all existing deterministic voice commands.
  const result = decide({
    text: recognizedText,
    pending: pendingRef.current,
    env,
  });

  console.log('VOICE INPUT:', text);
console.log('VOICE RESULT:', result);
console.log('SAVED MEDICINES:', env.medicines);
  pendingRef.current = result.pending || null;

  setNeedsYesNo(
    ['confirmChange', 'confirmFieldEdit'].includes(
      result.pending?.type
    )
  );

  let sayText = result.say;

  // Existing recognized action: execute exactly as before.
  if (result.action) {
    let ok = false;

    try {
      ok = Boolean(
        await onActionRef.current?.(result.action)
      );
    } catch (error) {
      console.warn('Voice action failed:', error);
    }

    if (!ok) {
      sayText =
        ERRORS[languageRef.current] || ERRORS.en;

      pendingRef.current = null;
      setNeedsYesNo(false);
    }

    await say(sayText);

    if (alive.current && result.listenAgain && pendingRef.current) {
      startListening();
    }

    return;
  }

  // If the parser is waiting for confirmation, do not call AI.
  if (result.pending) {
    await say(sayText);

    if (alive.current && result.listenAgain) {
      startListening();
    }

    return;
  }

  // Empty or unrecognized command: ask Gemini.
  if (typeof onAIQuestionRef.current === 'function') {
    try {
      const answer = await onAIQuestionRef.current(
        recognizedText
      );

      // GlobalVoiceAssistant may speak the response itself.
      // If it returns text, display and speak it here instead.
      if (typeof answer === 'string' && answer.trim()) {
        await say(answer.trim());
      } else {
        setStatus('idle');
      }
    } catch (error) {
      console.warn('AI voice request failed:', error);

      await say(
        languageRef.current === 'mr'
          ? 'माफ करा, आत्ता उत्तर मिळू शकले नाही. कृपया पुन्हा प्रयत्न करा.'
          : languageRef.current === 'hi'
            ? 'माफ़ कीजिए, अभी जवाब नहीं मिल सका। कृपया फिर कोशिश कीजिए।'
            : 'Sorry, I could not get an answer right now. Please try again.'
      );
    }

    return;
  }

  // Keep the existing parser response if AI is not connected.
  await say(sayText || ERRORS[languageRef.current] || ERRORS.en);
}, [say]);


  // ---- microphone ----
  const startListening = useCallback(async () => {
    if (!Recognizer) { await say(NOT_AVAILABLE[languageRef.current] || NOT_AVAILABLE.en); return; }
    try {
      const perm = await Recognizer.requestPermissionsAsync();
      if (!perm.granted) { await say(MIC_DENIED[languageRef.current] || MIC_DENIED.en); return; }
      stopSpeaking();
      finalText.current = '';
      gotResult.current = false;
      sessionDone.current = false;
      setHeard('');
      setStatus('listening');
      setListeningBusy(true);
      Recognizer.start({
        lang: STT_LANG[languageRef.current] || 'en-IN',
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
      });
    } catch (e) {
      setListeningBusy(false);
      setStatus('idle');
      await say(NOT_AVAILABLE[languageRef.current] || NOT_AVAILABLE.en);
    }
  }, [say]);

  useRecognitionEvent('result', (event) => {
    const text = event?.results?.[0]?.transcript || '';
    if (!text) return;
    gotResult.current = true;
    setHeard(text);
    finalText.current = text;
  });

  // Called once per listening session, whether it ends normally or with an error
  // (silence / timeout end up as errors: treated as "nothing heard").
  const finishSession = () => {
    if (sessionDone.current) return;
    sessionDone.current = true;
    setListeningBusy(false);
    const text = finalText.current;
    finalText.current = '';
    handleText(text);
  };

  useRecognitionEvent('error', finishSession);
  useRecognitionEvent('end', finishSession);

  const openAndListen = async () => {
    setOpen(true);
    pendingRef.current = null;
    setNeedsYesNo(false);
    setReply('');
    await startListening();
  };

  const close = () => {
    sessionDone.current = true;
    try { Recognizer?.abort(); } catch {}
    stopSpeaking();
    setListeningBusy(false);
    pendingRef.current = null;
    setNeedsYesNo(false);
    setStatus('idle');
    setOpen(false);
  };

  const answerButton = (word) => {
    sessionDone.current = true;
    try { Recognizer?.abort(); } catch {}
    handleText(word);
  };

  const toggleVoice = async () => {
    const next = !voiceOn;
    setVoiceOn(next);
    await setVoiceEnabled(next);
  };

  return (
    <>
      {/* Voice replies on/off */}
      <TouchableOpacity
        onPress={toggleVoice}
        accessibilityRole="button"
        accessibilityLabel={voiceOn ? L.voiceOn : L.voiceOff}
        style={{ position: 'absolute', top: 8, left: 14, flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 20, backgroundColor: '#ffffffcc' }}
      >
        <Ionicons name={voiceOn ? 'volume-high' : 'volume-mute'} size={22} color={voiceOn ? C.teal : C.grey} />
        <Text style={{ marginLeft: 6, color: C.navy, fontWeight: '700' }}>{voiceOn ? L.voiceOn : L.voiceOff}</Text>
      </TouchableOpacity>

      {/* Conversation panel */}
      {open && (
        <View
          style={{
            position: 'absolute', left: 12, right: 12, bottom: 100, backgroundColor: '#fff', borderRadius: 24,
            padding: 18, borderWidth: 1, borderColor: C.line, elevation: 8,
            shadowColor: '#0F2E5C', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            {status === 'listening' ? <Ionicons name="mic" size={26} color={C.red} />
              : status === 'thinking' ? <ActivityIndicator color={C.teal} />
              : <Ionicons name="chatbubble-ellipses" size={26} color={C.teal} />}
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.navy, marginLeft: 10, flex: 1 }}>
              {status === 'listening' ? L.listening : status === 'thinking' ? L.thinking : L.tapToTalk}
            </Text>
            <TouchableOpacity onPress={close} accessibilityLabel={L.close} style={{ padding: 6 }}>
              <Ionicons name="close" size={26} color={C.grey} />
            </TouchableOpacity>
          </View>

          {!!heard && (
            <Text style={{ fontSize: 16, color: C.grey, marginBottom: 6 }}>
              {L.you}: <Text style={{ color: C.text, fontWeight: '700' }}>{heard}</Text>
            </Text>
          )}
          {!!reply && <Text style={{ fontSize: 19, lineHeight: 26, color: C.navy, fontWeight: '700' }}>{reply}</Text>}

          {needsYesNo && status !== 'thinking' && (
            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              <TouchableOpacity onPress={() => answerButton('yes')} style={{ flex: 1, backgroundColor: C.green, borderRadius: 16, minHeight: 56, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>{L.yes}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => answerButton('no')} style={{ flex: 1, backgroundColor: C.red, borderRadius: 16, minHeight: 56, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>{L.no}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Big microphone button */}
      <TouchableOpacity
        onPress={status === 'listening' ? () => { try { Recognizer?.stop(); } catch {} } : openAndListen}
        accessibilityRole="button"
        accessibilityLabel={L.micLabel}
        style={{
          position: 'absolute', right: 18, bottom: 24, width: 68, height: 68, borderRadius: 34,
          backgroundColor: status === 'listening' ? C.red : C.navy, alignItems: 'center', justifyContent: 'center',
          elevation: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
        }}
      >
        <Ionicons name={status === 'listening' ? 'stop' : 'mic'} size={34} color="#fff" />
      </TouchableOpacity>
    </>
  );
}

const ERRORS = {
  en: 'Sorry, I could not save that. Please try again.',
  hi: 'माफ़ कीजिए, सेव नहीं हो पाया। कृपया फिर कोशिश कीजिए।',
  mr: 'माफ करा, जतन करता आले नाही. कृपया पुन्हा प्रयत्न करा.',
};
const MIC_DENIED = {
  en: 'Please allow microphone permission in your phone settings.',
  hi: 'कृपया फ़ोन की सेटिंग में माइक्रोफ़ोन की अनुमति दीजिए।',
  mr: 'कृपया फोनच्या सेटिंगमध्ये मायक्रोफोनची परवानगी द्या.',
};
const NOT_AVAILABLE = {
  en: 'Voice listening is not available on this phone.',
  hi: 'इस फ़ोन पर बोलकर आदेश देना उपलब्ध नहीं है।',
  mr: 'या फोनवर बोलून आदेश देणे उपलब्ध नाही.',
};

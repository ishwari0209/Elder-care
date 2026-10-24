import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Linking, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Backdrop from '../components/Backdrop';
import { C } from '../theme';
import { useSaathi } from '../context/SaathiContext';
import { chatWithSaathi } from '../api';
import { SHARE_HEALTH_NOTES } from '../chatConfig';
import { NAME_TO_CODE } from '../soundConfig';
import {
  speak, stopSpeaking, setListeningBusy, loadVoicePreference, setVoiceEnabled, isVoiceEnabled, isSpeechAvailable,
} from '../voice/speech';

// Speech recognition is a native module; the screen still works (typing) without it.
let SR = null;
try { SR = require('expo-speech-recognition'); } catch { SR = null; }
const Recognizer = SR?.ExpoSpeechRecognitionModule;
const useRecognitionEvent = SR?.useSpeechRecognitionEvent || (() => {});
const STT_LANG = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };
const CODE_TO_NAME = { en: 'English', hi: 'Hindi', mr: 'Marathi' };

const UI = {
  English: {
    title: 'Talk to Saathi',
    hello: (n) => `Hello${n ? ` ${n}` : ''}! I am Saathi. How are you feeling today? You can tell me anything, or ask for a joke or a story.`,
    placeholder: 'Type your message...',
    typing: 'Saathi is typing...',
    listening: 'Listening... speak now',
    chips: ['I am not feeling well', 'I miss my children', 'I am feeling bored', 'Tell me a joke'],
    call: (n) => `Call ${n}`, family: 'family', doctor: 'Call doctor', emergency: 'Call emergency 112', helpline: 'Call helpline 14416',
    noFamily: 'Save an emergency contact in your profile to call from here.',
    noDoctor: 'Save your doctor\'s number in your profile to call from here.',
    error: 'Sorry, I could not reply right now. Please try again.',
    clear: 'Clear chat', clearAsk: 'Clear this conversation?', yes: 'Clear', no: 'Cancel',
    micOff: 'Microphone is not available. Please type your message.',
    micDenied: 'Please allow the microphone to speak to Saathi.',
    note: 'Saathi is an AI, not a doctor. In an emergency call 112.',
    hear: 'Hear again',
  },
  Hindi: {
    title: 'साथी से बात करें',
    hello: (n) => `नमस्ते${n ? ` ${n}` : ''}! मैं साथी हूँ। आज आप कैसा महसूस कर रहे हैं? आप मुझसे कुछ भी कह सकते हैं, या चुटकुला या कहानी सुन सकते हैं।`,
    placeholder: 'अपना संदेश लिखें...',
    typing: 'साथी लिख रहा है...',
    listening: 'सुन रहा हूँ... बोलिए',
    chips: ['मेरी तबीयत ठीक नहीं है', 'मुझे बच्चों की याद आ रही है', 'मुझे बोरियत हो रही है', 'एक चुटकुला सुनाओ'],
    call: (n) => `${n} को फ़ोन करें`, family: 'परिवार', doctor: 'डॉक्टर को फ़ोन करें', emergency: 'आपातकालीन 112 पर कॉल करें', helpline: 'हेल्पलाइन 14416 पर कॉल करें',
    noFamily: 'यहाँ से फ़ोन करने के लिए प्रोफ़ाइल में आपातकालीन संपर्क सेव करें।',
    noDoctor: 'यहाँ से फ़ोन करने के लिए प्रोफ़ाइल में डॉक्टर का नंबर सेव करें।',
    error: 'माफ़ कीजिए, अभी जवाब नहीं दे पाया। कृपया फिर से कोशिश करें।',
    clear: 'चैट साफ़ करें', clearAsk: 'यह बातचीत साफ़ करें?', yes: 'साफ़ करें', no: 'रद्द करें',
    micOff: 'माइक्रोफ़ोन उपलब्ध नहीं है। कृपया संदेश लिखें।',
    micDenied: 'साथी से बोलने के लिए कृपया माइक्रोफ़ोन की अनुमति दें।',
    note: 'साथी एक AI है, डॉक्टर नहीं। आपात स्थिति में 112 पर कॉल करें।',
    hear: 'फिर से सुनें',
  },
  Marathi: {
    title: 'साथीशी बोला',
    hello: (n) => `नमस्कार${n ? ` ${n}` : ''}! मी साथी. आज तुम्हाला कसं वाटतंय? तुम्ही मला काहीही सांगू शकता, किंवा विनोद किंवा गोष्ट ऐकू शकता.`,
    placeholder: 'तुमचा संदेश लिहा...',
    typing: 'साथी लिहीत आहे...',
    listening: 'ऐकत आहे... बोला',
    chips: ['मला बरं वाटत नाही', 'मला मुलांची आठवण येतेय', 'मला कंटाळा आलाय', 'एक विनोद सांगा'],
    call: (n) => `${n} यांना फोन करा`, family: 'कुटुंब', doctor: 'डॉक्टरांना फोन करा', emergency: 'आपत्कालीन 112 वर कॉल करा', helpline: 'हेल्पलाइन 14416 वर कॉल करा',
    noFamily: 'इथून फोन करण्यासाठी प्रोफाइलमध्ये आपत्कालीन संपर्क सेव्ह करा.',
    noDoctor: 'इथून फोन करण्यासाठी प्रोफाइलमध्ये डॉक्टरांचा नंबर सेव्ह करा.',
    error: 'माफ करा, आत्ता उत्तर देता आले नाही. कृपया पुन्हा प्रयत्न करा.',
    clear: 'चॅट साफ करा', clearAsk: 'ही संभाषण साफ करायची?', yes: 'साफ करा', no: 'रद्द करा',
    micOff: 'मायक्रोफोन उपलब्ध नाही. कृपया संदेश लिहा.',
    micDenied: 'साथीशी बोलण्यासाठी कृपया मायक्रोफोनची परवानगी द्या.',
    note: 'साथी एक AI आहे, डॉक्टर नाही. आणीबाणीत 112 वर कॉल करा.',
    hear: 'पुन्हा ऐका',
  },
};

// Conversation is kept only in memory (never saved to disk) and is cleared when another user logs in.
const store = { userId: null, messages: [] };
let nextId = 1;
const newId = () => `m${nextId++}`;

const dial = async (number) => {
  try {
    await Linking.openURL(`tel:${String(number).replace(/[^\d+]/g, '')}`);
  } catch {
    Alert.alert('', `Please dial ${number} manually.`);
  }
};

export default function ChatScreen({ navigation }) {
  const { currentUser, profile, contacts, language } = useSaathi();

  const languageName = CODE_TO_NAME[language] && !profile?.language
    ? CODE_TO_NAME[language]
    : (UI[profile?.language] ? profile.language : CODE_TO_NAME[language] || 'English');
  const ui = UI[languageName];
  const code = NAME_TO_CODE[languageName];
  const firstName = String(profile?.name || currentUser?.name || '').trim().split(/\s+/)[0];
  const userKey = String(currentUser?._id || currentUser?.id || currentUser?.email || '');

  if (store.userId !== userKey) { store.userId = userKey; store.messages = []; }

  const [messages, setMessages] = useState(() => store.messages);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(isVoiceEnabled());
  const listRef = useRef(null);
  const finalText = useRef('');
  const sessionDone = useRef(true);
  const busyRef = useRef(false);

  const commit = useCallback((next) => { store.messages = next; setMessages(next); }, []);

  useEffect(() => {
    loadVoicePreference().then(() => setVoiceOn(isVoiceEnabled()));
    return () => { stopSpeaking(); setListeningBusy(false); try { Recognizer?.abort(); } catch {} };
  }, []);

  useEffect(() => {
    if (!messages.length) commit([{ id: newId(), role: 'assistant', text: ui.hello(firstName), local: true, lang: code }]);
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (raw) => {
    const text = String(raw ?? input).trim();
    if (!text || busyRef.current) return;
    stopSpeaking();
    setInput('');
    const withUser = [...store.messages, { id: newId(), role: 'user', text }];
    commit(withUser);
    busyRef.current = true; setBusy(true);

    try {
      const res = await chatWithSaathi({
        messages: withUser.filter((m) => !m.local).slice(-12).map((m) => ({ role: m.role, text: m.text })),
        language: languageName,
        profile: {
          name: firstName,
          age: profile?.age || '',
          notes: SHARE_HEALTH_NOTES
            ? [profile?.conditions && `Conditions: ${profile.conditions}`, profile?.allergies && `Allergies: ${profile.allergies}`].filter(Boolean).join('. ')
            : '',
          hasFamily: Boolean(contacts?.phone?.trim()),
          familyRelation: contacts?.relation || '',
          hasDoctor: Boolean((contacts?.doctorPhone || profile?.doctorPhone || '').trim()),
        },
      });
      commit([...store.messages, { id: newId(), role: 'assistant', text: res.reply, actions: res.actions || [], lang: res.lang || code }]);
      speak(res.reply, res.lang || code); // respects the voice on/off switch
    } catch (e) {
      commit([...store.messages, { id: newId(), role: 'assistant', text: ui.error, local: true, lang: code }]);
    } finally {
      busyRef.current = false; setBusy(false);
    }
  };

  // ---- microphone (same approach as the voice assistant) ----
  const startListening = async () => {
    if (!Recognizer) { Alert.alert('', ui.micOff); return; }
    try {
      const perm = await Recognizer.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert('', ui.micDenied); return; }
      stopSpeaking();
      finalText.current = '';
      sessionDone.current = false;
      setListening(true);
      setListeningBusy(true);
      Recognizer.start({ lang: STT_LANG[code] || 'en-IN', interimResults: true, continuous: false, maxAlternatives: 1 });
    } catch (e) {
      setListening(false); setListeningBusy(false);
      Alert.alert('', ui.micOff);
    }
  };
  const stopListening = () => { try { Recognizer?.stop(); } catch {} };

  useRecognitionEvent('result', (event) => {
    if (sessionDone.current) return;
    const text = event?.results?.[0]?.transcript || '';
    if (text) { finalText.current = text; setInput(text); }
  });
  const finishListening = () => {
    if (sessionDone.current) return;
    sessionDone.current = true;
    setListening(false); setListeningBusy(false);
    const text = finalText.current.trim();
    finalText.current = '';
    if (text) send(text);
  };
  useRecognitionEvent('error', finishListening);
  useRecognitionEvent('end', finishListening);

  const toggleVoice = async () => { const next = !voiceOn; setVoiceOn(next); await setVoiceEnabled(next); };

  const clearChat = () => Alert.alert(ui.clear, ui.clearAsk, [
    { text: ui.no, style: 'cancel' },
    { text: ui.yes, style: 'destructive', onPress: () => { stopSpeaking(); commit([]); } },
  ]);

  const renderActions = (actions = []) => {
    const familyName = contacts?.name?.trim() || ui.family;
    const doctorNumber = (contacts?.doctorPhone || profile?.doctorPhone || '').trim();
    const buttons = [];
    actions.forEach((a) => {
      if (a === 'emergency') buttons.push({ key: a, label: ui.emergency, icon: 'medkit', color: C.red, onPress: () => dial('112') });
      if (a === 'helpline') buttons.push({ key: a, label: ui.helpline, icon: 'heart', color: C.navy, onPress: () => dial('14416') });
      if (a === 'call_family') {
        const phone = contacts?.phone?.trim();
        buttons.push(phone
          ? { key: a, label: ui.call(familyName), icon: 'call', color: C.teal, onPress: () => dial(phone) }
          : { key: a, hint: ui.noFamily });
      }
      if (a === 'call_doctor') {
        buttons.push(doctorNumber
          ? { key: a, label: ui.doctor, icon: 'call', color: C.teal, onPress: () => dial(doctorNumber) }
          : { key: a, hint: ui.noDoctor });
      }
    });
    return buttons.map((b) => b.hint
      ? <Text key={b.key} style={{ color: C.grey, fontSize: 14, marginTop: 8 }}>{b.hint}</Text>
      : (
        <TouchableOpacity
          key={b.key}
          onPress={b.onPress}
          accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: b.color, borderRadius: 14, minHeight: 50, marginTop: 10, paddingHorizontal: 14 }}
        >
          <Ionicons name={b.icon} size={22} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17, marginLeft: 8, flexShrink: 1 }}>{b.label}</Text>
        </TouchableOpacity>
      ));
  };

  const renderItem = ({ item }) => {
    const mine = item.role === 'user';
    return (
      <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
        <View
          style={{
            maxWidth: '86%', padding: 14, borderRadius: 20,
            borderBottomRightRadius: mine ? 6 : 20, borderBottomLeftRadius: mine ? 20 : 6,
            backgroundColor: mine ? C.teal : '#fff',
            shadowColor: '#0F2E5C', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
          }}
        >
          <Text selectable style={{ fontSize: 18, lineHeight: 26, color: mine ? '#fff' : C.text }}>{item.text}</Text>
          {!mine && isSpeechAvailable() && (
            <TouchableOpacity onPress={() => speak(item.text, item.lang || code, { force: true })} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, minHeight: 36 }}>
              <Ionicons name="volume-high" size={20} color={C.teal} />
              <Text style={{ color: C.teal, fontWeight: '700', marginLeft: 6 }}>{ui.hear}</Text>
            </TouchableOpacity>
          )}
          {!mine && !!item.actions?.length && renderActions(item.actions)}
        </View>
      </View>
    );
  };

  return (
    <Backdrop>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.85)', borderBottomWidth: 1, borderColor: C.line }}>
            <TouchableOpacity onPress={() => { stopSpeaking(); navigation.goBack(); }} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }} accessibilityLabel="Back">
              <Ionicons name="arrow-back" size={26} color={C.navy} />
            </TouchableOpacity>
            <Text style={{ flex: 1, fontSize: 20, fontWeight: '900', color: C.navy }} numberOfLines={1}>{ui.title}</Text>
            <TouchableOpacity onPress={toggleVoice} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Voice">
              <Ionicons name={voiceOn ? 'volume-high' : 'volume-mute'} size={24} color={voiceOn ? C.teal : C.grey} />
            </TouchableOpacity>
            <TouchableOpacity onPress={clearChat} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={ui.clear}>
              <Ionicons name="trash-outline" size={24} color={C.grey} />
            </TouchableOpacity>
          </View>

          {/* messages */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 14, paddingBottom: 8 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={busy ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}>
                <ActivityIndicator color={C.teal} />
                <Text style={{ marginLeft: 10, color: C.grey, fontSize: 16 }}>{ui.typing}</Text>
              </View>
            ) : null}
          />

          {/* quick topics */}
          <View style={{ paddingVertical: 6 }}>
            <FlatList
              horizontal
              data={ui.chips}
              keyExtractor={(c) => c}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => send(item)}
                  disabled={busy}
                  style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1.5, borderColor: C.teal, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', marginRight: 8, opacity: busy ? 0.5 : 1 }}
                >
                  <Text style={{ color: C.teal, fontWeight: '800', fontSize: 16 }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* input */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingBottom: 6 }}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={listening ? ui.listening : ui.placeholder}
              placeholderTextColor={C.grey}
              multiline
              maxLength={1000}
              style={{ flex: 1, minHeight: 52, maxHeight: 120, backgroundColor: '#fff', borderRadius: 26, borderWidth: 1.5, borderColor: listening ? C.red : C.line, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12, fontSize: 18, color: C.text }}
            />
            <TouchableOpacity
              onPress={listening ? stopListening : startListening}
              accessibilityLabel="Microphone"
              style={{ width: 52, height: 52, borderRadius: 26, marginLeft: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: listening ? C.red : '#fff', borderWidth: 1.5, borderColor: listening ? C.red : C.teal }}
            >
              <Ionicons name={listening ? 'stop' : 'mic'} size={26} color={listening ? '#fff' : C.teal} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => send()}
              disabled={busy || !input.trim()}
              accessibilityLabel="Send"
              style={{ width: 52, height: 52, borderRadius: 26, marginLeft: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: C.teal, opacity: busy || !input.trim() ? 0.45 : 1 }}
            >
              <Ionicons name="send" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={{ textAlign: 'center', color: C.grey, fontSize: 12, paddingHorizontal: 16, paddingBottom: 8 }}>{ui.note}</Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Backdrop>
  );
}

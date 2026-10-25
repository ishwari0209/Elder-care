import React, { useEffect, useRef } from 'react';
import { TouchableOpacity } from 'react-native';
import { Modal, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from './PrimaryButton';
import { C } from '../theme';
import { speak, stopSpeaking, loadVoicePreference, isSpeechAvailable } from '../voice/speech';

const ICON = { morning: 'sunny', afternoon: 'partly-sunny', evening: 'moon' };

// Friendly pop-up shown once each time the app is opened / the user logs in.
export default function WelcomeModal({ visible, data, onClose }) {
  // The pop-up text refreshes every few seconds (countdowns); the voice must only
  // speak ONCE per opening, using what was on screen when it appeared.
  const latest = useRef(data);
  latest.current = data;

  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      await loadVoicePreference(); // respects the user's voice on/off switch
      const d = latest.current;
      if (!cancelled && d) speak(d.speech, d.languageCode);
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopSpeaking();
    };
  }, [visible]);

  if (!data) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,46,92,0.55)', justifyContent: 'center', padding: 22 }}>
        <View
          style={{
            backgroundColor: '#fff', borderRadius: 28, padding: 24,
            shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={ICON[data.part]} size={42} color={C.teal} />
            </View>
            <Text style={{ fontSize: 26, fontWeight: '900', color: C.navy, textAlign: 'center', marginTop: 14 }}>{data.title}</Text>
            <Text style={{ fontSize: 20, color: C.text, textAlign: 'center', marginTop: 6, lineHeight: 28 }}>{data.greeting}</Text>
          </View>

          <View style={{ marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderColor: C.line }}>
            {data.upcoming.length ? (
              <>
                <Text style={{ fontSize: 16, fontWeight: '800', color: C.grey, marginBottom: 8 }}>{data.header}</Text>
                {data.upcoming.map((u, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
                    <Ionicons name={u.kind === 'medicine' ? 'medkit' : 'checkmark-circle-outline'} size={26} color={C.teal} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: C.navy }}>{u.name}</Text>
                      <Text style={{ fontSize: 15, color: C.grey }}>{u.kindLabel} {'\u2022'} {u.time} {'\u2022'} {u.when}</Text>
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <Text style={{ fontSize: 17, color: C.grey, textAlign: 'center' }}>{data.none}</Text>
            )}
          </View>

          {isSpeechAvailable() && (
            <TouchableOpacity
              onPress={() => speak(data.speech, data.languageCode, { force: true })}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: 10 }}
            >
              <Ionicons name="volume-high" size={24} color={C.teal} />
              <Text style={{ marginLeft: 8, fontSize: 17, fontWeight: '800', color: C.teal }}>{data.replay}</Text>
            </TouchableOpacity>
          )}

          <PrimaryButton title={data.ok} onPress={onClose} style={{ marginTop: 6 }} />
        </View>
      </View>
    </Modal>
  );
}

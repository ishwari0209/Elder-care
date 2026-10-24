import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useSaathi } from '../context/SaathiContext';
import { notificationSpeech } from './voiceBrain';
import { speak, loadVoicePreference } from './speech';

// Reads Saathi notifications aloud:
//  - app open    -> spoken the moment the notification arrives
//  - app closed  -> the phone plays the recorded voice sound; tapping the notification
//                   opens the app and the full message (with the name) is spoken
export default function VoiceNotifications() {
  const { currentUser, routines, medicines, done, taken, profile, language } = useSaathi();
  const envRef = useRef({});
  envRef.current = {
    name: currentUser?.name || profile?.name || '',
    routines, medicines, done, taken, language,
  };
  const spoken = useRef(new Set());

  useEffect(() => {
    if (!currentUser) return undefined;
    loadVoicePreference();

    const readAloud = async (notification, { force = false } = {}) => {
      const id = notification?.request?.identifier;
      if (id && spoken.current.has(id)) return; // never say the same notification twice
      if (id) spoken.current.add(id);
      const data = notification?.request?.content?.data;
      const text = notificationSpeech(data, { ...envRef.current, now: new Date() });
      if (text) await speak(text, envRef.current.language, { force });
    };

    const received = Notifications.addNotificationReceivedListener((n) => readAloud(n));
    // Tapping is a deliberate action, so speak even if the voice switch is off.
    const tapped = Notifications.addNotificationResponseReceivedListener((r) => readAloud(r.notification, { force: true }));

    // App was closed and opened by tapping a notification: read it (only if it is recent).
    Notifications.getLastNotificationResponseAsync().then((r) => {
      const at = r?.notification?.date;
      if (r && at && Date.now() - at * (at < 1e12 ? 1000 : 1) < 10 * 60 * 1000) readAloud(r.notification, { force: true });
    }).catch(() => {});

    return () => { received.remove(); tapped.remove(); };
  }, [currentUser]);

  return null;
}

// Tells Expo to SHOW notifications even while the app is open.
// Without this, a reminder that arrives while the app is in the foreground is silently dropped.
import * as Notifications from 'expo-notifications';
import { loadVoicePreference, isVoiceEnabled, isSpeechAvailable } from '../voice/speech';

Notifications.setNotificationHandler({
  handleNotification: async () => {
    await loadVoicePreference();
    // App open: the app reads the full message aloud itself (with the medicine /
    // routine name), so skip the recorded sound to avoid two voices at once.
    const appWillSpeak = isSpeechAvailable() && isVoiceEnabled();
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: !appWillSpeak,
      shouldSetBadge: false,
    };
  },
});

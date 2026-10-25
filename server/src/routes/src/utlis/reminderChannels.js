import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { USE_VOICE_SOUNDS, soundFile } from '../soundConfig';

// Android fixes a channel's sound when it is created, so there is one channel per
// kind + language. They use the ALARM audio stream, which plays louder than normal
// notifications and is not muted by the ringer switch.
export async function ensureReminderChannel(kind, code) {
  const fileName = USE_VOICE_SOUNDS ? soundFile(kind, code) : null;

  if (Platform.OS === 'android') {
    const channelId = `${kind}-reminders-${USE_VOICE_SOUNDS ? code : 'plain'}-v3`;
    const base = {
      name: `${kind === 'medicine' ? 'Medicine' : 'Routine'} reminders (${code.toUpperCase()})`,
      importance: Notifications.AndroidImportance.MAX,
      enableVibrate: true,
      vibrationPattern: [0, 500, 250, 500],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    };
    try {
      await Notifications.setNotificationChannelAsync(channelId, {
        ...base,
        ...(fileName
          ? {
              sound: fileName,
              audioAttributes: {
                usage: Notifications.AndroidAudioUsage.ALARM,
                contentType: Notifications.AndroidAudioContentType.SONIFICATION,
              },
            }
          : {}),
      });
      return { channelId, iosSound: true };
    } catch (error) {
      console.warn('Voice sound channel failed, using the normal sound:', error);
      const fallback = `${kind}-reminders-fallback-v3`;
      await Notifications.setNotificationChannelAsync(fallback, base);
      return { channelId: fallback, iosSound: true };
    }
  }

  return { channelId: undefined, iosSound: fileName || true };
}

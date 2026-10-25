
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const weekdayMap = {
  Sun: 1, Sunday: 1,
  Mon: 2, Monday: 2,
  Tue: 3, Tuesday: 3,
  Wed: 4, Wednesday: 4,
  Thu: 5, Thursday: 5,
  Fri: 6, Friday: 6,
  Sat: 7, Saturday: 7,
};

export async function requestNotificationPermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Medicine and Routine Reminders',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
    });
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleReminder({
  title,
  body,
  hour,
  minute,
  days = [],
  type = 'routine',
}) {
  const allowed = await requestNotificationPermission();

  if (!allowed) {
    throw new Error('Notification permission was not granted.');
  }

  if (
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error('Invalid reminder time.');
  }

  const validDays = days
    .map(day => weekdayMap[day])
    .filter(day => day !== undefined);

  if (validDays.length === 0) {
    throw new Error('Select at least one valid reminder day.');
  }

  const ids = [];

  for (const weekday of [...new Set(validDays)]) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: { type: 'saathi-reminder', reminderType: type },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour,
        minute,
        channelId: 'reminders',
      },
    });

    ids.push(id);
  }

  return ids;
}

export async function cancelReminder(id) {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

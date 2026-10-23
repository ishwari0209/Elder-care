
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const LEAD_MINUTES = 5;
const CHANNEL_ID = 'routine-reminders';
const FLAG = 'saathiRoutineReminder';

const WEEKDAY = {
  Sun: 1,
  Mon: 2,
  Tue: 3,
  Wed: 4,
  Thu: 5,
  Fri: 6,
  Sat: 7,
};

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MESSAGES = {
  English: {
    title: 'Saathi reminder',
    body: (name, time) => `${name} is coming up in 5 minutes (${time}).`,
  },
  Hindi: {
    title: 'साथी रिमाइंडर',
    body: (name, time) => `${name} का समय 5 मिनट में है (${time}).`,
  },
  Marathi: {
    title: 'साथी आठवण',
    body: (name, time) => `${name} ची वेळ 5 मिनिटांत आहे (${time}).`,
  },
};

const CODE_TO_NAME = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
};

function resolveLanguage(profileLanguage, appLanguage) {
  if (MESSAGES[profileLanguage]) return profileLanguage;
  return CODE_TO_NAME[appLanguage] || 'English';
}

function parseTime(value) {
  const match = String(value || '')
    .trim()
   .match(/^(\d{1,2})[:.](\d{2})\s*(AM|PM)?$/i);

  if (!match) {
    console.warn('Invalid routine time:', value);
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]?.toUpperCase();

  if (minute > 59) return null;

  if (period) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (period === 'PM' ? 12 : 0);
  } else if (hour > 23) {
    return null;
  }

  return { hour, minute };
}

function shiftBack({ hour, minute }, weekday) {
  let total = hour * 60 + minute - LEAD_MINUTES;
  let day = weekday;

  if (total < 0) {
    total += 24 * 60;
    day = weekday === 1 ? 7 : weekday - 1;
  }

  return {
    hour: Math.floor(total / 60),
    minute: total % 60,
    weekday: day,
  };
}

async function cancelExisting() {
  const scheduled =
    await Notifications.getAllScheduledNotificationsAsync();

  for (const item of scheduled) {
    if (item.content?.data?.[FLAG]) {
      await Notifications.cancelScheduledNotificationAsync(
        item.identifier
      );
    }
  }
}

async function ensurePermission() {
  const current = await Notifications.getPermissionsAsync();

  if (current.granted) return true;
  if (current.canAskAgain === false) return false;

  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

async function run(routines, profileLanguage, appLanguage) {
  if (Platform.OS === 'web') return;

  if (!Array.isArray(routines) || routines.length === 0) {
    await cancelExisting();
    return;
  }

  if (!(await ensurePermission())) {
    console.warn('Notification permission not granted.');
    return;
  }

  await cancelExisting();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Routine reminders',
      importance: Notifications.AndroidImportance.MAX,
      
    });
  }

  const message =
    MESSAGES[resolveLanguage(profileLanguage, appLanguage)];

  for (const routine of routines) {
    const parsed = parseTime(routine.time);

    if (!parsed || !routine.name) continue;

    const days =
      Array.isArray(routine.days) && routine.days.length
        ? routine.days
        : ALL_DAYS;

    for (const day of days) {
      const baseWeekday = WEEKDAY[day];
      if (!baseWeekday) continue;

      const { hour, minute, weekday } = shiftBack(
        parsed,
        baseWeekday
      );

      try {
        const id = await Notifications.scheduleNotificationAsync({
        content: {
  title: message.title,
  body: message.body(routine.name, routine.time),
  data: {
    [FLAG]: true,
    routineId: String(routine._id || ''),
  },
},
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour,
            minute,
            ...(Platform.OS === 'android'
              ? { channelId: CHANNEL_ID }
              : {}),
          },
        });

        console.log('Routine reminder scheduled:', {
  id,
  name: routine.name,
  originalTime: routine.time,
  reminderTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  weekday,
});
      } catch (error) {
        console.warn(
          'Could not schedule routine:',
          routine.name,
          error
        );
      }
    }
  }

  const scheduled =
    await Notifications.getAllScheduledNotificationsAsync();

  console.log(
    'Saathi scheduled notification count:',
    scheduled.filter((item) => item.content?.data?.[FLAG]).length
  );
}

let queue = Promise.resolve();

export function syncRoutineReminders(
  routines,
  profileLanguage,
  appLanguage
) {
  queue = queue
    .then(() => run(routines, profileLanguage, appLanguage))
    .catch((error) => {
      console.warn('Routine reminder scheduling failed:', error);
    });

  return queue;
}

export function clearRoutineReminders() {
  return syncRoutineReminders([], '', '');
}

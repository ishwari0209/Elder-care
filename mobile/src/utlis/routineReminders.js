import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import './notificationHandler';
import { ensureReminderChannel } from './reminderChannels';
import { NAME_TO_CODE } from '../soundConfig';

// Notifies 5 minutes BEFORE each saved routine, in the profile language.
// Uses one-off DATE triggers for the next few days (the same approach as the
// medicine reminders). The window is rebuilt on every app open/resume and
// whenever routines change.

const LEAD_MINUTES = 5;
const DAYS_AHEAD = 7;
const FLAG = 'saathiRoutineReminder';
// iOS keeps only 64 pending notifications in total (medicines share them).
const MAX_PENDING = Platform.OS === 'ios' ? 25 : 300;

const lateNotified = new Set(); // heads-ups already given this session
const JS_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MESSAGES = {
  English: {
    title: 'Saathi reminder',
    body: (name, time, m = 5) => `${name} is coming up in ${m} ${m === 1 ? 'minute' : 'minutes'} (${time}).`,
  },
  Hindi: {
    title: 'साथी रिमाइंडर',
    body: (name, time, m = 5) => `${name} का समय ${m} मिनट में है (${time}).`,
  },
  Marathi: {
    title: 'साथी आठवण',
    body: (name, time, m = 5) => `${name} ची वेळ ${m} मिनिटांत आहे (${time}).`,
  },
};

const CODE_TO_NAME = { en: 'English', hi: 'Hindi', mr: 'Marathi' };

function resolveLanguage(profileLanguage, appLanguage) {
  if (MESSAGES[profileLanguage]) return profileLanguage;
  return CODE_TO_NAME[appLanguage] || 'English';
}

function parseTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2})[:.](\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

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

// Every future reminder moment (routine time minus 5 min) in the next DAYS_AHEAD days.
export function planRoutineReminders(routines, now = new Date()) {
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);
  const plan = [];

  for (const routine of Array.isArray(routines) ? routines : []) {
    const parsed = parseTime(routine?.time);
    if (!parsed || !routine?.name) continue;

    const days = Array.isArray(routine.days) && routine.days.length ? routine.days : ALL_DAYS;

    for (let offset = 0; offset < DAYS_AHEAD; offset++) {
      const day = new Date(todayMidnight);
      day.setDate(todayMidnight.getDate() + offset);
      if (!days.includes(JS_DAY_NAMES[day.getDay()])) continue;

      const routineAt = new Date(day);
      routineAt.setHours(parsed.hour, parsed.minute, 0, 0);
      const remindAt = new Date(routineAt.getTime() - LEAD_MINUTES * 60 * 1000);

      if (remindAt <= now) {
        // The 5-minute mark has passed but the routine itself is still ahead (for example
        // it was just saved): give ONE heads-up right now instead of staying silent.
        const msLeft = routineAt.getTime() - now.getTime();
        const key = `${routine._id || routine.name}|${routineAt.toDateString()}|${routine.time}`;
        if (offset === 0 && msLeft >= 60 * 1000 && !lateNotified.has(key)) {
          plan.push({ routine, remindAt: new Date(now.getTime() + 4000), minutes: Math.max(1, Math.round(msLeft / 60000)), lateKey: key });
        }
        continue;
      }
      plan.push({ routine, remindAt, minutes: LEAD_MINUTES });
    }
  }

  return plan.sort((a, b) => a.remindAt - b.remindAt).slice(0, MAX_PENDING);
}

async function cancelExisting() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const item of scheduled) {
    if (item.content?.data?.[FLAG] && !item.content?.data?.test) {
      await Notifications.cancelScheduledNotificationAsync(item.identifier);
    }
  }
}

async function ensurePermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (current.canAskAgain === false) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return !!asked.granted;
}

async function run(routines, profileLanguage, appLanguage) {
  if (Platform.OS === 'web') return;

  await cancelExisting(); // start clean so edits, deletes and language changes apply
  if (!Array.isArray(routines) || !routines.length) return;

  if (!(await ensurePermission())) {
    console.warn('Notification permission not granted - routine reminders are off.');
    return;
  }

  const languageName = resolveLanguage(profileLanguage, appLanguage);
  const message = MESSAGES[languageName];
  const channel = await ensureReminderChannel('routine', NAME_TO_CODE[languageName]);
  const plan = planRoutineReminders(routines);
  let scheduledCount = 0;

  for (const { routine, remindAt, minutes, lateKey } of plan) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body(routine.name, routine.time, minutes),
          sound: channel.iosSound,
          data: {
            [FLAG]: true,
            routineId: String(routine._id || ''),
            name: routine.name,
            time: routine.time,
            minutes,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: remindAt,
          ...(channel.channelId ? { channelId: channel.channelId } : {}),
        },
      });
      if (lateKey) lateNotified.add(lateKey);
      scheduledCount += 1;
    } catch (error) {
      console.warn('Could not schedule routine reminder:', routine.name, error);
    }
  }

  const first = plan[0];
  console.log(
    `Routine reminders scheduled: ${scheduledCount}` +
      (first ? ` (next: "${first.routine.name}" at ${first.remindAt.toLocaleString()})` : ' (none in the next days)')
  );
}

// Calls are queued so quick successive saves never overlap.
let queue = Promise.resolve();

export function syncRoutineReminders(routines, profileLanguage, appLanguage) {
  queue = queue
    .then(() => run(routines, profileLanguage, appLanguage))
    .catch((error) => console.warn('Routine reminder scheduling failed:', error));
  return queue;
}

// Used on logout.
export function clearRoutineReminders() {
  return syncRoutineReminders([], '', '');
}

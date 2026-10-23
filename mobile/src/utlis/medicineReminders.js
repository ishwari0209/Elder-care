import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const FLAG = 'saathiMedicineReminder';
const CHANNEL_ID = 'medicine-reminders';
const DAYS_AHEAD = 30;
// iOS keeps only 64 pending local notifications; Android allows far more.
const MAX_PENDING = Platform.OS === 'ios' ? 60 : 400;

const JS_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

let syncing = false;
let queued = null;

function parseTime(value) {
  const match = String(value || '')
    .trim()
    .match(/^(\d{1,2})[:.](\d{2})\s*(AM|PM)?$/i);
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
  return { hour, minute, text: String(value).trim() };
}

function localDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function testMedicineNotification() {
  await Notifications.requestPermissionsAsync();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Saathi Test', body: 'Medicine notifications are working!' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10,
    },
  });
}

async function cancelExistingMedicineReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const item of scheduled) {
    if (item.content?.data?.[FLAG]) {
      await Notifications.cancelScheduledNotificationAsync(item.identifier);
    }
  }
}

// Schedules a one-off notification for every real calendar date that is
//   (a) between the medicine's start and end date, AND
//   (b) one of the weekdays the person ticked.
export async function syncMedicineReminders(medicines = []) {
  if (Platform.OS === 'web') return;

  // If a sync is running, remember the latest request and run it afterwards.
  if (syncing) {
    queued = medicines;
    return;
  }
  syncing = true;

  try {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) {
      const requested = await Notifications.requestPermissionsAsync();
      if (!requested.granted) return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Medicine reminders',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    await cancelExistingMedicineReminders();

    const now = new Date();
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);
    const pending = [];

    for (const medicine of medicines || []) {
      if (!medicine?.name || !medicine?.times) continue;

      const times = String(medicine.times)
        .split(/[,;\n]+/)
        .map(parseTime)
        .filter(Boolean);
      if (!times.length) continue;

      const days =
        Array.isArray(medicine.days) && medicine.days.length
          ? medicine.days
          : ALL_DAYS;

      const start = DATE_RE.test(medicine.start || '') ? medicine.start : null;
      const end = DATE_RE.test(medicine.end || '') ? medicine.end : null;

      for (let offset = 0; offset < DAYS_AHEAD; offset++) {
        const date = new Date(todayMidnight);
        date.setDate(todayMidnight.getDate() + offset);
        const dateString = localDateString(date);

        if (start && dateString < start) continue;
        if (end && dateString > end) break; // past the end date: stop
        if (!days.includes(JS_DAY_NAMES[date.getDay()])) continue;

        for (const time of times) {
          const trigger = new Date(date);
          trigger.setHours(time.hour, time.minute, 0, 0);
          if (trigger <= now) continue;
          pending.push({ medicine, trigger, time: time.text });
        }
      }
    }

    // Soonest first; the list is rebuilt on every app open/resume,
    // so later reminders get scheduled as time passes.
    pending.sort((a, b) => a.trigger - b.trigger);

    for (const { medicine, trigger, time } of pending.slice(0, MAX_PENDING)) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Saathi medicine reminder',
            body: `Time for ${medicine.name} — ${medicine.dosage || ''}. Follow your prescribed instructions.`,
            sound: true,
            data: {
              [FLAG]: true,
              medicineId: String(medicine._id || ''),
              time,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: trigger,
            ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
          },
        });
      } catch (error) {
        console.warn('Could not schedule medicine reminder:', error);
      }
    }
  } catch (error) {
    console.warn('Medicine reminder scheduling failed:', error);
  } finally {
    syncing = false;
    if (queued) {
      const next = queued;
      queued = null;
      syncMedicineReminders(next);
    }
  }
}

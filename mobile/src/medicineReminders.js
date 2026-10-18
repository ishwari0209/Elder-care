
import * as Notifications from 'expo-notifications';

const DAYS = {
  Sun: 1,
  Mon: 2,
  Tue: 3,
  Wed: 4,
  Thu: 5,
  Fri: 6,
  Sat: 7,
};

let syncing = false;

function parseTime(value) {
  const match = String(value || '').trim().match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
  );

  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();

  if (hour < 1 || hour > 12 || minute > 59) return null;

  hour = (hour % 12) + (period === 'PM' ? 12 : 0);
  return { hour, minute };
}

function localDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function syncMedicineReminders(medicines) {
  if (syncing) return;
  syncing = true;

  try {
    if (process.env.EXPO_OS === 'android') {
      await Notifications.setNotificationChannelAsync('medicine-reminders', {
        name: 'Medicine reminders',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
      });
    }

    const existing =
      await Notifications.getAllScheduledNotificationsAsync();

    // Cancel only notifications created by Saathi medicine reminders.
    for (const notification of existing) {
      if (notification.content.data?.saathiMedicineReminder) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
      }
    }

    if (!medicines.length) return;

    const permissions = await Notifications.getPermissionsAsync();

    if (!permissions.granted) {
      const requested = await Notifications.requestPermissionsAsync();
      if (!requested.granted) return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Schedule the next 30 days. Refresh these on app launch and
    // whenever medicines are saved, edited, or removed.
    for (const medicine of medicines) {
      const times = String(medicine.times || '')
        .split(',')
        .map(parseTime)
        .filter(Boolean);

      if (!times.length) continue;

      const days = Array.isArray(medicine.days) && medicine.days.length
        ? medicine.days
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      const start = /^\d{4}-\d{2}-\d{2}$/.test(medicine.start || '')
        ? medicine.start
        : localDateString(today);

      const end = /^\d{4}-\d{2}-\d{2}$/.test(medicine.end || '')
        ? medicine.end
        : null;

      for (let offset = 0; offset < 30; offset++) {
        const date = new Date(today);
        date.setDate(today.getDate() + offset);

        const dateString = localDateString(date);
        const dayName = Object.keys(DAYS).find(
          (day) => DAYS[day] === date.getDay() + 1
        );

        if (dateString < start || (end && dateString > end)) continue;
        if (!days.includes(dayName)) continue;

        for (const time of times) {
          const trigger = new Date(date);
          trigger.setHours(time.hour, time.minute, 0, 0);

          if (trigger <= new Date()) continue;

          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Saathi medicine reminder',
              body: `Time for ${medicine.name} — ${medicine.dosage}. Follow your prescribed instructions.`,
              sound: 'default',
              data: {
                saathiMedicineReminder: true,
                medicineId: String(medicine._id || ''),
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: trigger,
              ...(process.env.EXPO_OS === 'android'
                ? { channelId: 'medicine-reminders' }
                : {}),
            },
          });
        }
      }
    }
  } catch (error) {
    console.warn('Medicine reminder scheduling failed:', error);
  } finally {
    syncing = false;
  }
}

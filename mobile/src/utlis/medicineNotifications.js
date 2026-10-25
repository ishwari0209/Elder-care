
// import { Platform } from 'react-native';
// import * as Notifications from 'expo-notifications';

// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: false,
//     shouldShowBanner: true,
//     shouldShowList: true,
//   }),
// });

// export async function requestReminderPermission() {
//   if (Platform.OS === 'web') {
//     return false;
//   }

//   const { status: existingStatus } =
//     await Notifications.getPermissionsAsync();

//   let status = existingStatus;

//   if (status !== 'granted') {
//     const result = await Notifications.requestPermissionsAsync();
//     status = result.status;
//   }

//   return status === 'granted';
// }

// function parseTime(value) {
//   const match = String(value || '').trim().match(
//     /^(\d{1,2})[:.](\d{2})\s*(AM|PM)?$/i
//   );

//   if (!match) return null;

//   let hour = Number(match[1]);
//   const minute = Number(match[2]);
//   const period = match[3]?.toUpperCase();

//   if (minute > 59 || hour > 23) return null;

//   if (period) {
//     if (hour < 1 || hour > 12) return null;
//     hour = hour % 12 + (period === 'PM' ? 12 : 0);
//   }

//   if (hour > 23) return null;

//   return { hour, minute };
// }

// export async function scheduleMedicineReminders(medicines) {
//   if (Platform.OS === 'web') {
//     throw new Error(
//       'Local medicine reminders require the native mobile app.'
//     );
//   }

//   const permitted = await requestReminderPermission();

//   if (!permitted) {
//     throw new Error('Please allow notifications in phone settings.');
//   }

//   // Replace previously scheduled Saathi medicine reminders.
//   const existing = await Notifications.getAllScheduledNotificationsAsync();

//   for (const notification of existing) {
//     if (notification.content.data?.source === 'saathi-medicine') {
//       await Notifications.cancelScheduledNotificationAsync(
//         notification.identifier
//       );
//     }
//   }

//   const ids = [];

//   for (const medicine of medicines) {
//     const times = String(medicine.times || '')
//       .split(',')
//       .map((time) => time.trim())
//       .filter(Boolean);

//     for (const time of times) {
//       const parsed = parseTime(time);
//       if (!parsed) continue;

//       // Expo calendar weekday: Sunday=1, Monday=2, ... Saturday=7.
//       const days = Array.isArray(medicine.days) && medicine.days.length
//         ? medicine.days
//         : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

//       const weekdays = {
//         Sun: 1, Mon: 2, Tue: 3, Wed: 4,
//         Thu: 5, Fri: 6, Sat: 7,
//       };

//       for (const day of days) {
//         const weekday = weekdays[day];
//         if (!weekday) continue;

//         const id = await Notifications.scheduleNotificationAsync({
//           content: {
//             title: 'Saathi medicine reminder',
//             body: `Reminder: ${medicine.name} (${medicine.dosage || 'as prescribed'}) at ${time}.`,
//             data: {
//               source: 'saathi-medicine',
//               medicineId: String(medicine._id || ''),
//               time,
//             },
//           },
//           trigger: {
//             type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
//             weekday,
//             hour: parsed.hour,
//             minute: parsed.minute,
//             repeats: true,
//           },
//         });

//         ids.push(id);
//       }
//     }
//   }

//   return ids;
// }

// export async function cancelMedicineReminders() {
//   if (Platform.OS === 'web') return;

//   const existing = await Notifications.getAllScheduledNotificationsAsync();

//   for (const notification of existing) {
//     if (notification.content.data?.source === 'saathi-medicine') {
//       await Notifications.cancelScheduledNotificationAsync(
//         notification.identifier
//       );
//     }
//   }
// }

// import { Platform } from 'react-native';
// import * as Notifications from 'expo-notifications';
// import { ensureReminderChannel } from './reminderChannels';
// import { NAME_TO_CODE } from '../soundConfig';

// const TEXT = {
//   routine: {
//     English: ['Saathi reminder', 'Test routine is coming up in 5 minutes.'],
//     Hindi: ['साथी रिमाइंडर', 'टेस्ट दिनचर्या का समय 5 मिनट में है।'],
//     Marathi: ['साथी आठवण', 'टेस्ट दिनचर्येची वेळ 5 मिनिटांत आहे.'],
//   },
//   medicine: {
//     English: ['Saathi medicine reminder', 'It is time for Test medicine.'],
//     Hindi: ['साथी दवा रिमाइंडर', 'टेस्ट दवा लेने का समय हो गया है।'],
//     Marathi: ['साथी औषध आठवण', 'टेस्ट औषध घेण्याची वेळ झाली आहे.'],
//   },
// };

// // Sends a real routine/medicine style reminder (same channel, voice sound and data)
// // after `seconds`, so you can check the voice without waiting for a schedule.
// export async function scheduleTestReminder(kind, languageName = 'English', seconds = 10) {
//   const language = TEXT[kind][languageName] ? languageName : 'English';
//   const permission = await Notifications.getPermissionsAsync();
//   if (!permission.granted && !(await Notifications.requestPermissionsAsync()).granted) {
//     throw new Error('Enable notifications for Saathi in your phone settings.');
//   }
//   const channel = await ensureReminderChannel(kind, NAME_TO_CODE[language]);
//   const [title, body] = TEXT[kind][language];

//   return Notifications.scheduleNotificationAsync({
//     content: {
//       title,
//       body,
//       sound: channel.iosSound,
//       data: kind === 'routine'
//         ? { saathiRoutineReminder: true, test: true, name: 'Test routine', time: '', minutes: 5 }
//         : { saathiMedicineReminder: true, test: true, name: 'Test medicine', dosage: '', time: '' },
//     },
//     trigger: {
//       type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
//       seconds,
//       ...(Platform.OS === 'android' && channel.channelId ? { channelId: channel.channelId } : {}),
//     },
//   });
// }

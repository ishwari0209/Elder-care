
import React from 'react';
import { View, Button, Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useSaathi } from './context/SaathiContext';
import { scheduleTestReminder } from './utlis/testReminders';

export default function NotificationTest() {
  const { profile, language } = useSaathi();
  const languageName = profile?.language || { en: 'English', hi: 'Hindi', mr: 'Marathi' }[language] || 'English';

  async function testVoice(kind) {
    try {
      await scheduleTestReminder(kind, languageName, 10);
      Alert.alert('Scheduled', 'Lock the phone or leave the app and wait 10 seconds. You should hear the voice.');
    } catch (error) {
      Alert.alert('Notification error', error.message);
    }
  }

  async function testNotification() {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('test-reminders', {
          name: 'Test reminders',
          importance: Notifications.AndroidImportance.MAX,
        });
      }

      let permission = await Notifications.getPermissionsAsync();

      if (!permission.granted) {
        permission = await Notifications.requestPermissionsAsync();
      }

      if (!permission.granted) {
        Alert.alert('Permission denied', 'Enable notifications for Saathi in your phone settings.');
        return;
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Saathi test',
          body: 'Your local notifications are working!',
          data: { test: true },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 10,
          ...(Platform.OS === 'android'
            ? { channelId: 'test-reminders' }
            : {}),
        },
      });

      console.log('Test notification scheduled:', id);
      Alert.alert('Scheduled', 'Keep Saathi in the background and wait 10 seconds.');
    } catch (error) {
      console.error('Test notification failed:', error);
      Alert.alert('Notification error', error.message);
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Button title="Test notification in 10 seconds" onPress={testNotification} />
      <View style={{ height: 14 }} />
      <Button title="Test ROUTINE voice reminder (10 s)" onPress={() => testVoice('routine')} />
      <View style={{ height: 14 }} />
      <Button title="Test MEDICINE voice reminder (10 s)" onPress={() => testVoice('medicine')} />
    </View>
  );
}

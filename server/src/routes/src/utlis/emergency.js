
import { Alert, Linking, Platform } from 'react-native';

export async function callEmergencyContact(phone) {
  const number = String(phone || '').trim();

  if (!number) {
    Alert.alert('No contact', 'Add an emergency contact first.');
    return;
  }

  const url = `tel:${number}`;

  try {
    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Unavailable', 'Calling is not supported on this device.');
    }
  } catch {
    Alert.alert('Error', 'Could not open the phone dialer.');
  }
}

export async function prepareEmergencySMS(phone, message) {
  const number = String(phone || '').trim();

  if (!number) {
    Alert.alert('No contact', 'Add an emergency contact first.');
    return;
  }

  const body = encodeURIComponent(message);
  const url = Platform.select({
    ios: `sms:${number}&body=${body}`,
    android: `sms:${number}?body=${body}`,
    default: `sms:${number}?body=${body}`,
  });

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      'SMS unavailable',
      'Could not open the messaging app. Please contact your emergency contact directly.'
    );
  }
}

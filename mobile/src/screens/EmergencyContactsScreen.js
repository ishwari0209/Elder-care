import React, { useState } from 'react';
import { Text } from 'react-native';
import Screen from '../components/Screen';
import FormField from '../components/FormField';
import { useSaathi } from '../context/SaathiContext';
import { C } from '../theme';
import { saveContacts } from '../api';
import { Alert } from 'react-native';
export default function EmergencyContactsScreen({ navigation, route }) {
  const { contacts, setContacts } = useSaathi(); const [err, setErr] = useState({}); const edit = route.params?.edit;
const set = k => v =>
  setContacts(prev => ({ ...prev, [k]: v }));
  const next = async () => {
    const x = {};
    if (!contacts.name.trim()) x.name = 'Primary contact name is required';
    if (!contacts.phone.trim()) x.phone = 'Primary phone is required';
    setErr(x); if (Object.keys(x).length) return;
    try {
      await saveContacts(contacts);
      edit ? navigation.goBack() : navigation.navigate('Review');
    } catch (error) {
      Alert.alert('Could not save contacts', error.message);
    }
  };
  return (
    <Screen step={edit ? '' : 'Step 4 of 5'} title="Emergency Contacts" subtitle="Prototype only: no calls or messages are made." onBack={() => navigation.goBack()} onNext={next} nextLabel={edit ? 'Save' : 'Continue'}>
      <FormField label="Primary contact name" required value={contacts.name} onChange={set('name')} error={err.name} />
      <FormField label="Relationship" value={contacts.relation} onChange={set('relation')} placeholder="e.g. Son" />
      <FormField label="Primary phone" required value={contacts.phone} onChange={set('phone')} error={err.phone} keyboardType="phone-pad" />
      <FormField label="Secondary contact name (optional)" value={contacts.name2} onChange={set('name2')} />
      <FormField label="Secondary phone (optional)" value={contacts.phone2} onChange={set('phone2')} keyboardType="phone-pad" />
      <FormField label="Doctor's name (optional)" value={contacts.doctor} onChange={set('doctor')} />
      <FormField label="Doctor's phone (optional)" value={contacts.doctorPhone} onChange={set('doctorPhone')} keyboardType="phone-pad" />
      <Text style={{ color:C.grey, fontSize:15, marginBottom:8 }}>In a real emergency, call 112.</Text>
    </Screen>
  );
}

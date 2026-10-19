import React, { useState } from 'react';
import Screen from '../components/Screen';

import FormField from '../components/FormField';
import { useSaathi } from '../context/SaathiContext';
import { saveProfile } from '../api';
import { Alert } from 'react-native';
export default function ProfileSetupScreen({ navigation, route }) {
  const { profile, setProfile, loadUserData } = useSaathi(); const [err, setErr] = useState({}); const edit = route.params?.edit;
  const set = k => v => setProfile({ ...profile, [k]: v });
  const next = async () => {
    const x = {};
    if (!profile.name.trim()) x.name = 'Name is required';
    if (!profile.phone.trim()) x.phone = 'Phone number is required';
    setErr(x); if (Object.keys(x).length) return;
    try {
      await saveProfile({ ...profile, age: profile.age ? String(profile.age) : '' });
      await loadUserData();
      edit ? navigation.goBack() : navigation.navigate('Routine');
    } catch (error) {
      Alert.alert('Could not save profile', error.message);
    }
  };
  return (
    <Screen step={edit ? '' : 'Step 1 of 5'} title="Your Profile" subtitle="Tell us a little about you." onBack={() => navigation.goBack()} onNext={next} nextLabel={edit ? 'Save' : 'Continue'}>
      <FormField label="Full name" required value={profile.name} onChange={set('name')} error={err.name} />
      <FormField label="Age or date of birth" value={profile.age} onChange={set('age')} placeholder="e.g. 68" />
      <FormField label="Preferred language" type="chips" options={['Marathi','Hindi','English']} value={profile.language} onChange={set('language')} />
      <FormField label="Primary phone number" required value={profile.phone} onChange={set('phone')} error={err.phone} keyboardType="phone-pad" />
      <FormField label="Address / location (optional)" value={profile.address} onChange={set('address')} />
      <FormField label="Medical conditions (optional)" type="multiline" value={profile.conditions} onChange={set('conditions')} />
      <FormField label="Allergies (optional)" value={profile.allergies} onChange={set('allergies')} />
      <FormField label="Doctor's name (optional)" value={profile.doctor} onChange={set('doctor')} />
      <FormField label="Doctor's phone (optional)" value={profile.doctorPhone} onChange={set('doctorPhone')} keyboardType="phone-pad" />
    </Screen>
  );
}

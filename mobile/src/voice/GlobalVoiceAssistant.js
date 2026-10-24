
import React, { useRef } from 'react';
import { View } from 'react-native';
import { askSaathiAI } from '../api';
import { speak, stopSpeaking } from './speech';
import VoiceAssistant from './VoiceAssistant';
import { useSaathi } from '../context/SaathiContext';
import { applyTimeChange } from './voiceBrain';
import {
  saveContacts,
  updateProfile,
  saveRoutines,
  saveMedicines,
} from '../api';

export default function GlobalVoiceAssistant({ navigationRef }) {
  const {
    currentUser,
    profile,
    routines,
    medicines,
    contacts,
    done,
    taken,
    setRoutines,
    setMedicines,
    setProfile,
    setContacts,
    language,
  } = useSaathi();

  const envRef = useRef({});

  envRef.current = {
    name: currentUser?.name || profile?.name || '',
    profile,
    contacts,
    routines,
    medicines,
    done,
    taken,
    language,
  };

  const runAction = async (action) => {
    try {
      // 1. Navigate between app screens
      if (action.type === 'navigate') {
        if (!navigationRef?.isReady?.()) return false;

        const protectedRoutes = [
          'Dashboard',
          'Profile',
          'Routine',
          'Medicine',
          'Contacts',
          'Review',
          'Caregiver',
        ];

        if (protectedRoutes.includes(action.route) && !currentUser) {
          navigationRef.navigate('Login');
          return true;
        }

        navigationRef.navigate(action.route);
        return true;
      }

      // 2. Change routine or medicine reminder time
     
if (action.type === 'changeTime') {
  if (!currentUser || !action.item) return false;

  if (action.item.kind === 'routine') {
    const updatedRoutines = applyTimeChange(routines, action);

    await saveRoutines(updatedRoutines);
    setRoutines(updatedRoutines);

    return true;
  }

  if (action.item.kind === 'medicine') {
    const updatedMedicines = applyTimeChange(medicines, action);

    const savedMedicines = await saveMedicines(
      updatedMedicines,
      medicines
    );

    setMedicines(savedMedicines);
    return true;
  }

  return false;
}


      // 3. Update an existing profile field
      if (action.type === 'updateProfileField') {
        if (!currentUser) return false;

        const allowedFields = [
          'name',
          'age',
          'phone',
          'address',
          'conditions',
          'allergies',
          'doctor',
          'doctorPhone',
          'language',
        ];

        if (!allowedFields.includes(action.field)) return false;

        const value = String(action.value ?? '').trim();
        if (!value) return false;

        if (
          action.field === 'phone' &&
          !/^\+?[0-9\s-]{7,15}$/.test(value)
        ) {
          return false;
        }

        const nextProfile = {
          ...profile,
          [action.field]: value,
        };

        // Update the existing profile, not create a new one.
        await updateProfile({
          ...nextProfile,
          age: nextProfile.age
            ? String(nextProfile.age)
            : '',
        });

        setProfile(nextProfile);
        return true;
      }

      // 4. Update emergency contact information
      if (action.type === 'updateContactField') {
        if (!currentUser) return false;

        const allowedFields = [
          'name',
          'relation',
          'phone',
          'name2',
          'phone2',
          'doctor',
          'doctorPhone',
        ];

        if (!allowedFields.includes(action.field)) return false;

        const value = String(action.value ?? '').trim();
        if (!value) return false;

        if (
          ['phone', 'phone2', 'doctorPhone'].includes(action.field) &&
          !/^\+?[0-9\s-]{7,15}$/.test(value)
        ) {
          return false;
        }

        const nextContacts = {
          ...contacts,
          [action.field]: value,
        };

        await saveContacts(nextContacts);
        setContacts(nextContacts);
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Voice action failed:', error);
      return false;
    }
  };
const handleAIQuestion = async (message) => {
  if (!currentUser) {
    if (navigationRef?.isReady?.()) {
      navigationRef.navigate('Login');
    }
    return;
  }

  try {
   stopSpeaking();
    const response = await askSaathiAI({
      message,
      language: language || 'English',

      // Send only the data needed for care-related questions.
      context: {
        profile: {
          name: profile?.name || currentUser?.name || '',
          age: profile?.age || '',
          language: profile?.language || language || 'English',
        },

        routines: (routines || []).map((item) => ({
          name: item.name,
          category: item.category,
          time: item.time,
          days: item.days,
        })),

        medicines: (medicines || []).map((item) => ({
          name: item.name,
          dosage: item.dosage,
          time: item.time,
          frequency: item.frequency,
        })),
      },
    });

    const answer = response.answer;

 return answer;
  } catch (error) {
    console.error('Saathi AI error:', error.message);

  await speak(
  language === 'Marathi'
    ? 'माफ करा, आत्ता उत्तर मिळू शकले नाही. कृपया पुन्हा प्रयत्न करा.'
    : language === 'Hindi'
      ? 'माफ कीजिए, अभी जवाब नहीं मिल सका। कृपया फिर से कोशिश करें।'
      : 'Sorry, I could not get an answer right now. Please try again.',
  language === 'Marathi' ? 'mr' : language === 'Hindi' ? 'hi' : 'en',
  { force: true }
);
  }
};
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 999,
      }}
    >
     <VoiceAssistant
  language={language || 'en'}
  getEnv={() => envRef.current}
  onAction={runAction}
  onAIQuestion={handleAIQuestion}
  greetReady={false}
/>
    </View>
  );
}

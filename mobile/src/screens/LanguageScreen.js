import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSaathi } from '../context/SaathiContext';
import { C } from '../theme';

const choices = [
  { id: 'en', title: 'English', subtitle: 'Continue in English' },
  { id: 'mr', title: 'मराठी', subtitle: 'मराठीत पुढे जा' },
  { id: 'hi', title: 'हिन्दी', subtitle: 'हिन्दी में आगे बढ़ें' },
];

export default function LanguageScreen({ navigation }) {
  const { language, setLanguage, languageChosen, t } = useSaathi();
  useEffect(() => { if (languageChosen) navigation.replace('Landing'); }, [languageChosen, navigation]);
  const choose = async (id) => {
    await setLanguage(id);
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', padding: 22 }}>
      <Text style={{ fontSize: 30, fontWeight: '900', color: C.navy, marginBottom: 8 }}>Saathi</Text>
      <Text style={{ fontSize: 24, fontWeight: '800', color: C.navy, marginBottom: 8 }}>{t('Choose your language')}</Text>
      <Text style={{ color: C.grey, fontSize: 16, marginBottom: 22 }}>Choose a language for the app. You can change it later.</Text>
      {choices.map((item) => (
        <TouchableOpacity key={item.id} onPress={() => choose(item.id)} accessibilityRole="button"
          style={{ padding: 18, backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, borderWidth: language === item.id ? 2 : 1, borderColor: language === item.id ? C.teal : C.line }}>
          <Text style={{ fontSize: 21, fontWeight: '800', color: C.navy }}>{item.title}</Text>
          <Text style={{ fontSize: 15, color: C.grey, marginTop: 4 }}>{item.subtitle}</Text>
        </TouchableOpacity>
      ))}
    </SafeAreaView>
  );
}

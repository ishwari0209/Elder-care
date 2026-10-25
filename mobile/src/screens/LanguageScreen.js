import Backdrop from '../components/Backdrop';
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSaathi } from '../context/SaathiContext';
import { C } from '../theme';

import { SUPPORTED_LANGUAGES } from '../i18n/aiTranslator';

const choices = SUPPORTED_LANGUAGES.map((l) => ({ id: l.code, title: l.native, subtitle: l.name }));

export default function LanguageScreen({ navigation }) {
  const { language, setLanguage, languageChosen, t } = useSaathi();
  useEffect(() => { if (languageChosen) navigation.replace('Landing'); }, [languageChosen, navigation]);
  const choose = async (id) => {
    await setLanguage(id);
  };
  return (
    <Backdrop><SafeAreaView style={{ flex: 1, padding: 22 }}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <Text style={{ fontSize: 30, fontWeight: '900', color: C.navy, marginBottom: 8 }}>Saathi</Text>
      <Text style={{ fontSize: 24, fontWeight: '800', color: C.navy, marginBottom: 8 }}>{t('Choose your language')}</Text>
      <Text style={{ color: C.grey, fontSize: 16, marginBottom: 22 }}>{t('Choose a language for the app. You can change it later.')}</Text>
      {choices.map((item) => (
        <TouchableOpacity key={item.id} onPress={() => choose(item.id)} accessibilityRole="button"
          style={{ padding: 18, backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, borderWidth: language === item.id ? 2 : 1, borderColor: language === item.id ? C.teal : C.line }}>
          <Text style={{ fontSize: 21, fontWeight: '800', color: C.navy }}>{item.title}</Text>
          <Text style={{ fontSize: 15, color: C.grey, marginTop: 4 }}>{item.subtitle}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView></SafeAreaView></Backdrop>
  );
}

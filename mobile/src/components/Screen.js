import React from 'react';
import { Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Backdrop from './Backdrop';
import FadeIn from './FadeIn';
import PrimaryButton from './PrimaryButton';
import { C } from '../theme';
import { useSaathi } from '../context/SaathiContext';
export default function Screen({ title, subtitle, step, children, onBack, onNext, nextLabel='Continue', footer }) {
  const { t } = useSaathi();
  return (
    <Backdrop><SafeAreaView style={{ flex:1 }}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={{ padding:20, paddingBottom:30 }} keyboardShouldPersistTaps="handled">
          <FadeIn>
          {step && <Text style={{ color:C.teal, fontWeight:'700', fontSize:14 }}>{t(step)}</Text>}
          <Text style={{ fontSize:28, fontWeight:'800', color:C.navy, marginTop:2 }}>{t(title)}</Text>
          {subtitle && <Text style={{ fontSize:16, color:C.grey, marginBottom:16, marginTop:4 }}>{t(subtitle)}</Text>}
          </FadeIn>
          <FadeIn delay={150}>{children}</FadeIn>
          {onNext && <PrimaryButton title={nextLabel} onPress={onNext} />}
          {footer}
          {onBack && <PrimaryButton title={t('Back')} outline onPress={onBack} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView></Backdrop>
  );
}


import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SaathiProvider } from './src/context/SaathiContext';
import AppNavigator from './src/navigation/AppNavigator';
import VoiceNotifications from './src/voice/VoiceNotifications';

export default function App() {
  console.log('SAATHI ROOT RENDERED');

  return (
    <SaathiProvider>
      <StatusBar style="dark" />
      <VoiceNotifications />
      <AppNavigator />
    </SaathiProvider>
  );
}

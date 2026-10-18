import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SaathiProvider } from './src/context/SaathiContext';
import AppNavigator from './src/navigation/AppNavigator';
export default function App() {
  return (<SaathiProvider><StatusBar style="dark" /><AppNavigator /></SaathiProvider>);
}

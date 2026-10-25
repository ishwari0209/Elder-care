import React, { useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LanguageScreen from '../screens/LanguageScreen';
import NotificationTest from '../NotificationTest';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import CaregiverScreen from '../screens/CaregiverScreen';
import LandingScreen from '../screens/LandingScreen';
import SignupScreen from '../screens/SignupScreen';
import LoginScreen from '../screens/LoginScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import RoutineSetupScreen from '../screens/RoutineSetupScreen';
import MedicineSetupScreen from '../screens/MedicineSetupScreen';
import PrescriptionScanScreen from '../screens/PrescriptionScanScreen';
import EmergencyContactsScreen from '../screens/EmergencyContactsScreen';
import ReviewSetupScreen from '../screens/ReviewSetupScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ChatScreen from '../screens/ChatScreen';
import GlobalVoiceAssistant from '../voice/GlobalVoiceAssistant';
import VoiceNotifications from '../voice/VoiceNotifications';

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef();

export default function AppNavigator() {
  const [routeName, setRouteName] = useState('');
  const syncRoute = () => setRouteName(navigationRef.getCurrentRoute()?.name || '');
  return (
    <NavigationContainer ref={navigationRef} onReady={syncRoute} onStateChange={syncRoute}>
      <Stack.Navigator initialRouteName="Language" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Language" component={LanguageScreen} />
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Profile" component={ProfileSetupScreen} />
        <Stack.Screen name="Routine" component={RoutineSetupScreen} />
        <Stack.Screen name="Medicine" component={MedicineSetupScreen} />
        <Stack.Screen name="PrescriptionScan" component={PrescriptionScanScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="NotificationTest" component={NotificationTest} options={{ title: 'Test Notifications' }} />
        <Stack.Screen name="Contacts" component={EmergencyContactsScreen} />
        <Stack.Screen name="Review" component={ReviewSetupScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="Caregiver" component={CaregiverScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
      </Stack.Navigator>
      {/* Must be mounted inside the NavigationContainer and outside individual screens. */}
      <VoiceNotifications />
      {routeName !== 'Chat' && <GlobalVoiceAssistant navigationRef={navigationRef} />}
    </NavigationContainer>
  );
}

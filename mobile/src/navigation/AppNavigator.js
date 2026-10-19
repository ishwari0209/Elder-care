import React from 'react';
import LanguageScreen from '../screens/LanguageScreen';
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CaregiverScreen from '../screens/CaregiverScreen';
import LandingScreen from '../screens/LandingScreen';
import SignupScreen from '../screens/SignupScreen';
import LoginScreen from '../screens/LoginScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import RoutineSetupScreen from '../screens/RoutineSetupScreen';
import MedicineSetupScreen from '../screens/MedicineSetupScreen';
import EmergencyContactsScreen from '../screens/EmergencyContactsScreen';
import ReviewSetupScreen from '../screens/ReviewSetupScreen';
import DashboardScreen from '../screens/DashboardScreen';

const Stack = createNativeStackNavigator();
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Language" screenOptions={{ headerShown:false }}>
        <Stack.Screen name="Language" component={LanguageScreen} />
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Profile" component={ProfileSetupScreen} />
        <Stack.Screen name="Routine" component={RoutineSetupScreen} />
        <Stack.Screen name="Medicine" component={MedicineSetupScreen} />
        <Stack.Screen
  name="ForgotPassword"
  component={ForgotPasswordScreen}
/>
        <Stack.Screen name="Contacts" component={EmergencyContactsScreen} />
        <Stack.Screen name="Review" component={ReviewSetupScreen} />
        

        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ gestureEnabled:false }} />
        <Stack.Screen name="Caregiver" component={CaregiverScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

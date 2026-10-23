
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import PrimaryButton from '../components/PrimaryButton';
import Backdrop from '../components/Backdrop';
import FadeIn from '../components/FadeIn';
import FeatureCard from '../components/FeatureCard';
import { C, card } from '../theme';
import { useSaathi } from '../context/SaathiContext';

const F = [
  ['medkit', 'Medicine reminders', 'Keep track of scheduled medicines'],
  ['calendar', 'Daily routines', 'Meals, walks and appointments'],
  ['mic', 'Voice assistance', 'Simple, accessible interaction'],
  ['alert-circle', 'Emergency help', 'Quick access to emergency contacts'],
  ['heart', 'Health profile', 'Important care details in one place'],
  ['people', 'Family connection', 'Help loved ones stay informed'],
];

const S = [
  'Create your personal profile',
  'Add routines, medicines and emergency contacts',
  'Confirm completed activities in your dashboard',
  'Review daily progress at a glance',
];
export async function testMedicineNotification() {
  const permission = await Notifications.requestPermissionsAsync();

  console.log('Notification permission:', permission);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Saathi Test',
      body: 'Medicine notifications are working!',
      data: { test: true },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10,
    },
  });

  console.log('Test notification scheduled:', id);
}
export default function LandingScreen({ navigation }) {
  const { t, language, setLanguage } = useSaathi();

  return (
    <Backdrop>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
          {/* Header */}
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.8)',
              paddingHorizontal: 18,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: 1,
              borderColor: 'rgba(213,222,233,0.8)',
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.navigate('Landing')}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Ionicons name="heart-circle" size={34} color={C.teal} />
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '900',
                  color: C.navy,
                  marginLeft: 7,
                }}
              >
                {t('Saathi')}
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {['en', 'mr', 'hi'].map((code) => (
                <TouchableOpacity
                  key={code}
                  onPress={() => setLanguage(code)}
                  style={{ paddingHorizontal: 5, paddingVertical: 8 }}
                >
                  <Text
                    style={{
                      color: language === code ? C.navy : C.grey,
                      fontWeight: language === code ? '900' : '600',
                      fontSize: 12,
                    }}
                  >
                    {code === 'en' ? 'EN' : code === 'mr' ? 'मराठी' : 'हिंदी'}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={{ paddingVertical: 10, paddingHorizontal: 10 }}
              >
                <Text
                  style={{ color: C.teal, fontSize: 15, fontWeight: '800' }}
                >
                  {t('Login')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('Signup')}
                style={{
                  backgroundColor: C.teal,
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                }}
              >
                <Text
                  style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}
                >
                  {t('Sign Up')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero Section */}
          <FadeIn>
            <LinearGradient
              colors={['rgba(15,46,92,0.94)', 'rgba(27,138,143,0.88)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                padding: 28,
                paddingTop: 34,
                borderBottomLeftRadius: 36,
                borderBottomRightRadius: 36,
                shadowColor: '#0F2E5C',
                shadowOpacity: 0.3,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 10 },
                elevation: 8,
              }}
            >
              <Ionicons
                name="shield-checkmark"
                size={48}
                color="#7FD6D9"
              />

              <Text
                style={{
                  fontSize: 42,
                  fontWeight: '900',
                  color: '#fff',
                  marginTop: 8,
                }}
              >
                {t('Saathi')}
              </Text>

              <Text
                style={{
                  fontSize: 20,
                  color: '#BFE6E2',
                  marginTop: 4,
                }}
              >
                {t('Your AI Companion for Safer, Independent Living.')}
              </Text>

              <Text
                style={{
                  fontSize: 16,
                  color: '#fff',
                  marginTop: 12,
                  lineHeight: 23,
                }}
              >
                {t(
                  'A caring companion for daily routines, medicine schedules and staying connected with family.'
                )}
              </Text>

              <PrimaryButton
                title={t('Get Started')}
                color={C.teal}
                onPress={() => navigation.navigate('Signup')}
                style={{ marginTop: 20 }}
              />
              

              <Text
                style={{
                  color: '#D8EBF2',
                  fontSize: 13,
                  textAlign: 'center',
                  marginTop: 4,
                }}
              >
                {t('Already have an account? Use Login in the top bar.')}
              </Text>
            </LinearGradient>
          </FadeIn>

          {/* Features and Steps */}
          <View style={{ padding: 20 }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '800',
                color: C.navy,
                marginBottom: 12,
              }}
            >
              {t('What Saathi does')}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
              }}
            >
              {F.map(([icon, title, description], index) => (
                <FadeIn
                  key={title}
                  delay={200 + index * 90}
                  style={{ width: '48%' }}
                >
                  <FeatureCard
                    icon={icon}
                    title={t(title)}
                    text={t(description)}
                    full
                  />
                </FadeIn>
              ))}
            </View>

            <Text
              style={{
                fontSize: 24,
                fontWeight: '800',
                color: C.navy,
                marginVertical: 12,
              }}
            >
              {t('How it works')}
            </Text>

            {S.map((step, index) => (
              <FadeIn key={index} delay={300 + index * 120}>
                <View
                  style={[
                    card,
                    { flexDirection: 'row', alignItems: 'center' },
                  ]}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: C.teal,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: '#fff',
                        fontWeight: '800',
                        fontSize: 18,
                      }}
                    >
                      {index + 1}
                    </Text>
                  </View>

                  <Text
                    style={{ flex: 1, fontSize: 17, color: C.text }}
                  >
                    {t(step)}
                  </Text>
                </View>
              </FadeIn>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Backdrop>
  );
}

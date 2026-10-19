
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useSaathi } from '../context/SaathiContext';
import PrimaryButton from '../components/PrimaryButton';
import { C, card } from '../theme';
import { logout, saveCompletion } from '../api';

const Empty = ({ text }) => (
  <Text style={{ color: C.grey, fontSize: 16, paddingVertical: 8 }}>
    {text}
  </Text>
);

function getLocalDate() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

export default function DashboardScreen({ navigation }) {
  const {
    currentUser,
    setCurrentUser,
    profile,
    routines,
    medicines,
    contacts,
    done,
    setDone,
    taken,
    setTaken,
    language,
    setLanguage,
    t,
  } = useSaathi();

  const [savingItems, setSavingItems] = useState({});

  const today = new Date();

  const sorted = [...routines].sort((a, b) =>
    String(a.time || '').localeCompare(String(b.time || ''))
  );

  const doses = medicines
    .flatMap((medicine) =>
      String(medicine.times || '')
        .split(',')
        .map((time) => time.trim())
        .filter(Boolean)
        .map((time) => ({
          key: `${medicine._id}|${medicine.name}|${time}`,
          itemId: medicine._id,
          name: medicine.name,
          dosage: medicine.dosage,
          time,
        }))
    )
    .sort((a, b) => a.time.localeCompare(b.time));

  const doneCount = sorted.filter(
    (routine) => done[routine._id]
  ).length;

  const routinePercent = sorted.length
    ? Math.round((doneCount / sorted.length) * 100)
    : 0;

  const takenCount = doses.filter(
    (dose) => Boolean(taken[dose.key])
  ).length;

  const medicinePercent = doses.length
    ? Math.round((takenCount / doses.length) * 100)
    : 0;

  const complete = async (
    itemType,
    itemId,
    date,
    time = '',
    reportedDone = true,
    note = ''
  ) => {
    return saveCompletion({
      itemType,
      itemId,
      date,
      time,
      reportedDone,
      note,
    });
  };

  const toggleRoutine = async (routine) => {
    if (!routine._id) {
      Alert.alert(
        t('Unable to save'),
        t('This routine has no database ID. Please reload your routines.')
      );
      return;
    }

    const itemKey = `routine-${routine._id}`;

    if (savingItems[itemKey]) return;

    const nextDone = !done[routine._id];

    try {
      setSavingItems((previous) => ({
        ...previous,
        [itemKey]: true,
      }));

      await complete(
        'routine',
        routine._id,
        getLocalDate(),
        routine.time || '',
        nextDone,
        ''
      );

      setDone((previous) => ({
        ...previous,
        [routine._id]: nextDone,
      }));
    } catch (error) {
      Alert.alert(
        t('Could not save routine'),
        t(error.message || 'Please try again.')
      );
    } finally {
      setSavingItems((previous) => ({
        ...previous,
        [itemKey]: false,
      }));
    }
  };

  const confirm = async (dose) => {
    if (!dose.itemId) {
      Alert.alert(
        t('Unable to confirm'),
        t('This medicine has no database ID. Please reload your medicines.')
      );
      return;
    }

    const itemKey = `medicine-${dose.key}`;

    if (savingItems[itemKey]) return;

    const now = new Date();

    try {
      setSavingItems((previous) => ({
        ...previous,
        [itemKey]: true,
      }));

      await complete(
        'medicine',
        dose.itemId,
        getLocalDate(),
        dose.time,
        true,
        'User reported taking this medicine'
      );

      setTaken((previous) => ({
        ...previous,
        [dose.key]: now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }));

      Alert.alert(
        t('Saathi'),
        t('Your medicine confirmation was saved.')
      );
    } catch (error) {
      Alert.alert(
        t('Could not save confirmation'),
        t(error.message || 'Please try again.')
      );
    } finally {
      setSavingItems((previous) => ({
        ...previous,
        [itemKey]: false,
      }));
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setCurrentUser(null);

      navigation.reset({
        index: 0,
        routes: [{ name: 'Landing' }],
      });
    } catch (error) {
      Alert.alert(
        t('Logout error'),
        t(error.message || 'Unable to clear your session.')
      );
    }
  };

  const sos = () => {
    const phone = contacts?.phone?.trim();
    const backupPhone = contacts?.phone2?.trim();

    Alert.alert(
      t('Emergency Assistance'),
      t('Choose how you want to contact someone.'),
      [
        {
          text: t('Call emergency number 112'),
          onPress: async () => {
            try {
              await Linking.openURL('tel:112');
            } catch {
              Alert.alert(
                t('Unable to call'),
                t('Please dial 112 manually.')
              );
            }
          },
        },
        ...(phone
          ? [
              {
                text: `${t('Call')} ${contacts.name || t('primary contact')}`,
                onPress: async () => {
                  try {
                    await Linking.openURL(`tel:${phone}`);
                  } catch {
                    Alert.alert(
                      t('Unable to call'),
                      t('Please dial the contact manually.')
                    );
                  }
                },
              },
            ]
          : []),
        ...(backupPhone
          ? [
              {
                text: t('Call backup contact'),
                onPress: async () => {
                  try {
                    await Linking.openURL(`tel:${backupPhone}`);
                  } catch {
                    Alert.alert(
                      t('Unable to call'),
                      t('Please dial the contact manually.')
                    );
                  }
                },
              },
            ]
          : []),
        {
          text: t('Cancel'),
          style: 'cancel',
        },
      ]
    );
  };

  const shortcuts = [
    ['Profile', 'person', 'Profile'],
    ['Medicines', 'medkit', 'Medicine'],
    ['Routine', 'calendar', 'Routine'],
    ['Contacts', 'call', 'Contacts'],
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      >
        {/* Language selector */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginBottom: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: C.grey, marginRight: 8 }}>
            {t('Language')}:
          </Text>

          {['en', 'mr', 'hi'].map((code) => (
            <TouchableOpacity
              key={code}
              onPress={() => setLanguage(code)}
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor:
                  language === code ? C.mint : 'transparent',
              }}
            >
              <Text style={{ color: C.navy, fontWeight: '800' }}>
                {code === 'en'
                  ? 'EN'
                  : code === 'mr'
                    ? 'मराठी'
                    : 'हिंदी'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Greeting */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text
              style={{
                fontSize: 28,
                fontWeight: '800',
                color: C.navy,
              }}
            >
              {t('Hello,')}{' '}
              {currentUser?.name || profile?.name || t('friend')}
            </Text>

            <Text
              style={{
                fontSize: 16,
                color: C.grey,
                marginBottom: 14,
              }}
            >
              {today.toDateString()}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleLogout}
            style={{ padding: 10 }}
          >
            <Text style={{ color: C.teal, fontWeight: '800' }}>
              {t('Log out')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Profile reminder */}
        {(!profile?.name?.trim() || !profile?.phone?.trim()) && (
          <View style={[card, { borderWidth: 1, borderColor: C.teal }]}>
            <Text
              style={{
                fontSize: 21,
                fontWeight: '800',
                color: C.navy,
              }}
            >
              {t('Create your profile first')}
            </Text>

            <Text
              style={{
                color: C.grey,
                fontSize: 16,
                lineHeight: 22,
                marginTop: 6,
                marginBottom: 8,
              }}
            >
              {t(
                'Welcome to Saathi! Add your profile details to personalize your routines and care dashboard.'
              )}
            </Text>

            <PrimaryButton
              title={t('Create Profile')}
              color={C.teal}
              onPress={() => navigation.navigate('Profile')}
            />
          </View>
        )}

        {/* Emergency assistance */}
        <TouchableOpacity
          onPress={sos}
          accessibilityRole="button"
          accessibilityLabel={t('SOS emergency')}
          style={{
            backgroundColor: C.red,
            borderRadius: 20,
            minHeight: 80,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
            flexDirection: 'row',
          }}
        >
          <Ionicons name="alert-circle" size={36} color="#fff" />
          <Text
            style={{
              color: '#fff',
              fontSize: 28,
              fontWeight: '900',
              marginLeft: 10,
            }}
          >
            SOS
          </Text>
        </TouchableOpacity>

        {/* Shortcuts */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          {shortcuts.map(([label, iconName, screenName]) => (
            <TouchableOpacity
              key={label}
              onPress={() =>
                navigation.navigate(screenName, { edit: true })
              }
              style={[
                card,
                {
                  width: '23%',
                  alignItems: 'center',
                  padding: 10,
                  marginBottom: 0,
                },
              ]}
            >
              <Ionicons name={iconName} size={26} color={C.navy} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: C.navy,
                  marginTop: 4,
                }}
              >
                {t(label)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Caregiver dashboard */}
        <PrimaryButton
          title={t('Family / Caregiver Dashboard')}
          color={C.navy}
          onPress={() => navigation.navigate('Caregiver')}
          style={{ marginBottom: 14 }}
        />

        {/* Today's progress */}
        <View style={card}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '800',
              color: C.navy,
            }}
          >
            {t("Today's progress")}
          </Text>

          <Text style={{ color: C.grey, marginTop: 10 }}>
            {t('Routines')}: {doneCount}/{sorted.length}{' '}
            {t('completed')} ({routinePercent}%)
          </Text>

          <View
            style={{
              height: 8,
              backgroundColor: C.line,
              borderRadius: 8,
              marginTop: 6,
            }}
          >
            <View
              style={{
                width: `${routinePercent}%`,
                height: 8,
                backgroundColor: C.teal,
                borderRadius: 8,
              }}
            />
          </View>

          <Text style={{ color: C.grey, marginTop: 14 }}>
            {t('Medicines')}: {takenCount}/{doses.length}{' '}
            {t('confirmed')} ({medicinePercent}%)
          </Text>

          <View
            style={{
              height: 8,
              backgroundColor: C.line,
              borderRadius: 8,
              marginTop: 6,
            }}
          >
            <View
              style={{
                width: `${medicinePercent}%`,
                height: 8,
                backgroundColor: C.green,
                borderRadius: 8,
              }}
            />
          </View>
        </View>

        {/* Routine list */}
        <View style={card}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '800',
              color: C.navy,
            }}
          >
            {t("Today's routine")}
          </Text>

          <Text
            style={{
              color: C.teal,
              fontWeight: '700',
              marginBottom: 8,
            }}
          >
            {doneCount} {t('of')} {sorted.length} {t('done')}
          </Text>

          {sorted.length === 0 && (
            <Empty
              text={t(
                'No routine yet. Use the Routine shortcut to add one.'
              )}
            />
          )}

          {sorted.map((routine) => {
            const isDone = Boolean(done[routine._id]);
            const itemKey = `routine-${routine._id}`;
            const isSaving = Boolean(savingItems[itemKey]);

            return (
              <TouchableOpacity
                key={routine._id}
                disabled={isSaving}
                onPress={() => toggleRoutine(routine)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: 56,
                  borderTopWidth: 1,
                  borderColor: C.line,
                }}
              >
                {isSaving ? (
                  <ActivityIndicator color={C.teal} />
                ) : (
                  <Ionicons
                    name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                    size={32}
                    color={isDone ? C.green : C.grey}
                  />
                )}

                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: '700',
                    color: C.navy,
                    marginLeft: 12,
                    width: 85,
                  }}
                >
                  {routine.time}
                </Text>

                <Text
                  style={{
                    flex: 1,
                    fontSize: 17,
                    color: C.text,
                    textDecorationLine: isDone ? 'line-through' : 'none',
                  }}
                >
                  {routine.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Medicines list */}
        <View style={card}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '800',
              color: C.navy,
              marginBottom: 8,
            }}
          >
            {t('Medicines')}
          </Text>

          {doses.length === 0 && (
            <Empty
              text={t(
                'No medicines yet. Use the Medicines shortcut to add one.'
              )}
            />
          )}

          {doses.map((dose) => {
            const itemKey = `medicine-${dose.key}`;
            const isSaving = Boolean(savingItems[itemKey]);

            return (
              <View
                key={dose.key}
                style={{
                  borderTopWidth: 1,
                  borderColor: C.line,
                  paddingVertical: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: '700',
                    color: C.navy,
                  }}
                >
                  {dose.time} {dose.name}
                </Text>

                <Text style={{ fontSize: 15, color: C.grey }}>
                  {dose.dosage}
                </Text>

                {taken[dose.key] ? (
                  <Text
                    style={{
                      color: C.green,
                      fontWeight: '700',
                      fontSize: 16,
                      marginTop: 6,
                    }}
                  >
                    {t('Confirmed at')} {taken[dose.key]}
                  </Text>
                ) : (
                  <PrimaryButton
                    title={
                      isSaving
                        ? t('Saving...')
                        : t('I have taken it')
                    }
                    color={C.teal}
                    onPress={() => confirm(dose)}
                  />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

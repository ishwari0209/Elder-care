
  import React, { useState, useEffect } from 'react';
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

  import Backdrop from '../components/Backdrop';
  import PrimaryButton from '../components/PrimaryButton';
  import { useSaathi } from '../context/SaathiContext';
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

  // Supports 12:40 PM, 12.40 PM, and 24-hour times such as 13:20.
  function getScheduledDate(time, now) {
    const match = String(time || '')
      .trim()
      .match(/^(\d{1,2})[:.](\d{2})\s*(AM|PM)?$/i);

    if (!match) return null;

    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const period = match[3]?.toUpperCase();

    if (minute > 59) return null;

    if (period) {
      if (hour < 1 || hour > 12) return null;
      hour = (hour % 12) + (period === 'PM' ? 12 : 0);
    } else if (hour > 23) {
      return null;
    }

    const scheduled = new Date(now);
    scheduled.setHours(hour, minute, 0, 0);

    return scheduled;
  }

 
function getCompletionWindow(time, now) {
  const scheduled = getScheduledDate(time, now);

  if (!scheduled) {
    return {
      available: true,
      missed: false,
      late: false,
    };
  }

  const opensAt = scheduled.getTime() - 30 * 60 * 1000;
  const closesAt = scheduled.getTime() + 30 * 60 * 1000;
  const current = now.getTime();

  return {
    available: current >= opensAt && current < closesAt,
    missed: current >= closesAt,
    late: current >= closesAt,
  };
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
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 10000);

      return () => clearInterval(timer);
    }, []);

    const today = currentTime;

    const safeRoutines = Array.isArray(routines) ? routines : [];
    const todayString = [
    currentTime.getFullYear(),
    String(currentTime.getMonth() + 1).padStart(2, '0'),
    String(currentTime.getDate()).padStart(2, '0'),
  ].join('-');

  const safeMedicines = (Array.isArray(medicines) ? medicines : [])
    .filter((medicine) => {
      const start = medicine.start || '';
      const end = medicine.end || '';

      const notStarted = start && start > todayString;
      const dateExpired = end && end < todayString;
      const statusExpired = medicine.status === 'Expired';

      const todayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][currentTime.getDay()];
      const repeatDays = Array.isArray(medicine.days) && medicine.days.length ? medicine.days : null;
      const notToday = repeatDays && !repeatDays.includes(todayName);

      return !notStarted && !dateExpired && !statusExpired && !notToday;
    });

    // Convert "1:19 PM" / "08.00 AM" / "13:20" to minutes since midnight so
    // times sort chronologically (plain text sorting puts "1:19 PM" before "8:00 AM").
    const timeToMinutes = (value) => {
      const d = getScheduledDate(value, new Date(2000, 0, 1));
      return d ? d.getHours() * 60 + d.getMinutes() : Number.MAX_SAFE_INTEGER;
    };

    const sorted = [...safeRoutines].sort(
      (a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)
    );

    const doses = safeMedicines
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
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

    const doneCount = sorted.filter(
      (routine) => Boolean(done[routine._id])
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
  const now = new Date();
  const scheduled = getScheduledDate(dose.time, now);

  // Never allow confirmation before the scheduled time.
  if (scheduled && now.getTime() < scheduled.getTime()) {
    Alert.alert(
      t('Too early'),
      `You can confirm this medicine at ${dose.time}.`
    );
    return;
  }

  if (!dose.itemId) {
    Alert.alert(
      t('Unable to confirm'),
      t('This medicine has no database ID. Please reload your medicines.')
    );
    return;
  }

  const itemKey = `medicine-${dose.key}`;

  if (savingItems[itemKey]) return;

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
      <Backdrop>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
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

              <TouchableOpacity onPress={handleLogout} style={{ padding: 10 }}>
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

            {/* Today's routine */}
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

              {sorted.map((routine, index) => {
             const routineId =
  routine._id ?? routine.id ?? `routine-${index}`;

const isDone = Boolean(done[routine._id]);

const window = getCompletionWindow(
  routine.time,
  currentTime
);

const isMissed = !isDone && window.missed;
const isAvailable = window.available || isMissed;

const itemKey = `routine-${routineId}`;
const isSaving = Boolean(savingItems[itemKey]);

                return (
                  <TouchableOpacity
                    key={routineId}
                   disabled={isSaving || isDone || !isAvailable}
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
                    ) : isDone ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={32}
                        color={C.green}
                      />
                    ) : isMissed ? (
                      <Ionicons
                        name="close-circle"
                        size={32}
                        color={C.red}
                      />
                    ) : (
                      <Ionicons
                        name="ellipse-outline"
                        size={32}
                        color={C.grey}
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
                        color: isMissed ? C.red : C.text,
                        textDecorationLine:
                          isDone || isMissed ? 'line-through' : 'none',
                      }}
                    >
                      {routine.name}
                      {isMissed ? ` — ${t('Missed')}` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Medicines */}
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
  const isTaken = Boolean(taken[dose.key]);

  const scheduled = getScheduledDate(dose.time, currentTime);
  const nowMs = currentTime.getTime();

  const isMissed =
    !isTaken &&
    scheduled !== null &&
    nowMs >= scheduled.getTime() + 30 * 60 * 1000;

  const isAvailable =
    scheduled !== null &&
    nowMs >= scheduled.getTime() &&
    nowMs < scheduled.getTime() + 30 * 60 * 1000;

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

      {isTaken ? (
        <Text
          style={{
            color: C.green,
            fontWeight: '700',
            fontSize: 16,
            marginTop: 6,
          }}
        >
          ✓ {t('Confirmed at')} {taken[dose.key]}
        </Text>
      ) : isMissed ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <Ionicons
            name="close-circle"
            size={24}
            color={C.red}
          />

          <Text
            style={{
              color: C.red,
              fontWeight: '800',
              fontSize: 16,
              marginLeft: 8,
            }}
          >
            {t('Missed')}
          </Text>

          <TouchableOpacity
            onPress={() => confirm(dose)}
            disabled={isSaving}
            style={{ marginLeft: 12 }}
          >
            <Text style={{ color: C.teal, fontWeight: '700' }}>
              {isSaving ? t('Saving...') : t('Confirm late')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <PrimaryButton
          title={
            isSaving
              ? t('Saving...')
              : isAvailable
                ? t('I have taken it')
                : t('Not yet due')
          }
          color={C.teal}
          disabled={isSaving || !isAvailable}
          onPress={() => confirm(dose)}
        />
        )}
    </View>
  );
})}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Backdrop>
    );
}

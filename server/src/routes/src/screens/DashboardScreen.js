
  import React, { useState, useEffect, useRef } from 'react';
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
  import WelcomeModal from '../components/WelcomeModal';
  import { buildWelcome } from '../utlis/welcomeGreeting';
  import { useSaathi } from '../context/SaathiContext';
  import LanguagePicker from '../components/LanguagePicker';
  import { C, card } from '../theme';
  import { logout, saveCompletion } from '../api';
    import { applyTimeChange } from '../voice/voiceBrain';
  import {
    getLocalDate,
    getScheduledDate,
    getCompletionWindow,
    timeToMinutes,
    todaysRoutines,
    todaysMedicines,
    buildDoses,
  } from '../voice/schedule';

  const Empty = ({ text }) => (
    <Text style={{ color: C.grey, fontSize: 16, paddingVertical: 8 }}>
      {text}
    </Text>
  );

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
      setRoutines,
      setMedicines,
      dataLoaded,
      welcomeShown,
      setWelcomeShown,
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

    const todayString = getLocalDate(currentTime);
    const safeMedicines = todaysMedicines(medicines, currentTime);
    const sorted = todaysRoutines(routines, currentTime);
    const doses = buildDoses(safeMedicines);

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

    const toggleRoutine = async (routine, { silent = false, forceDone = false } = {}) => {
      if (!routine._id) {
        if (!silent) Alert.alert(
          t('Unable to save'),
          t('This routine has no database ID. Please reload your routines.')
        );
        return false;
      }

     

      const itemKey = `routine-${routine._id}`;

      if (savingItems[itemKey]) return false;

      const nextDone = forceDone ? true : !done[routine._id];

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
        return true;
      } catch (error) {
        if (!silent) Alert.alert(
          t('Could not save routine'),
          t(error.message || 'Please try again.')
        );
        return false;
      } finally {
        setSavingItems((previous) => ({
          ...previous,
          [itemKey]: false,
        }));
      }
    };
const confirm = async (dose, { silent = false } = {}) => {
  const now = new Date();
  const scheduled = getScheduledDate(dose.time, now);

  // Never allow confirmation before the scheduled time.
  if (scheduled && now.getTime() < scheduled.getTime()) {
    if (!silent) Alert.alert(
      t('Too early'),
      `You can confirm this medicine at ${dose.time}.`
    );
    return false;
  }

  if (!dose.itemId) {
    if (!silent) Alert.alert(
      t('Unable to confirm'),
      t('This medicine has no database ID. Please reload your medicines.')
    );
    return false;
  }

  const itemKey = `medicine-${dose.key}`;

  if (savingItems[itemKey]) return false;

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

    if (!silent) Alert.alert(
      t('Saathi'),
      t('Your medicine confirmation was saved.')
    );
    return true;
  } catch (error) {
    if (!silent) Alert.alert(
      t('Could not save confirmation'),
      t(error.message || 'Please try again.')
    );
    return false;
  } finally {
    setSavingItems((previous) => ({
      ...previous,
      [itemKey]: false,
    }));
  }
};

    // ---- voice assistant hooks ----
    const voiceEnvRef = useRef({});
    voiceEnvRef.current = {
      name: currentUser?.name || profile?.name || '',
      routines,
      medicines,
      done,
      taken,
    };

    // Runs what the person asked for by voice. Returns true when it worked.
    const runVoiceAction = async (action) => {
      if (action.type === 'markRoutine') {
        return toggleRoutine(action.routine, { silent: true, forceDone: true });
      }
      if (action.type === 'markDose') {
        return confirm(action.dose, { silent: true });
      }
      if (action.type === 'changeTime') {
        // Saving also re-schedules the notifications (the context re-syncs them).
        if (action.item.kind === 'routine') {
          setRoutines((previous) => applyTimeChange(previous, action));
        } else {
          setMedicines((previous) => applyTimeChange(previous, action));
        }
        return true;
      }
      return false;
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
          <WelcomeModal
            visible={Boolean(currentUser) && dataLoaded && !welcomeShown}
            onClose={() => setWelcomeShown(true)}
            data={
              dataLoaded && !welcomeShown
                ? buildWelcome({
                    name: profile?.name || currentUser?.name,
                    routines,
                    medicines,
                    done,
                    taken,
                    profileLanguage: profile?.language,
                    appLanguage: language,
                    now: currentTime,
                  })
                : null
            }
          />
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
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

              <LanguagePicker />
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

            {/* Chat with Saathi */}
            <PrimaryButton
              title={t('Talk to Saathi')}
              color={C.teal}
              onPress={() => navigation.navigate('Chat')}
              style={{ marginBottom: 14 }}
            />

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

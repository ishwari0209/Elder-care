import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import PrimaryButton from '../components/PrimaryButton';
import { C, card } from '../theme';
import * as API from '../api';
import { useSaathi } from '../context/SaathiContext';

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CaregiverScreen({ navigation }) {
  const { t } = useSaathi();
  const [code, setCode] = useState('');
  const [invite, setInvite] = useState('');
  const [elders, setElders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [caregivers, setCaregivers] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadElders = useCallback(async () => {
    try {
      setError('');
      const result = await API.getLinkedElders();
      setElders(result.elders || []);
      const caregiverResult = await API.getLinkedCaregivers();
setCaregivers(caregiverResult.caregivers || []);
      if (selected) {
        const linked = (result.elders || []).find((e) => e.elderId === selected.elderId);
        if (linked) {
          setStatus(await API.getLinkedElderStatus(linked.elderId, localDate()));
          setSelected(linked);
        } else {
          setSelected(null);
          setStatus(null);
        }
      }
    } catch (e) {
      setError(t(e.message || 'Could not load caregiver data.'));
    }
  }, [selected?.elderId]);

  useFocusEffect(useCallback(() => { loadElders(); }, [loadElders]));

  const run = async (fn) => {
    try { setLoading(true); setError(''); await fn(); }
    catch (e) { setError(t(e.message || 'Something went wrong.')); }
    finally { setLoading(false); }
  };

  const createInvite = () => run(async () => {
    const result = await API.createCaregiverInvite();
    setInvite(result.code);
    Alert.alert(t('Invitation created'), t('Share this code privately with your trusted caregiver. It expires in 24 hours.'));
  });

  const acceptInvite = () => run(async () => {
    const result = await API.acceptCaregiverInvite(code);
    setCode('');
    Alert.alert(t('Linked successfully'), result.message ? t(result.message) : t('Caregiver access is active.'));
    await loadElders();
  });

  const openElder = (elder) => run(async () => {
    const care = await API.getLinkedElderStatus(elder.elderId, localDate());
    setSelected(elder);
    setStatus(care);
  });

  const completionMap = new Map((status?.completions || []).map((item) => [
    `${item.itemType}|${String(item.itemId)}|${item.time || ''}`, item.reportedDone,
  ]));
  const routinesDone = (status?.routines || []).filter((r) =>
    completionMap.get(`routine|${String(r._id)}|${r.time || ''}`) === true
  ).length;
  const doses = (status?.medicines || []).flatMap((m) =>
    String(m.times || '').split(',').map((t) => t.trim()).filter(Boolean).map((time) => ({ key: `${m._id}|${time}`, medicine: m, time }))
  );
  const dosesDone = doses.filter((d) => completionMap.get(`medicine|${String(d.medicine._id)}|${d.time}`) === true).length;

  return (
    <Screen title={t("Family Care")} subtitle={t("Only linked caregivers can view an elder's care information.")} onBack={() => navigation.goBack()}>
      {!!error && <Text style={{ color: C.red, marginBottom: 12 }}>{t(error)}</Text>}
      {loading && <ActivityIndicator color={C.teal} style={{ marginBottom: 12 }} />}

      <View style={card}>
        <Text style={{ color: C.navy, fontSize: 20, fontWeight: '800' }}>{t('Accept an invitation')}</Text>
        <Text style={{ color: C.grey, marginTop: 6, lineHeight: 21 }}>{t('Use a separate caregiver Saathi account. The elderly user must first generate a code from their account.')}</Text>
        <TextInput value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 8))} placeholder={t("8-digit invitation code")} keyboardType="number-pad" maxLength={8} style={{ borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 13, marginTop: 12, fontSize: 18, color: C.navy, letterSpacing: 2 }} />
        <PrimaryButton title={t("Accept invitation")} color={C.teal} onPress={acceptInvite} style={{ marginTop: 10 }} />
      </View>

      {!!invite && <View style={[card, { borderWidth: 1, borderColor: C.teal }]}>
        <Text style={{ color: C.navy, fontSize: 18, fontWeight: '800' }}>{t('One-time invite code')}</Text>
        <Text selectable style={{ color: C.teal, fontSize: 30, fontWeight: '900', letterSpacing: 4, marginVertical: 10 }}>{invite}</Text>
        <Text style={{ color: C.grey }}>{t('Share privately with your trusted caregiver. Expires in 24 hours.')}</Text>
      </View>}

      <View style={card}>
        <Text style={{ color: C.navy, fontSize: 20, fontWeight: '800' }}>{t('Invite your caregiver')}</Text>
        <Text style={{ color: C.grey, marginTop: 6, lineHeight: 21 }}>{t('Use this while signed in as the elderly user. The family member accepts the code from their own account.')}</Text>
        <PrimaryButton title={t("Generate one-time code")} color={C.navy} onPress={createInvite} style={{ marginTop: 12 }} />
      </View>
        
<View style={card}>
  <Text style={{
    color: C.navy,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  }}>
    {t('Linked caregivers')}
  </Text>

  {caregivers.length === 0 ? (
    <Text style={{ color: C.grey }}>
      No caregivers linked to your profile yet.
    </Text>
  ) : (
    caregivers.map((caregiver) => (
      <View
        key={caregiver.caregiverId}
        style={{
          paddingVertical: 12,
          borderTopWidth: 1,
          borderColor: C.line,
        }}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <Ionicons
            name="person-circle"
            size={34}
            color={C.teal}
          />

          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{
              color: C.navy,
              fontWeight: '800',
              fontSize: 16,
            }}>
              {caregiver.name}
            </Text>

            {!!caregiver.email && (
              <Text style={{ color: C.grey }}>
                {caregiver.email}
              </Text>
            )}

            <Text style={{ color: C.grey, fontSize: 12 }}>
              {t('Access to your care information')}
            </Text>
          </View>
        </View>

        <PrimaryButton
          title={t("Remove caregiver access")}
          color={C.red}
          onPress={() => {
            Alert.alert(
              t('Remove caregiver?'),
              `${t('Remove caregiver?')} ${caregiver.name} — ${t('Access to your care information')}?`,
              [
                { text: t('Cancel'), style: 'cancel' },
                {
                  text: t('Remove access'),
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      setLoading(true);
                      await API.revokeCaregiverAccess(
                        caregiver.caregiverId
                      );
                      setCaregivers((previous) =>
                        previous.filter(
                          (item) =>
                            item.caregiverId !== caregiver.caregiverId
                        )
                      );
                      Alert.alert(
                        t('Access removed'),
                        t('The caregiver can no longer access your linked care profile.')
                      );
                    } catch (e) {
                      setError(t(e.message || 'Could not remove access.'));
                    } finally {
                      setLoading(false);
                    }
                  },
                },
              ]
            );
          }}
          style={{ marginTop: 10 }}
        />
      </View>
    ))
  )}
</View>

      <View style={card}>
        <Text style={{ color: C.navy, fontSize: 20, fontWeight: '800', marginBottom: 8 }}>{t('Linked care profiles')}</Text>
                {!elders.length ? (
          <Text style={{ color: C.grey }}>
            {t("No linked profiles yet. Accept an invitation from an elderly user's account first.")}
          </Text>
        ) : (
          elders.map((elder) => (
            <TouchableOpacity
              key={elder.elderId}
              onPress={() => openElder(elder)}
              style={{
                paddingVertical: 12,
                borderTopWidth: 1,
                borderColor: C.line,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Ionicons name="person-circle" size={34} color={C.teal} />

              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: C.navy, fontWeight: '800', fontSize: 17 }}>
                  {elder.name}
                </Text>

                <Text style={{ color: C.grey }}>
                  {elder.age ? `${t('Age')} ${elder.age} · ` : ''}
                  {elder.language || t('Saathi profile')}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={22} color={C.grey} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {selected && status && <View style={card}>
        <Text style={{ color: C.navy, fontSize: 22, fontWeight: '900' }}>{selected.name} · {t('daily care')}</Text>
        <Text style={{ color: C.grey, marginTop: 4 }}>{t('Date:')} {status.date}</Text>
        <View style={{ flexDirection: 'row', marginTop: 14 }}>
          <View style={{ flex: 1, backgroundColor: C.mint, borderRadius: 12, padding: 12, marginRight: 8 }}>
            <Text style={{ color: C.grey }}>{t('Routines')}</Text><Text style={{ color: C.navy, fontSize: 23, fontWeight: '900' }}>{routinesDone}/{status.routines.length}</Text><Text style={{ color: C.grey, fontSize: 12 }}>{t('reported complete')}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: C.mint, borderRadius: 12, padding: 12 }}>
            <Text style={{ color: C.grey }}>{t('Medicine doses')}</Text><Text style={{ color: C.navy, fontSize: 23, fontWeight: '900' }}>{dosesDone}/{doses.length}</Text><Text style={{ color: C.grey, fontSize: 12 }}>{t('reported taken')}</Text>
          </View>
        </View>
        <Text style={{ color: C.navy, fontSize: 18, fontWeight: '800', marginTop: 18 }}>{t("Today's routines")}</Text>
        {!status.routines.length ? <Text style={{ color: C.grey, marginTop: 6 }}>{t('No routines configured.')}</Text> : status.routines.map((r) => {
          const done = completionMap.get(`routine|${String(r._id)}|${r.time || ''}`) === true;
          return <View key={r._id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: C.line }}>
            <Ionicons name={done ? 'checkmark-circle' : 'time-outline'} size={24} color={done ? C.green : C.grey} />
            <View style={{ marginLeft: 9, flex: 1 }}><Text style={{ color: C.navy, fontWeight: '700' }}>{r.name}</Text><Text style={{ color: C.grey }}>{r.time} · {done ? t('Reported complete') : t('No completion recorded')}</Text></View>
          </View>;
        })}
        <Text style={{ color: C.navy, fontSize: 18, fontWeight: '800', marginTop: 18 }}>{t('Medicines')}</Text>
        {!doses.length ? <Text style={{ color: C.grey, marginTop: 6 }}>{t('No medicines configured.')}</Text> : doses.map((dose) => {
          const done = completionMap.get(`medicine|${String(dose.medicine._id)}|${dose.time}`) === true;
          return <View key={dose.key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: C.line }}>
            <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={done ? C.green : C.grey} />
            <View style={{ marginLeft: 9, flex: 1 }}><Text style={{ color: C.navy, fontWeight: '700' }}>{dose.medicine.name} · {dose.time}</Text><Text style={{ color: C.grey }}>{dose.medicine.dosage} · {done ? t('User reported taken') : t('No confirmation recorded')}</Text></View>
          </View>;
        })}
        <Text style={{ color: C.navy, fontSize: 18, fontWeight: '800', marginTop: 18 }}>{t('Emergency contacts')}</Text>
        {status.emergencyContacts ? <View>
          <Text style={{ color: C.text, marginTop: 8 }}>{status.emergencyContacts.name}{status.emergencyContacts.relation ? ` (${status.emergencyContacts.relation})` : ''}</Text>
          <Text style={{ color: C.grey }}>{status.emergencyContacts.phone}</Text>
          {!!status.emergencyContacts.name2 && <Text style={{ color: C.text, marginTop: 8 }}>{status.emergencyContacts.name2}: {status.emergencyContacts.phone2}</Text>}
          {!!status.emergencyContacts.doctor && <Text style={{ color: C.text, marginTop: 8 }}>{t('Doctor:')} {status.emergencyContacts.doctor} {status.emergencyContacts.doctorPhone}</Text>}
        </View> : <Text style={{ color: C.grey, marginTop: 6 }}>{t('No emergency contacts saved.')}</Text>}
        <Text style={{ color: C.grey, fontSize: 12, lineHeight: 17, marginTop: 14 }}>{t(status.notice || '')}</Text>
        <PrimaryButton title={t("Close care details")} color={C.navy} onPress={() => { setSelected(null); setStatus(null); }} style={{ marginTop: 14 }} />
      </View>}
    </Screen>
  );
}

import React, { useState } from 'react';
import { View, Text, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import Screen from '../components/Screen';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import { C, card } from '../theme';
import { useSaathi } from '../context/SaathiContext';
import { parsePrescriptionText } from '../api';
import { pickPrescriptionImage, readTextFromImage } from '../prescription/ocr';
import { redactLines } from '../prescription/redact';
import { parseLocally, fromAI, toFormItem } from '../prescription/localParser';

// Flow: pick photo -> read ON PHONE -> show the only text that may be sent ->
// user chooses "Improve with AI" or "Phone only" -> review & edit -> add.
export default function PrescriptionScanScreen({ navigation }) {
  const { t, medicines, setMedicines, profile } = useSaathi();
  const [stage, setStage] = useState('pick'); // pick | reading | text | review
  const [busy, setBusy] = useState(false);
  const [uri, setUri] = useState(null);
  const [lines, setLines] = useState([]);
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const start = async (source) => {
    setError(''); setMessage('');
    try {
      const picked = await pickPrescriptionImage(source);
      if (!picked) return;
      setUri(picked);
      setStage('reading');
      const raw = await readTextFromImage(picked);
      const safe = redactLines(raw);
      if (!safe.length) {
        setStage('pick');
        setError(t('No medicines found. Try a clearer, well-lit photo.'));
        return;
      }
      setLines(safe);
      setStage('text');
    } catch (e) {
      setStage('pick');
      setError(e.message === 'CAMERA_DENIED'
        ? t('Camera permission is needed to take a photo.')
        : t('Could not read the photo. Please try again.'));
    }
  };

  const toReview = (parsed) => {
    const list = parsed.map((m) => ({ ...toFormItem(m), include: true }));
    if (!list.length) {
      setError(t('No medicines found. Try a clearer, well-lit photo.'));
      setStage('pick');
      return;
    }
    setItems(list);
    setStage('review');
  };

  const phoneOnly = () => { setMessage(''); toReview(parseLocally(lines)); };

  const withAI = async () => {
    setBusy(true); setError('');
    try {
      const res = await parsePrescriptionText(lines, profile.language);
      const parsed = fromAI(res?.medicines);
      if (!parsed.length) throw new Error('empty');
      setMessage('');
      toReview(parsed);
    } catch (e) {
      setMessage(t('AI could not read it, showing phone reading instead.'));
      toReview(parseLocally(lines));
    } finally {
      setBusy(false);
    }
  };

  const update = (i, key, value) =>
    setItems((prev) => prev.map((it, n) => (n === i ? { ...it, [key]: value } : it)));

  const addSelected = () => {
    const chosen = items.filter((it) => it.include);
    if (!chosen.length) { setError(t('Select at least one medicine.')); return; }
    const bad = chosen.find((it) => !it.name.trim() || !it.dosage.trim() || !it.times.trim());
    if (bad) { setError(t('Name, dosage and time are required for each selected medicine.')); return; }
    setMedicines([...medicines, ...chosen.map(({ include, ...rest }) => rest)]);
    navigation.goBack();
  };

  const note = { fontSize: 15, color: C.grey, marginBottom: 10 };

  return (
    <Screen
      title="Scan prescription"
      subtitle="Take a photo of your prescription. It is read on your phone and the photo is never uploaded."
      onBack={() => navigation.goBack()}
    >
      {!!error && <Text style={{ color: C.red, fontSize: 16, marginBottom: 10 }}>{error}</Text>}

      {stage === 'pick' && (
        <View>
          <PrimaryButton title={t('Take photo')} onPress={() => start('camera')} />
          <PrimaryButton title={t('Choose from gallery')} outline onPress={() => start('library')} />
        </View>
      )}

      {stage === 'reading' && (
        <View style={[card, { alignItems: 'center' }]}>
          <ActivityIndicator color={C.teal} size="large" />
          <Text style={{ marginTop: 10, fontSize: 17, color: C.text }}>{t('Reading prescription...')}</Text>
        </View>
      )}

      {stage === 'text' && (
        <View>
          {!!uri && <Image source={{ uri }} style={{ height: 180, borderRadius: 16, marginBottom: 12 }} resizeMode="cover" />}
          <View style={card}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: C.navy, marginBottom: 6 }}>
              {t('Medicine lines found')}
            </Text>
            <Text style={note}>{t('Names, phone numbers and addresses are removed. Only these lines can be sent to the AI:')}</Text>
            {lines.map((l, i) => (
              <Text key={i} style={{ fontSize: 16, color: C.text, marginBottom: 4 }}>{'\u2022 '}{l}</Text>
            ))}
          </View>
          {busy
            ? <ActivityIndicator color={C.teal} style={{ marginVertical: 14 }} />
            : <>
                <PrimaryButton title={t('Improve with AI')} onPress={withAI} />
                <PrimaryButton title={t('Use phone reading only')} outline onPress={phoneOnly} />
              </>}
          <Text style={note}>{t('The photo always stays on your phone.')}</Text>
        </View>
      )}

      {stage === 'review' && (
        <View>
          {!!message && <Text style={{ color: C.grey, fontSize: 15, marginBottom: 8 }}>{message}</Text>}
          <Text style={{ fontSize: 15, color: C.red, fontWeight: '700', marginBottom: 10 }}>
            {t('Check every medicine against your prescription. Saathi can make mistakes.')}
          </Text>
          {items.map((it, i) => (
            <View key={i} style={[card, { opacity: it.include ? 1 : 0.5 }]}>
              <TouchableOpacity
                onPress={() => update(i, 'include', !it.include)}
                style={{ minHeight: 44, justifyContent: 'center', marginBottom: 6 }}
              >
                <Text style={{ fontSize: 17, fontWeight: '800', color: it.include ? C.teal : C.grey }}>
                  {it.include ? '\u2611 ' : '\u2610 '}{t('Include')}
                </Text>
              </TouchableOpacity>
              <FormField label="Medicine name" required value={it.name} onChange={(v) => update(i, 'name', v)} />
              <FormField label="Dosage as prescribed" required value={it.dosage} onChange={(v) => update(i, 'dosage', v)} />
              <FormField label="Time(s)" type="time" required value={it.times} onChange={(v) => update(i, 'times', v)} />
              <FormField label="Instructions (optional)" type="multiline" value={it.notes} onChange={(v) => update(i, 'notes', v)} />
            </View>
          ))}
          <PrimaryButton title={t('Add selected medicines')} onPress={addSelected} />
          <PrimaryButton title={t('Scan again')} outline onPress={() => { setStage('pick'); setItems([]); setError(''); }} />
        </View>
      )}
    </Screen>
  );
}


import React from 'react';
import Screen from '../components/Screen';
import ListEditor from '../components/ListEditor';
import PrimaryButton from '../components/PrimaryButton';
import { useSaathi, ALL_DAYS } from '../context/SaathiContext';

const fields = [
  { key: 'name', label: 'Medicine name', required: true },
  { key: 'dosage', label: 'Dosage as prescribed', required: true },
 {
  key: 'times',
  label: 'Time(s)',
  type: 'time',
  required: true,
},
{ key: 'start', label: 'Start date', type: 'date' },
{
  key: 'end',
  label: 'End date (optional)',
  type: 'date',
},
 
  { key: 'days', label: 'Repeat days', type: 'days', options: ALL_DAYS },
  { key: 'notes', label: 'Instructions (optional)', type: 'multiline' },
];

export default function MedicineSetupScreen({ navigation, route }) {
  const { medicines, setMedicines, t } = useSaathi();
  const edit = route.params?.edit;

  return (
    <Screen
      step={edit ? '' : 'Step 3 of 5'}
      title="Medicines"
      subtitle="Enter medicines exactly as your doctor prescribed. Saathi never suggests or changes doses."
      onBack={() => navigation.goBack()}
      onNext={edit ? undefined : () => navigation.navigate('Contacts')}
      nextLabel={edit ? undefined : 'Continue'}
    >
      <PrimaryButton
        title={t('Scan prescription')}
        outline
        onPress={() => navigation.navigate('PrescriptionScan')}
      />

      <ListEditor
        fields={fields}
        items={medicines}
        setItems={setMedicines}
        addLabel="Add medicine"
        emptyText="No medicines yet. Tap below to add one."
        blank={{
          name: '',
          dosage: '',
          times: '',
          start: '',
          end: '',
          days: ALL_DAYS,
          notes: '',
        }}
        line={(m) => `${m.dosage} · ${m.times}`}
      />
    </Screen>
  );
}

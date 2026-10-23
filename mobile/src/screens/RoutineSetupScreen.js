
import React from 'react';
import Screen from '../components/Screen';
import ListEditor from '../components/ListEditor';
import { useSaathi, ALL_DAYS } from '../context/SaathiContext';

const fields = [
  { key: 'name', label: 'Activity name', required: true },
  {
    key: 'category',
    label: 'Category',
    type: 'chips',
    options: ['Meal', 'Exercise', 'Appointment', 'Sleep', 'Other'],
  },
  {
    key: 'time',
    label: 'Scheduled time',
    type: 'time',
    required: true,
  },
  {
    key: 'days',
    label: 'Repeat days',
    type: 'days',
    options: ALL_DAYS,
  },
  { key: 'notes', label: 'Notes (optional)', type: 'multiline' },
];

export default function RoutineSetupScreen({ navigation, route }) {
  const { routines = [], setRoutines } = useSaathi();
  const edit = route.params?.edit;

  const safeRoutines = (routines ?? []).map((routine) => ({
    ...routine,
    days: Array.isArray(routine.days) ? routine.days : [...ALL_DAYS],
  }));

  return (
    <Screen
      step={edit ? '' : 'Step 2 of 5'}
      title="Daily Routine"
      subtitle="Add the activities of your day."
      onBack={() => navigation.goBack()}
      onNext={() =>
        edit ? navigation.goBack() : navigation.navigate('Medicine')
      }
      nextLabel={edit ? 'Save' : 'Continue'}
    >
      <ListEditor
        fields={fields}
        items={safeRoutines}
        setItems={setRoutines}
        addLabel="Add activity"
        emptyText="No activities yet. Tap below to add one."
        blank={{
          name: '',
          category: 'Meal',
          time: '',
          days: [...ALL_DAYS],
          notes: '',
        }}
        line={(routine) =>
          `${routine.time || ''} · ${routine.category || ''} · ${
            routine.days.length === 7
              ? 'Every day'
              : routine.days.join(', ')
          }`
        }
      />
    </Screen>
  );
}

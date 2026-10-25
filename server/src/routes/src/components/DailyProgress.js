
import { useSaathi } from '../context/SaathiContext';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DailyProgress({
  total = 0,
  completed = 0,
}) {
  const { t } = useSaathi();
  const percent = total > 0
    ? Math.round((completed / total) * 100)
    : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("Today's progress")}</Text>

      <Text style={styles.count}>
        {completed} {t('of')} {total} {t('tasks completed')}
      </Text>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: 100,
          now: percent,
        }}
      >
        <View
          style={[styles.fill, { width: `${percent}%` }]}
        />
      </View>

      <Text style={styles.percent}>{percent}% {t('complete')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginVertical: 8,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#243447',
  },
  count: {
    fontSize: 14,
    color: '#526273',
    marginBottom: 12,
  },
  track: {
    height: 10,
    backgroundColor: '#E5EAF0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#238B68',
    borderRadius: 8,
  },
  percent: {
    marginTop: 8,
    fontWeight: '600',
    color: '#238B68',
  },
});

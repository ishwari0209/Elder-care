
import { useSaathi } from '../context/SaathiContext';
import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

export default function CompletionHistory({ completions = [] }) {
  const { t } = useSaathi();
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('Completion history')}</Text>

      {completions.length === 0 ? (
        <Text style={styles.empty}>
          {t('No completion records for this day.')}
        </Text>
      ) : (
        <FlatList
          data={completions}
          scrollEnabled={false}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.details}>
                <Text style={styles.name}>
                  {item.itemType === 'medicine' ? t('Medicine') : t('Routine')}
                </Text>
                <Text style={styles.meta}>
                  {item.time || t('Time not recorded')} · {item.date}
                </Text>
                {item.note ? (
                  <Text style={styles.meta}>{item.note}</Text>
                ) : null}
              </View>

              <Text
                style={[
                  styles.status,
                  !item.reportedDone && styles.pending,
                ]}
              >
                {item.reportedDone ? t('Confirmed') : t('Not done')}
              </Text>
            </View>
          )}
        />
      )}
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
    marginBottom: 10,
    color: '#243447',
  },
  empty: {
    color: '#667085',
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D8DEE6',
    gap: 8,
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#243447',
  },
  meta: {
    fontSize: 12,
    color: '#667085',
    marginTop: 3,
  },
  status: {
    color: '#238B68',
    fontWeight: '600',
    fontSize: 12,
  },
  pending: {
    color: '#B45309',
  },
});

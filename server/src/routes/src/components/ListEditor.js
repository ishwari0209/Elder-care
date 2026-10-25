import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import FormField from './FormField';
import PrimaryButton from './PrimaryButton';
import { C, card } from '../theme';
import { useSaathi } from '../context/SaathiContext';
import { availableDays, reconcileDays } from '../utlis/dateDays';

export default function ListEditor({
  fields = [],
  items: incomingItems = [],
  setItems,
  blank = {},
  line = () => '',
  emptyText = '',
  addLabel = 'Add item',
}) {
  const items = Array.isArray(incomingItems) ? incomingItems : [];
  const safeFields = Array.isArray(fields) ? fields : [];

  const { t } = useSaathi();
  const [draft, setDraft] = useState(null);
  const [idx, setIdx] = useState(-1);
  const [err, setErr] = useState('');

  const updateField = (key, value) => {
    setDraft((previous) => {
      const next = { ...previous, [key]: value };
      // When start/end change, keep "Repeat days" inside the chosen range.
      if ((key === 'start' || key === 'end') && 'days' in previous) {
        next.days = reconcileDays(
          previous.days, previous.start, previous.end, next.start, next.end
        );
      }
      return next;
    });
    setErr('');
  };

  const cancel = () => {
    setDraft(null);
    setIdx(-1);
    setErr('');
  };

  const save = () => {
    if (!draft || typeof setItems !== 'function') {
      setErr('Unable to save. Please try again.');
      return;
    }

    const missing = safeFields.find(
      (field) =>
        field.required &&
        !String(draft[field.key] ?? '').trim()
    );

    if (missing) {
      setErr(`${missing.label} is required`);
      return;
    }

    if (
      'days' in draft && 'start' in draft &&
      draft.start && draft.end && draft.end < draft.start
    ) {
      setErr('End date must be on or after the start date');
      return;
    }
    if ('days' in draft && 'start' in draft && !(draft.days || []).length) {
      setErr('Select at least one repeat day');
      return;
    }

    const updatedItems =
      idx < 0
        ? [...items, draft]
        : items.map((item, index) =>
            index === idx ? draft : item
          );

    setItems(updatedItems);
    cancel();
  };

  if (draft !== null) {
    return (
      <View style={card}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: '800',
            color: C.navy,
            marginBottom: 12,
          }}
        >
          {idx < 0 ? t(addLabel) : t('Edit')}
        </Text>

        {safeFields.map((field, index) => {
          const { key: fieldKey, ...fieldProps } = field;

          return (
            <FormField
              key={fieldKey ?? index}
              {...fieldProps}
              {...(field.type === 'days' && 'start' in draft
                ? { options: availableDays(draft.start, draft.end) }
                : {})}
              type={field.type || 'text'}
              value={draft[fieldKey] ?? ''}
              onChange={(value) => updateField(fieldKey, value)}
            />
          );
        })}

        {!!err && (
          <Text
            style={{
              color: C.red,
              marginBottom: 8,
              fontSize: 16,
            }}
          >
            {err}
          </Text>
        )}

        <PrimaryButton title={t('Save')} onPress={save} />

        <PrimaryButton
          title={t('Cancel')}
          outline
          onPress={cancel}
        />
      </View>
    );
  }

  return (
    <View>
      {items.length === 0 && (
        <View style={card}>
          <Text
            style={{
              fontSize: 16,
              color: C.grey,
              textAlign: 'center',
            }}
          >
            {emptyText}
          </Text>
        </View>
      )}

      {items.map((item, index) => (
        <View key={item?._id ?? index} style={card}>
          <Text
            style={{
              fontSize: 19,
              fontWeight: '800',
              color: C.navy,
            }}
          >
            {item?.name || 'Untitled'}
          </Text>

          <Text
            style={{
              fontSize: 16,
              color: C.grey,
              marginVertical: 4,
            }}
          >
            {line(item)}
          </Text>

          <View style={{ flexDirection: 'row', marginTop: 6 }}>
            <TouchableOpacity
              onPress={() => {
                setDraft({ ...item });
                setIdx(index);
                setErr('');
              }}
              style={{
                marginRight: 24,
                minHeight: 44,
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: C.teal,
                  fontWeight: '700',
                  fontSize: 17,
                }}
              >
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (typeof setItems === 'function') {
                  setItems(items.filter((_, i) => i !== index));
                }
              }}
              style={{
                minHeight: 44,
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: C.red,
                  fontWeight: '700',
                  fontSize: 17,
                }}
              >
                Remove
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <PrimaryButton
        title={`+ ${t(addLabel)}`}
        color={C.teal}
        onPress={() => {
          setDraft({ ...blank });
          setIdx(-1);
          setErr('');
        }}
      />
    </View>
  );
}
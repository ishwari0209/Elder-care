
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import FormField from './FormField';
import PrimaryButton from './PrimaryButton';
import { C, card } from '../theme';
import { useSaathi } from '../context/SaathiContext';

export default function ListEditor({
  fields,
  items,
  setItems,
  blank,
  line,
  emptyText,
  addLabel,
}) {
  const { t } = useSaathi();
  const [draft, setDraft] = useState(null);
  const [idx, setIdx] = useState(-1);
  const [err, setErr] = useState('');

  const save = () => {
    const missing = fields.find(
      (field) =>
        field.required &&
        !String(draft[field.key] ?? '').trim()
    );

    if (missing) {
      setErr(`${missing.label} is required`);
      return;
    }

    setItems(
      idx < 0
        ? [...items, draft]
        : items.map((item, index) =>
            index === idx ? draft : item
          )
    );

    setDraft(null);
    setIdx(-1);
    setErr('');
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

        
{fields.map((field, index) => {
  const { key: fieldKey, ...fieldProps } = field;

  return (
    <FormField
      key={fieldKey ?? index}
      {...fieldProps}
      value={draft[fieldKey] ?? ''}
      onChange={(value) => {
        setDraft((previous) => ({
          ...previous,
          [fieldKey]: value,
        }));
        setErr('');
      }}
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

        <PrimaryButton title={t("Save")} onPress={save} />

        <PrimaryButton
          title={t("Cancel")}
          outline
          onPress={() => {
            setDraft(null);
            setIdx(-1);
            setErr('');
          }}
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
        <View key={item._id ?? index} style={card}>
          <Text
            style={{
              fontSize: 19,
              fontWeight: '800',
              color: C.navy,
            }}
          >
            {item.name}
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
              onPress={() =>
                setItems(items.filter((_, i) => i !== index))
              }
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

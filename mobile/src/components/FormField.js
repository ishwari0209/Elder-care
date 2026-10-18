
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { C } from '../theme';

const Chip = ({ label, on, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      paddingHorizontal: 14,
      borderRadius: 22,
      marginRight: 8,
      marginBottom: 8,
      backgroundColor: on ? C.navy : C.mint,
      minHeight: 44,
      justifyContent: 'center',
    }}
  >
    <Text
      style={{
        color: on ? '#fff' : C.navy,
        fontWeight: '600',
        fontSize: 16,
      }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const pad = (number) => String(number).padStart(2, '0');

const parseDate = (value) => {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
};

const formatDate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseTime = (value) => {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);

  if (!match) {
    const now = new Date();
    now.setSeconds(0, 0);
    return now;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const ampm = match[3]?.toUpperCase();

  if (hour > 23 || minute > 59 || hour < 0) return new Date();

  if (ampm) {
    if (hour < 1 || hour > 12) return new Date();
    hour = hour % 12 + (ampm === 'PM' ? 12 : 0);
  }

  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
};

const formatTime = (date) => {
  const hour = date.getHours();
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${pad(date.getMinutes())} ${suffix}`;
};

export default function FormField({
  label,
  value,
  onChange,
  type = 'text',
  options = [],
  error,
  required,
  ...rest
}) {
  const [picker, setPicker] = useState(null);
  const [selectedTime, setSelectedTime] = useState(new Date());

  const toggle = (option) => {
    const currentValue = Array.isArray(value) ? value : [];
    onChange?.(
      currentValue.includes(option)
        ? currentValue.filter((item) => item !== option)
        : [...currentValue, option]
    );
  };

  const openTimePicker = () => {
    setSelectedTime(parseTime(''));
    setPicker('time');
  };

  const openDatePicker = () => setPicker('date');

 
const handlePickerChange = (event, selected) => {
  if (Platform.OS === 'android') {
    setPicker(null);
  }

  if (event.type === 'dismissed' || !selected) return;

  if (picker === 'time') {
    const newTime = formatTime(selected);
    const current = String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    // Replace the most recently added time if editing it;
    // otherwise add a new time.
    if (current.length > 0) {
      current[current.length - 1] = newTime;
    } else {
      current.push(newTime);
    }

    onChange?.([...new Set(current)].join(', '));
  } else if (picker === 'date') {
    onChange?.(formatDate(selected));
  }
};


  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          fontSize: 16,
          fontWeight: '700',
          color: C.text,
          marginBottom: 6,
        }}
      >
        {label}{required ? ' *' : ''}
      </Text>

      {type === 'chips' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {options.map((option) => (
            <Chip
              key={option}
              label={option}
              on={value === option}
              onPress={() => onChange?.(option)}
            />
          ))}
        </View>
      )}

      {type === 'days' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {options.map((option) => (
            <Chip
              key={option}
              label={option}
              on={(Array.isArray(value) ? value : []).includes(option)}
              onPress={() => toggle(option)}
            />
          ))}
        </View>
      )}

      {type === 'time' && (
        <View>
          <TouchableOpacity
            onPress={openTimePicker}
            style={{
              backgroundColor: '#fff',
              borderWidth: 1.5,
              borderColor: C.line,
              borderRadius: 14,
              padding: 14,
              minHeight: 56,
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 18, color: value ? C.text : C.grey }}>
              {value || 'Tap to select time'}
            </Text>
          </TouchableOpacity>

          {!!value && (
            <TouchableOpacity
              onPress={() => {
                const times = String(value)
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean);
                onChange?.(times.slice(0, -1).join(', '));
              }}
              style={{ paddingVertical: 8, alignSelf: 'flex-start' }}
            >
              <Text style={{ color: C.red, fontWeight: '600' }}>
                Remove last time
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {type === 'date' && (
        <TouchableOpacity
          onPress={openDatePicker}
          style={{
            backgroundColor: '#fff',
            borderWidth: 1.5,
            borderColor: C.line,
            borderRadius: 14,
            padding: 14,
            minHeight: 56,
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 18, color: value ? C.text : C.grey }}>
            {value || 'Select date'}
          </Text>
        </TouchableOpacity>
      )}

      {(type === 'text' || type === 'multiline') && (
        <TextInput
          {...rest}
          value={value == null ? '' : String(value)}
          onChangeText={onChange}
          placeholderTextColor={C.grey}
          multiline={type === 'multiline'}
          accessibilityLabel={label}
          style={{
            backgroundColor: '#fff',
            borderWidth: 1.5,
            borderColor: error ? C.red : C.line,
            borderRadius: 14,
            padding: 14,
            fontSize: 18,
            minHeight: type === 'multiline' ? 90 : 56,
            color: C.text,
          }}
        />
      )}

      {picker && (
        <DateTimePicker
  value={picker === 'time' ? selectedTime : parseDate(value)}
  mode={picker}
  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
  is24Hour={false}
  onValueChange={(event) => handlePickerChange(event, event?.nativeEvent?.timestamp
    ? new Date(event.nativeEvent.timestamp)
    : undefined)}
/>
      )}

      {!!error && (
        <Text style={{ color: C.red, marginTop: 4, fontSize: 15 }}>
          {error}
        </Text>
      )}
    </View>
  );
}

import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { C } from '../theme';
import { useSaathi } from '../context/SaathiContext';
export default function PrimaryButton({ title, onPress, color=C.navy, outline=false, style }) {
  const { t } = useSaathi();
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} activeOpacity={0.8}
      style={[{ minHeight:56, borderRadius:16, alignItems:'center', justifyContent:'center', paddingHorizontal:20, marginVertical:6,
        backgroundColor: outline ? 'transparent' : color, borderWidth: outline?2:0, borderColor:color }, style]}>
      <Text style={{ fontSize:18, fontWeight:'700', color: outline ? color : '#fff' }} >{t(title)}</Text>
    </TouchableOpacity>
  );
}

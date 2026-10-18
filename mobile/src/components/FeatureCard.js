import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, card } from '../theme';
export default function FeatureCard({ icon, title, text }) {
  return (
    <View style={[card, { width:'48%' }]}>
      <View style={{ backgroundColor:C.mint, padding:10, borderRadius:14, marginBottom:8, alignSelf:'flex-start' }}><Ionicons name={icon} size={28} color={C.teal} /></View>
      <Text style={{ fontSize:17, fontWeight:'800', color:C.navy }}>{title}</Text>
      <Text style={{ fontSize:14, color:C.grey, marginTop:4 }}>{text}</Text>
    </View>
  );
}

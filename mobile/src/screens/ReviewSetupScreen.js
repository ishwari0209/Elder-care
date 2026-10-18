import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Screen from '../components/Screen';
import { useSaathi } from '../context/SaathiContext';
import { C, card } from '../theme';
const Row = ({ t }) => <Text style={{ fontSize:16, color:C.text, marginBottom:4 }}>{t}</Text>;
const Section = ({ title, onEdit, children }) => (
  <View style={card}>
    <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
      <Text style={{ fontSize:20, fontWeight:'800', color:C.navy }}>{title}</Text>
      <TouchableOpacity onPress={onEdit} style={{ minHeight:44, justifyContent:'center' }}><Text style={{ color:C.teal, fontWeight:'700', fontSize:17 }}>Edit</Text></TouchableOpacity>
    </View>{children}
  </View>
);
export default function ReviewSetupScreen({ navigation }) {
  const { profile:p, routines, medicines, contacts:c } = useSaathi();
  const go = s => navigation.navigate(s, { edit:true });
  return (
    <Screen step="Step 5 of 5" title="Review Setup" subtitle="Check everything before you finish." onBack={() => navigation.goBack()} onNext={() => navigation.reset({ index:0, routes:[{ name:'Dashboard' }] })} nextLabel="Finish Setup">
      <Section title="Profile" onEdit={() => go('Profile')}>
        <Row t={`${p.name || '-'} · ${p.age || '-'} · ${p.language}`} /><Row t={`Phone: ${p.phone || '-'}`} />
        {!!p.conditions && <Row t={`Conditions: ${p.conditions}`} />}{!!p.allergies && <Row t={`Allergies: ${p.allergies}`} />}
      </Section>
      <Section title={`Daily routine (${routines.length})`} onEdit={() => go('Routine')}>
        {routines.length ? routines.map((r,i) => <Row key={i} t={`${r.time}  ${r.name}`} />) : <Row t="None added" />}
      </Section>
      <Section title={`Medicines (${medicines.length})`} onEdit={() => go('Medicine')}>
        {medicines.length ? medicines.map((m,i) => <Row key={i} t={`${m.name} · ${m.dosage} · ${m.times}`} />) : <Row t="None added" />}
      </Section>
      <Section title="Emergency contacts" onEdit={() => go('Contacts')}>
        <Row t={`${c.name || '-'} (${c.relation || '-'}) ${c.phone}`} />{!!c.name2 && <Row t={`${c.name2} ${c.phone2}`} />}
      </Section>
    </Screen>
  );
}

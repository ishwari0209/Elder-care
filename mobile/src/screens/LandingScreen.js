import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import FeatureCard from '../components/FeatureCard';
import { C, card } from '../theme';
const F = [['medkit','Medicine reminders','Keep track of scheduled medicines'],['calendar','Daily routines','Meals, walks and appointments'],['mic','Voice assistance','Simple, accessible interaction'],['alert-circle','Emergency help','Quick access to emergency contacts'],['heart','Health profile','Important care details in one place'],['people','Family connection','Help loved ones stay informed']];
const S = ['Create your personal profile','Add routines, medicines and emergency contacts','Confirm completed activities in your dashboard','Review daily progress at a glance'];
export default function LandingScreen({ navigation }) {
  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom:30 }}>
        <View style={{ backgroundColor:C.card, paddingHorizontal:18, paddingVertical:12, flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderBottomWidth:1, borderColor:C.line }}>
          <TouchableOpacity onPress={() => navigation.navigate('Landing')} style={{ flexDirection:'row', alignItems:'center' }}>
            <Ionicons name="heart-circle" size={34} color={C.teal} />
            <Text style={{ fontSize:24, fontWeight:'900', color:C.navy, marginLeft:7 }}>Saathi</Text>
          </TouchableOpacity>
          <View style={{ flexDirection:'row', alignItems:'center' }}>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ paddingVertical:10, paddingHorizontal:10 }}><Text style={{ color:C.teal, fontSize:15, fontWeight:'800' }}>Login</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={{ backgroundColor:C.teal, borderRadius:12, paddingVertical:10, paddingHorizontal:12 }}><Text style={{ color:'#fff', fontSize:15, fontWeight:'800' }}>Sign Up</Text></TouchableOpacity>
          </View>
        </View>
        <View style={{ backgroundColor:C.navy, padding:28, paddingTop:34, borderBottomLeftRadius:32, borderBottomRightRadius:32 }}>
          <Ionicons name="shield-checkmark" size={48} color="#7FD6D9" />
          <Text style={{ fontSize:42, fontWeight:'900', color:'#fff', marginTop:8 }}>Saathi</Text>
          <Text style={{ fontSize:20, color:'#BFE6E2', marginTop:4 }}>Your AI Companion for Safer, Independent Living.</Text>
          <Text style={{ fontSize:16, color:'#fff', marginTop:12, lineHeight:23 }}>A caring companion for daily routines, medicine schedules and staying connected with family.</Text>
          <PrimaryButton title="Get Started" color={C.teal} onPress={() => navigation.navigate('Signup')} style={{ marginTop:20 }} />
          <Text style={{ color:'#D8EBF2', fontSize:13, textAlign:'center', marginTop:4 }}>Already have an account? Use Login in the top bar.</Text>
        </View>
        <View style={{ padding:20 }}>
          <Text style={{ fontSize:24, fontWeight:'800', color:C.navy, marginBottom:12 }}>What Saathi does</Text>
          <View style={{ flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between' }}>{F.map(([i,t,x]) => <FeatureCard key={t} icon={i} title={t} text={x} />)}</View>
          <Text style={{ fontSize:24, fontWeight:'800', color:C.navy, marginVertical:12 }}>How it works</Text>
          {S.map((s,i) => <View key={i} style={[card, { flexDirection:'row', alignItems:'center' }]}><View style={{ width:36, height:36, borderRadius:18, backgroundColor:C.teal, alignItems:'center', justifyContent:'center', marginRight:12 }}><Text style={{ color:'#fff', fontWeight:'800', fontSize:18 }}>{i+1}</Text></View><Text style={{ flex:1, fontSize:17, color:C.text }}>{s}</Text></View>)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Alert, Platform, AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as API from '../api';
import '../utlis/notificationHandler';
import { syncRoutineReminders, clearRoutineReminders } from '../utlis/routineReminders';
import { syncMedicineReminders } from '../utlis/medicineReminders';
import { translate, loadLanguage, subscribe, languageName } from '../i18n/aiTranslator';
const Ctx = createContext(null);
export const useSaathi = () => useContext(Ctx);
export const ALL_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export function SaathiProvider({ children }) {
  const [currentUser, setCurrentUserState] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [language, setLanguageState] = useState('en');
  const [languageChosen, setLanguageChosen] = useState(false);
  const [i18nVersion, setI18nVersion] = useState(0);
  useEffect(() => subscribe(() => setI18nVersion((v) => v + 1)), []);
  useEffect(() => { loadLanguage(language); }, [language]);
  // t() returns English immediately, then re-renders with the AI translation once it arrives.
  const t = useCallback((key) => translate(key, language), [language, i18nVersion]);
  const setLanguage = useCallback(async (next) => {
    const value = typeof next === 'string' && /^[a-z]{2,3}(-[A-Za-z]+)?$/.test(next) ? next : 'en';
    setLanguageState(value);
    setLanguageChosen(true);
    try { if (Platform.OS === 'web') localStorage.setItem('saathi_language', value); else await SecureStore.setItemAsync('saathi_language', value); } catch {}
  }, []);
  const [profile, setProfileState] = useState(emptyProfile);
  const [routines, setRoutinesState] = useState([]);
  const [medicines, setMedicinesState] = useState([]);
  const [contacts, setContactsState] = useState(emptyContacts);
  const [welcomeShown, setWelcomeShown] = useState(false);
  const [done, setDone] = useState({});
  const [taken, setTaken] = useState({});
  const [dataLoaded, setDataLoaded] = useState(false);
  
  const loadUserData = useCallback(async () => {
    try {
      const [p, r, m, c] = await Promise.all([API.getProfile(), API.getRoutines(), API.getMedicines(), API.getContacts()]);
      if (p && p.name) setProfileState({ ...emptyProfile, ...p, age: String(p.age || '') }); else setProfileState(emptyProfile);
      setRoutinesState(Array.isArray(r) ? r : []);
      setMedicinesState(Array.isArray(m) ? m : []);
      setContactsState(c && c.name ? { ...emptyContacts, ...c } : emptyContacts);
      const now = new Date();
      const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
      const completions = await API.getCompletions(date);
      const routineDone = {}, medicineTaken = {};
      completions.forEach((item) => {
        const itemId = String(item.itemId), itemTime = item.time || '';
        if (item.itemType === 'routine') routineDone[itemId] = item.reportedDone;
        if (item.itemType === 'medicine') {
          const medicine = m.find((med) => String(med._id) === itemId);
          if (medicine) medicineTaken[`${medicine._id}|${medicine.name}|${itemTime}`] = item.reportedDone ? (itemTime || 'done') : '';
        }
      });
      setDone(routineDone); setTaken(medicineTaken);
    } catch (error) { Alert.alert('Saathi', error.message || 'Could not load your saved data.'); }
    finally { setDataLoaded(true); }
  }, []);
  const setCurrentUser = useCallback((user) => setCurrentUserState(user), []);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const savedLanguage = Platform.OS === 'web' ? localStorage.getItem('saathi_language') : await SecureStore.getItemAsync('saathi_language');
        if (active && savedLanguage) { setLanguageState(savedLanguage); setLanguageChosen(true); }
        const token = await API.getAuthToken();
        if (!token) return;
        const user = await API.getCareStatus();
        if (active) setCurrentUserState({ name: user.profile?.name || 'Saathi user', email: '' });
      } catch { await API.logout(); } finally { if (active) setAuthLoading(false); }
    })();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (currentUser) loadUserData();
    else { setProfileState(emptyProfile); setRoutinesState([]); setMedicinesState([]); setContactsState(emptyContacts); setDone({}); setTaken({}); setDataLoaded(false); setWelcomeShown(false); }
  }, [currentUser, loadUserData]);
  // Re-schedule "5 minutes before" routine reminders whenever routines change,
  // the profile language changes, or the user logs in / out.
  useEffect(() => {
    if (!currentUser) { clearRoutineReminders(); return undefined; }
    syncRoutineReminders(routines, profile.language, language);

    // Refresh the rolling reminder window whenever the app comes to the foreground.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncRoutineReminders(routines, profile.language, language);
    });
    return () => sub.remove();
  }, [currentUser, routines, profile.language, language]);
  useEffect(() => {
  if (!currentUser) {
    return;
  }

  syncMedicineReminders(medicines, profile.language, language);

  // Refresh the rolling reminder window whenever the app comes to the foreground.
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') syncMedicineReminders(medicines, profile.language, language);
  });
  return () => sub.remove();
}, [currentUser, medicines, profile.language, language]);
  const setProfile = useCallback((next) => setProfileState(prev => typeof next === 'function' ? next(prev) : next), []);
  const setRoutines = useCallback((next) => setRoutinesState(prev => { const value = typeof next === 'function' ? next(prev) : next; API.saveRoutines(value).catch(error => Alert.alert('Save failed', error.message)); return value; }), []);
  const setMedicines = useCallback((next) => setMedicinesState((prev) => { const value = typeof next === 'function' ? next(prev) : next; API.saveMedicines(value, prev).then(saved => { if (Array.isArray(saved)) setMedicinesState(saved); }).catch(error => Alert.alert('Save failed', error.message)); return value; }), []);
  const setContacts = useCallback((next) => setContactsState(prev => typeof next === 'function' ? next(prev) : next), []);
  return <Ctx.Provider value={{ currentUser, setCurrentUser, authLoading, profile, setProfile, routines, setRoutines, medicines, setMedicines, contacts, setContacts, welcomeShown, setWelcomeShown, done, setDone, taken, setTaken, loadUserData, dataLoaded, language, languageLabel: languageName(language), setLanguage, languageChosen, t }}>
    {children}
  </Ctx.Provider>;
}
const emptyProfile = { name:'', age:'', language:'Hindi', phone:'', address:'', conditions:'', allergies:'', doctor:'', doctorPhone:'' };
const emptyContacts = { name:'', relation:'', phone:'', name2:'', phone2:'', doctor:'', doctorPhone:'' };

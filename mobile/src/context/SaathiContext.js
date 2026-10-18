import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as API from '../api';

const Ctx = createContext(null);
export const useSaathi = () => useContext(Ctx);
export const ALL_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const emptyProfile = { name:'', age:'', language:'Hindi', phone:'', address:'', conditions:'', allergies:'', doctor:'', doctorPhone:'' };
const emptyContacts = { name:'', relation:'', phone:'', name2:'', phone2:'', doctor:'', doctorPhone:'' };

export function SaathiProvider({ children }) {
  const [currentUser, setCurrentUserState] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfileState] = useState(emptyProfile);
  const [routines, setRoutinesState] = useState([]);
  const [medicines, setMedicinesState] = useState([]);
  const [contacts, setContactsState] = useState(emptyContacts);
  const [done, setDone] = useState({});
  const [taken, setTaken] = useState({});

  const loadUserData = useCallback(async () => {
    try {
      const [p, r, m, c] = await Promise.all([
        API.getProfile(), API.getRoutines(), API.getMedicines(), API.getContacts()
      ]);
      if (p && p.name) setProfileState({ ...emptyProfile, ...p, age: String(p.age || '') });
      else setProfileState(emptyProfile);
      setRoutinesState(Array.isArray(r) ? r : []);
      setMedicinesState(Array.isArray(m) ? m : []);
      setContactsState(c && c.name ? { ...emptyContacts, ...c } : emptyContacts);
      const date = new Date().toISOString().slice(0, 10);
      const completions = await API.getCompletions(date);
      
const routineDone = {};
const medicineTaken = {};

completions.forEach((item) => {
  const itemId = String(item.itemId);
  const itemTime = item.time || '';

  if (item.itemType === 'routine') {
    routineDone[itemId] = item.reportedDone;
  }

  if (item.itemType === 'medicine') {
    const medicine = m.find(
      (med) => String(med._id) === itemId
    );

    if (medicine) {
      // Must match the key used by DashboardScreen.js
      const key = `${medicine._id}|${medicine.name}|${itemTime}`;

      medicineTaken[key] = item.reportedDone
        ? (itemTime || 'done')
        : '';
    }
  }
});

setDone(routineDone);
setTaken(medicineTaken);

    } catch (error) {
      Alert.alert('Saathi', error.message || 'Could not load your saved data.');
    }
  }, []);

  const setCurrentUser = useCallback((user) => {
    setCurrentUserState(user);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await API.getAuthToken();
        if (!token) return;
        // Validate saved session by requesting a protected endpoint.
        const user = await API.getCareStatus();
        if (active) {
          // The API currently returns care data, not account details.
          // Keep a lightweight session marker; profile will supply display name.
          setCurrentUserState({ name: user.profile?.name || 'Saathi user', email: '' });
        }
      } catch {
        await API.logout();
      } finally {
        if (active) setAuthLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (currentUser) loadUserData();
    else {
      setProfileState(emptyProfile);
      setRoutinesState([]);
      setMedicinesState([]);
      setContactsState(emptyContacts);
      setDone({});
      setTaken({});
    }
  }, [currentUser, loadUserData]);

  const setProfile = useCallback((next) => {
    setProfileState(prev => typeof next === 'function' ? next(prev) : next);
  }, []);

  const setRoutines = useCallback((next) => {
    setRoutinesState(prev => {
      const value = typeof next === 'function' ? next(prev) : next;
      API.saveRoutines(value).catch(error => Alert.alert('Save failed', error.message));
      return value;
    });
  }, []);


const setMedicines = useCallback((next) => {
  setMedicinesState((prev) => {
    const value = typeof next === 'function' ? next(prev) : next;

    API.saveMedicines(value, prev)
      .then((savedMedicines) => {
        if (Array.isArray(savedMedicines)) {
          setMedicinesState(savedMedicines);
        }
      })
      .catch((error) => {
        Alert.alert('Save failed', error.message);
      });

    return value;
  });
}, []);

  const setContacts = useCallback((next) => {
    setContactsState(prev => typeof next === 'function' ? next(prev) : next);
  }, []);

  return (
    <Ctx.Provider value={{
      currentUser, setCurrentUser, authLoading, profile, setProfile,
      routines, setRoutines, medicines, setMedicines, contacts, setContacts,
      done, setDone, taken, setTaken, loadUserData
    }}>
      {children}
    </Ctx.Provider>
  );
}
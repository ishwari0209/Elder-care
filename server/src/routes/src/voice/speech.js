// Text-to-speech helper. Safe to import even if the native module is missing
// (the app keeps working, it just stays silent).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

let Speech = null;
try { Speech = require('expo-speech'); } catch { Speech = null; }

const LANG = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };
const PREF_KEY = 'saathi_voice_enabled';

let enabled = true;
let loaded = false;
let busyListening = false;
let installedLanguages = null;

export const isSpeechAvailable = () => Boolean(Speech);
export const setListeningBusy = (value) => { busyListening = value; };
export const isVoiceEnabled = () => enabled;

export async function loadVoicePreference() {
  if (loaded) return enabled;
  try {
    const raw = Platform.OS === 'web'
      ? localStorage.getItem(PREF_KEY)
      : await SecureStore.getItemAsync(PREF_KEY);
    if (raw === 'off') enabled = false;
  } catch {}
  loaded = true;
  return enabled;
}

export async function setVoiceEnabled(value) {
  enabled = Boolean(value);
  if (!enabled) stopSpeaking();
  try {
    if (Platform.OS === 'web') localStorage.setItem(PREF_KEY, enabled ? 'on' : 'off');
    else await SecureStore.setItemAsync(PREF_KEY, enabled ? 'on' : 'off');
  } catch {}
}

// Marathi voices are missing on some phones; fall back to Hindi (same script).
async function pickLanguage(code) {
  const wanted = LANG[code] || 'en-IN';
  try {
    if (!installedLanguages) {
      const voices = await Speech.getAvailableVoicesAsync();
      installedLanguages = voices.map((v) => String(v.language || '').toLowerCase().replace('_', '-'));
    }
    const has = (prefix) => installedLanguages.some((l) => l.startsWith(prefix));
    if (has(wanted.slice(0, 2))) return wanted;
    if (code === 'mr' && has('hi')) return 'hi-IN';
  } catch {}
  return wanted;
}

export function stopSpeaking() {
  try { Speech?.stop(); } catch {}
}

// Speaks `text`. Resolves when finished (or if speech is off / unavailable).
// options.force: speak even if the voice switch is off (used for replies to a button the user pressed).
export async function speak(text, languageCode = 'en', options = {}) {
  if (!Speech || !text) return;
  if (!enabled && !options.force) return;
  if (busyListening && !options.force) return;
  const language = await pickLanguage(languageCode);
  stopSpeaking();
  await new Promise((resolve) => {
    try {
      Speech.speak(String(text), {
        language,
        rate: 0.9,
        pitch: 1.0,
        volume: 1.0,
        onDone: resolve,
        onStopped: resolve,
        onError: resolve,
      });
    } catch { resolve(); }
  });
}

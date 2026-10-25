import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { translateTexts } from '../api';

// ---------------------------------------------------------------------------
// AI translation engine
//
// - Source strings are the English text passed to t("...").
// - Anything not yet translated is queued, sent to the backend AI in ONE batch
//   (debounced), and cached on the device per language.
// - While a translation is loading, t() returns the English text, then the UI
//   re-renders when the AI result arrives.
// - Works for ANY language (name or code); nothing is hardcoded.
// ---------------------------------------------------------------------------

const CACHE_PREFIX = 'saathi_i18n_';
const BATCH_DELAY_MS = 150;
const MAX_BATCH = 60;

// Languages offered in the picker. Add any language here: no other code changes needed.
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', stt: 'en-IN' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', stt: 'hi-IN' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', stt: 'mr-IN' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', stt: 'bn-IN' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', stt: 'ta-IN' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', stt: 'te-IN' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', stt: 'gu-IN' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', stt: 'kn-IN' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', stt: 'ml-IN' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', stt: 'pa-IN' },
];

export const languageName = (code) =>
  SUPPORTED_LANGUAGES.find((l) => l.code === code)?.name || code || 'English';

export const languageCode = (nameOrCode) => {
  const v = String(nameOrCode || '').toLowerCase();
  return (
    SUPPORTED_LANGUAGES.find((l) => l.code === v || l.name.toLowerCase() === v)?.code || 'en'
  );
};

// ---- storage helpers ------------------------------------------------------
async function readCache(code) {
  try {
    const raw =
      Platform.OS === 'web'
        ? localStorage.getItem(CACHE_PREFIX + code)
        : await SecureStore.getItemAsync(CACHE_PREFIX + code);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeCache(code, map) {
  try {
    const raw = JSON.stringify(map);
    if (Platform.OS === 'web') localStorage.setItem(CACHE_PREFIX + code, raw);
    else if (raw.length < 1900) await SecureStore.setItemAsync(CACHE_PREFIX + code, raw);
    // SecureStore values are size-limited; larger caches stay in memory for the session.
  } catch {}
}

// ---- in-memory state ------------------------------------------------------
const memory = {}; // { [code]: { [english]: translated } }
const pending = {}; // { [code]: Set<english> }
const inflight = {}; // { [code]: Set<english> }
const timers = {};
const listeners = new Set();

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const notify = () => listeners.forEach((fn) => { try { fn(); } catch {} });

export async function loadLanguage(code) {
  if (!code || code === 'en') return;
  if (!memory[code]) memory[code] = await readCache(code);
  notify();
}

// Synchronous lookup used by t(). Returns the English key until AI result arrives.
export function translate(key, code) {
  if (!key || !code || code === 'en') return key;
  const hit = memory[code]?.[key];
  if (hit) return hit;
  queue(key, code);
  return key;
}

function queue(key, code) {
  if (!String(key).trim()) return;
  if (inflight[code]?.has(key)) return;
  (pending[code] ||= new Set()).add(key);
  clearTimeout(timers[code]);
  timers[code] = setTimeout(() => flush(code), BATCH_DELAY_MS);
}

async function flush(code) {
  const keys = [...(pending[code] || [])].slice(0, MAX_BATCH);
  if (!keys.length) return;
  keys.forEach((k) => pending[code].delete(k));
  (inflight[code] ||= new Set());
  keys.forEach((k) => inflight[code].add(k));

  try {
    const result = await translateTexts(keys, languageName(code));
    const out = Array.isArray(result?.translations) ? result.translations : [];
    memory[code] ||= {};
    keys.forEach((k, i) => {
      if (typeof out[i] === 'string' && out[i].trim()) memory[code][k] = out[i];
    });
    await writeCache(code, memory[code]);
    notify();
  } catch {
    // Network/AI failure: keep showing English. Retried the next time the string is requested.
  } finally {
    keys.forEach((k) => inflight[code].delete(k));
    if (pending[code]?.size) timers[code] = setTimeout(() => flush(code), BATCH_DELAY_MS);
  }
}

// Translate one dynamic string on demand (chat replies, AI-generated text, etc.).
export async function translateOne(text, code) {
  if (!text || !code || code === 'en') return text;
  if (memory[code]?.[text]) return memory[code][text];
  try {
    const result = await translateTexts([text], languageName(code));
    return result?.translations?.[0] || text;
  } catch {
    return text;
  }
}

// Translate a template that has {placeholders}, then fill them in.
// Placeholders are protected so the AI keeps them unchanged.
export async function translateTemplate(template, code, values = {}) {
  const fill = (s) => s.replace(/\{(\w+)\}/g, (_, k) => (values[k] ?? ''));
  const translated = await translateOne(template, code);
  const hasAll = (template.match(/\{\w+\}/g) || []).every((p) => translated.includes(p));
  return fill(hasAll ? translated : template);
}

// Sound files only exist for some languages; others fall back to English.
export const SOUND_LANGS = ['en', 'hi', 'mr'];
export const soundCode = (code) => (SOUND_LANGS.includes(code) ? code : 'en');

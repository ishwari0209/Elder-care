// "Phone only" reader: turns redacted medicine lines into form-ready medicines
// without any AI. Also normalises results coming back from the AI.
import { ALL_DAYS } from '../context/SaathiContext';
import { availableDays } from '../utlis/dateDays';

const FORM = /^\s*(?:\d{1,2}\s*[).\-:]\s*)?(?:tab(?:let)?s?|cap(?:sule)?s?|syp|syrup|inj(?:ection)?|oint(?:ment)?|drops?|susp(?:ension)?|gel|cream|lotion|sachet|inhaler)\b\.?\s*/i;
const NUMBERING = /^\s*\d{1,2}\s*[).\-:]\s+/;
const STRENGTH = /(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug|ml|iu|g)\b/i;
const FREQ_DASH = /\b([0-4](?:\.5)?)\s*[-–]\s*([0-4](?:\.5)?)\s*[-–]\s*([0-4](?:\.5)?)(?:\s*[-–]\s*([0-4]))?\b/;
const DURATION = /\b(?:x|for)\s*(\d{1,3})\s*(days?|weeks?|wks?|months?)\b/i;

const T = { morning: '8:00 AM', noon: '2:00 PM', evening: '4:00 PM', night: '8:00 PM', bed: '9:00 PM' };

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// "20:00" -> "8:00 PM" (the format the app's time picker uses)
export function to12h(hhmm) {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm || ''));
  if (!m) return '';
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
}

function timesFromLine(line) {
  const dash = FREQ_DASH.exec(line);
  if (dash) {
    const [, a, b, c, d] = dash;
    const out = [];
    if (Number(a) > 0) out.push(T.morning);
    if (Number(b) > 0) out.push(T.noon);
    if (Number(c) > 0) out.push(T.night);
    if (d && Number(d) > 0) out.push(T.bed);
    return out;
  }
  if (/\b(qid|four times)\b/i.test(line)) return [T.morning, '12:00 PM', T.evening, T.night];
  if (/\b(tds|tid|thrice)\b/i.test(line)) return [T.morning, T.noon, T.night];
  if (/\b(bd|bid|twice)\b/i.test(line)) return [T.morning, T.night];
  if (/\b(od|qd|once daily|once a day)\b/i.test(line)) return [T.morning];
  if (/\b(hs|at night|bedtime)\b/i.test(line)) return [T.bed];
  return []; // SOS / unclear: the user picks the time
}

function notesFromLine(line) {
  const notes = [];
  if (/\bafter (?:food|meals?)\b/i.test(line)) notes.push('After food');
  else if (/\bbefore (?:food|meals?)\b/i.test(line)) notes.push('Before food');
  else if (/\bwith (?:food|meals?)\b/i.test(line)) notes.push('With food');
  else if (/\bempty stomach\b/i.test(line)) notes.push('On an empty stomach');
  if (/\b(sos|prn|if needed|when required)\b/i.test(line)) notes.push('Only when needed');
  return notes;
}

function durationFromLine(line) {
  const m = DURATION.exec(line);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const days = unit.startsWith('w') ? n * 7 : unit.startsWith('m') ? n * 30 : n;
  return days > 0 && days <= 365 ? days : null;
}

function nameFromLine(line) {
  let s = line.replace(NUMBERING, '').replace(FORM, '');
  // cut at the first strength / frequency / duration marker
  const cut = [STRENGTH, FREQ_DASH, DURATION, /\b(od|qd|bd|bid|tds|tid|qid|hs|sos|prn)\b/i, /\b(after|before|with)\s+(food|meals?)\b/i]
    .map((re) => s.search(re))
    .filter((i) => i >= 0);
  if (cut.length) s = s.slice(0, Math.min(...cut));
  s = s.replace(/[^\p{L}\p{N}\s.\-()/]/gu, ' ').replace(/\s+/g, ' ').trim();
  return /\p{L}{2}/u.test(s) ? s.slice(0, 120) : '';
}

function dosageFromLine(line) {
  const strength = STRENGTH.exec(line);
  const s = strength ? `${strength[1]} ${strength[2].toLowerCase()}` : '';
  const form = /^\s*(?:\d{1,2}\s*[).\-:]\s*)?(tab(?:let)?|cap(?:sule)?|syp|syrup|inj(?:ection)?|drops?)/i.exec(line);
  const unit = form ? (/^cap/i.test(form[1]) ? 'capsule' : /^tab/i.test(form[1]) ? 'tablet' : '') : '';
  return [s, unit ? `1 ${unit}` : ''].filter(Boolean).join(', ');
}

// lines -> [{ name, dosage, times:[ "8:00 AM" ], durationDays, notes }]
export function parseLocally(lines) {
  const meds = [];
  for (const line of Array.isArray(lines) ? lines : []) {
    const name = nameFromLine(line);
    const times = timesFromLine(line);
    const durationDays = durationFromLine(line);
    const notes = notesFromLine(line);

    if (!name && meds.length) {
      // continuation line like "1-0-1 x 5 days" or "after food"
      const last = meds[meds.length - 1];
      if (!last.times.length) last.times = times;
      if (!last.durationDays) last.durationDays = durationDays;
      notes.forEach((n) => { if (!last.notes.includes(n)) last.notes.push(n); });
      if (!last.dosage) last.dosage = dosageFromLine(line);
      continue;
    }
    if (!name) continue;
    meds.push({ name, dosage: dosageFromLine(line), times, durationDays, notes });
  }
  return meds;
}

// AI result -> same shape as parseLocally
export function fromAI(list) {
  return (Array.isArray(list) ? list : [])
    .filter((m) => m && typeof m.name === 'string' && m.name.trim())
    .map((m) => ({
      name: m.name.trim().slice(0, 120),
      dosage: String(m.dosage || '').trim().slice(0, 120),
      times: (Array.isArray(m.times) ? m.times : []).map(to12h).filter(Boolean),
      durationDays: Number.isInteger(m.durationDays) && m.durationDays > 0 ? m.durationDays : null,
      notes: String(m.notes || '').trim() ? [String(m.notes).trim().slice(0, 300)] : [],
    }));
}

// -> an item shaped exactly like the Medicine form (see MedicineSetupScreen)
export function toFormItem(m) {
  let start = '';
  let end = '';
  let days = [...ALL_DAYS];
  if (m.durationDays) {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + m.durationDays - 1);
    start = isoDate(from);
    end = isoDate(to);
    days = availableDays(start, end);
  }
  return {
    name: m.name,
    dosage: m.dosage || '',
    times: (m.times || []).join(', '),
    start,
    end,
    days,
    notes: (m.notes || []).join('. '),
  };
}

// Understands spoken commands in English, Hindi and Marathi.
// Pure functions only (no React / native code) so they are easy to test.

const DEVANAGARI_DIGITS = '०१२३४५६७८९';

export const normalize = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)))
    .replace(/[,;!?'"“”‘’।]/g, ' ')
    .replace(/\ba\.?m\.?\b/g, 'am')
    .replace(/\bp\.?m\.?\b/g, 'pm')
    .replace(/\s+/g, ' ')
    .trim();

const hasAny = (text, words) => words.some((w) => text.includes(w));
const tokens = (text) => normalize(text).split(' ').filter(Boolean);

// ---------- yes / no ----------
const YES = ['yes', 'yeah', 'yep', 'yup', 'ok', 'okay', 'sure', 'confirm', 'correct', 'right', 'do it',
  'हाँ', 'हां', 'हा', 'जी', 'ठीक', 'बिल्कुल', 'होय', 'हो', 'बरोबर', 'ठीक आहे', 'करा', 'कर दो'];
const NO = ['no', 'nope', 'cancel', 'stop', "don't", 'dont', 'wrong', 'never mind',
  'नहीं', 'नही', 'मत', 'रद्द', 'नको', 'नाही', 'थांब', 'रुको'];

export function parseYesNo(text) {
  const n = normalize(text);
  const words = n.split(' ');
  if (words.length > 5) return null;
  const has = (list) => list.some((w) => (w.includes(' ') ? n.includes(w) : words.includes(w)));
  if (has(NO)) return 'no';
  if (has(YES)) return 'yes';
  return null;
}

// ---------- time ----------
const EN_NUMBERS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const MORNING = ['morning', 'सुबह', 'सवेरे', 'सकाळी', 'सकाळ'];
const AFTERNOON = ['afternoon', 'दोपहर', 'दुपारी', 'दुपार'];
const EVENING = ['evening', 'शाम', 'संध्याकाळी', 'सायंकाळी', 'संध्याकाळ'];
const NIGHT = ['night', 'रात', 'रात्री'];

function periodFromWords(n) {
  if (/\b(am|a\.m\.?)\b/i.test(n)) return 'AM';
  if (/\b(pm|p\.m\.?)\b/i.test(n)) return 'PM';

  if (hasAny(n, MORNING)) return 'AM';
  if (hasAny(n, AFTERNOON) || hasAny(n, EVENING)) return 'PM';
  if (hasAny(n, NIGHT)) return 'NIGHT';

  return null;
}

export function formatTime(hour24, minute) {
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const h = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${h}:${String(minute).padStart(2, '0')} ${period}`;
}

export function timeToMinutes(value) {
  const m = String(value || '').trim().match(/^(\d{1,2})[:.](\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const p = m[3]?.toUpperCase();
  if (min > 59) return null;
  if (p) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (p === 'PM' ? 12 : 0);
  } else if (h > 23) return null;
  return h * 60 + min;
}

// Finds every time mentioned in the sentence, in order.
// Returns [{ hour12 | hour24, minute, period: 'AM'|'PM'|null }]
export function extractTimes(text) {
  let n = normalize(text);
  Object.entries(EN_NUMBERS).forEach(([w, v]) => {
    n = n.replace(new RegExp(`\\b${w}\\b`, 'g'), String(v));
  });
  n = n
    .replace(/\bhalf past (\d{1,2})\b/g, '$1:30')
    .replace(/\bquarter past (\d{1,2})\b/g, '$1:15')
    .replace(/\b(\d{1,2}) (?:forty[- ]?five)\b/g, '$1:45')
    .replace(/\b(\d{1,2}) (?:thirty)\b/g, '$1:30')
    .replace(/\b(\d{1,2}) (?:twenty)\b/g, '$1:20')
    .replace(/\b(\d{1,2}) (?:fifteen)\b/g, '$1:15');
  const sentencePeriodEarly = periodFromWords(n);
  const found = [];
  const re =/(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?(?:\s*(?:बजे|बजकर|वाजता|वाजले|o'clock|oclock))?/gi;
  let m;
  while ((m = re.exec(n))) {
    const hour = Number(m[1]);
    let minute = m[2] ? Number(m[2]) : 0;
    const explicit = m[3]?.toUpperCase() || null;
    const hasMarker = Boolean(m[2] || explicit || /(बजे|बजकर|वाजता|वाजले|o'?clock|oclock)/.test(m[0]));
    const before = n.slice(Math.max(0, m.index - 6), m.index);
    const afterPreposition = /(?:\bto|\bat|\bby|\bfor)\s*$/.test(before);
    if (!hasMarker && !afterPreposition && !sentencePeriodEarly) continue; // a lone number is not a time
    if (hour > 24 || minute > 59) continue;
    found.push({ hour, minute, period: explicit, index: m.index });
  }
  const sentencePeriod = periodFromWords(n);
  return found.map(({ hour, minute, period }) => {
    let p = period || sentencePeriod;
    if (hour > 12 || hour === 0) return { hour24: hour % 24, minute, period: hour >= 12 ? 'PM' : 'AM' };
    if (p === 'NIGHT') p = hour === 12 || hour < 6 ? 'AM' : 'PM';
    return { hour12: hour, minute, period: p };
  });
}

// Turns a parsed time into a "h:mm AM" string. When AM/PM was not said,
// keeps the same AM/PM as `referenceTime` (the old time) so "change to 5" stays sensible;
// the assistant always reads the result back for confirmation.
export function resolveTime(parsed, referenceTime) {
  if (!parsed) return null;
  if (parsed.hour24 !== undefined) return formatTime(parsed.hour24, parsed.minute);
  let period = parsed.period;
  if (!period) {
    const ref = timeToMinutes(referenceTime);
    period = ref !== null && ref >= 12 * 60 ? 'PM' : 'AM';
  }
  const h24 = (parsed.hour12 % 12) + (period === 'PM' ? 12 : 0);
  return formatTime(h24, parsed.minute);
}

// ---------- keywords ----------
const DONE_WORDS = [
  'done', 'taken', 'took', 'finished', 'completed', 'ate', 'eaten', 'had my', 'have had', 'i had',
  'ले ली', 'ले लिया', 'लिया', 'खा लिया', 'खा ली', 'खाया', 'हो गया', 'हो गई', 'हो गयी', 'कर लिया', 'कर ली', 'पूरा', 'ले लीं',
  'घेतले', 'घेतली', 'घेतल', 'घेतलं', 'झाले', 'झाली', 'झालं', 'केले', 'केली', 'केलं', 'खाल्ले', 'खाल्ली', 'खाल्लं', 'पूर्ण',
];
const CHANGE_WORDS = [
  'change', 'set', 'update', 'move', 'reschedule',
  'shift', 'edit', 'make it', 'modify',
  'बदल', 'चेंज', 'सेट', 'अपडेट', 'बदला',
  'बदलो', 'बदलें', 'करा', 'कर', 'ठेवा',
  'वेळ बदला', 'वेळेत बदल'
];
const MEDICINE_WORDS = ['medicine', 'medicines', 'tablet', 'pill', 'dose', 'दवा', 'दवाई', 'गोली', 'औषध', 'गोळी', 'गोळ्या', 'डोस'];
const ROUTINE_WORDS = ['routine', 'activity', 'दिनचर्या', 'दिनक्रम', 'गतिविधि', 'क्रिया'];
const READOUT_WORDS = [
  'what', 'read', 'tell me', 'next', 'schedule', 'today', 'list', 'remind me',
  'बताओ', 'बताइए', 'बताएं', 'पढ़', 'आज', 'अगला', 'क्या',
  'सांग', 'वाच', 'पुढ', 'काय', 'आज',
];
const NEGATION = ["not", "haven't", 'havent', "didn't", 'didnt', 'नहीं', 'नही', 'नाही', 'अजून', 'अभी'];

// ---------- fuzzy name matching ----------
function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

const similar = (a, b) => {
  if (a === b) return 1;
  if (a.length < 3 || b.length < 3) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
};

const CATEGORY_WORDS = {
  Meal: ['food', 'meal', 'lunch', 'dinner', 'breakfast', 'eat', 'जेवण', 'जेवले', 'खाना', 'नाश्ता', 'भोजन'],
  Exercise: ['exercise', 'walk', 'yoga', 'workout', 'व्यायाम', 'टहल', 'चलना', 'फिरणे', 'योग'],
  Sleep: ['sleep', 'bed', 'नींद', 'सोना', 'झोप'],
  Appointment: ['appointment', 'doctor', 'भेट', 'अपॉइंटमेंट'],
};

export function scoreName(name, utterance) {
  const nameTokens = tokens(name).filter((t) => t.length >= 2);
  if (!nameTokens.length) return 0;
  const n = normalize(utterance);
  if (n.includes(normalize(name))) return 1;
  const words = n.split(' ');
  let matched = 0;
  nameTokens.forEach((nt) => {
    const best = Math.max(0, ...words.map((w) => similar(nt, w)));
    if (best >= 0.7) matched += best;
  });
  return matched / nameTokens.length;
}

// Returns items sorted by match quality (only those that really match).
export function findByName(items, utterance, minScore = 0.6) {
  const n = normalize(utterance);
  return items
    .map((item) => {
      let score = scoreName(item.name, utterance);
      // A routine can also be found by its category ("food is done" -> Meal).
      if (score < minScore && item.kind === 'routine' && CATEGORY_WORDS[item.category]) {
        if (hasAny(n, CATEGORY_WORDS[item.category])) score = 0.75;
      }
      return { item, score };
    })
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score);
}

// ---------- main parser ----------
// ctx: { routines, medicines } (already filtered to what applies today)
export function parseCommand(text, ctx = {}) {
  const n = normalize(text);
  if (!n) return { intent: 'empty' };

  const times = extractTimes(n);
  const wantsMedicine = hasAny(n, MEDICINE_WORDS);
  const wantsRoutine = hasAny(n, ROUTINE_WORDS);
  const typeHint = wantsMedicine && !wantsRoutine ? 'medicine' : wantsRoutine && !wantsMedicine ? 'routine' : null;

  const all = [
    ...(ctx.routines || []).map((r) => ({ ...r, kind: 'routine' })),
    ...(ctx.medicines || []).map((m) => ({ ...m, kind: 'medicine' })),
  ];
  const pool = typeHint ? all.filter((i) => i.kind === typeHint) : all;
  const matches = findByName(pool, n);

  const changeWord = hasAny(n, CHANGE_WORDS);
  if (changeWord) {
    return { intent: 'change', typeHint, matches, times };
  }

  const negated = hasAny(n, NEGATION) && !hasAny(n, ['हो गया', 'हो गई']);
  if (hasAny(n, DONE_WORDS) && !negated) {
    // "taken"/"took" in English or medicine nouns imply a medicine when no name was said
    const impliesMedicine = wantsMedicine || /\b(taken|took)\b/.test(n);
    return { intent: 'done', typeHint: typeHint || (impliesMedicine && !matches.length ? 'medicine' : null), matches };
  }

  // A time with a name but no change word is not guessed at.
  if (hasAny(n, READOUT_WORDS)) return { intent: 'readout', typeHint };

  if (matches.length) return { intent: 'unclear-item', matches };
  return { intent: 'unknown' };
}

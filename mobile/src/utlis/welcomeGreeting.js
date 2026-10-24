// Builds the "Welcome, <name>! Good morning, how are you? ..." message shown when
// the user opens the app / logs in. Uses the same schedule rules as the dashboard.
import { getScheduledDate, todaysRoutines, todaysMedicines, buildDoses } from '../voice/schedule';

const TEXT = {
  English: {
    title: (n) => (n ? `Welcome, ${n}!` : 'Welcome!'),
    replay: 'Hear again',
    at: 'at',
    spokenH: (h, m) => `in ${h} ${h === 1 ? 'hour' : 'hours'}${m ? ` ${m} ${m === 1 ? 'minute' : 'minutes'}` : ''}`,
    spokenM: (m) => `in ${m} ${m === 1 ? 'minute' : 'minutes'}`,
    greeting: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' },
    howAre: 'How are you?',
    header: 'Coming up next:',
    none: 'You have nothing else scheduled for today.',
    kind: { medicine: 'Medicine', routine: 'Routine' },
    now: 'now',
    inH: (h, m) => (m ? `in ${h} h ${m} min` : `in ${h} h`),
    inM: (m) => `in ${m} min`,
    ok: 'OK',
  },
  Hindi: {
    title: (n) => (n ? `स्वागत है, ${n}!` : 'स्वागत है!'),
    replay: 'फिर से सुनें',
    at: '',
    greeting: { morning: 'सुप्रभात', afternoon: 'शुभ दोपहर', evening: 'शुभ संध्या' },
    howAre: 'आप कैसे हैं?',
    header: 'आगे आने वाले काम:',
    none: 'आज के लिए और कुछ निर्धारित नहीं है।',
    kind: { medicine: 'दवा', routine: 'दिनचर्या' },
    now: 'अभी',
    inH: (h, m) => (m ? `${h} घंटे ${m} मिनट में` : `${h} घंटे में`),
    inM: (m) => `${m} मिनट में`,
    ok: 'ठीक है',
  },
  Marathi: {
    title: (n) => (n ? `स्वागत आहे, ${n}!` : 'स्वागत आहे!'),
    replay: 'पुन्हा ऐका',
    at: '',
    greeting: { morning: 'शुभ प्रभात', afternoon: 'शुभ दुपार', evening: 'शुभ संध्याकाळ' },
    howAre: 'तुम्ही कसे आहात?',
    header: 'पुढील कामे:',
    none: 'आज आणखी काही नियोजित नाही.',
    kind: { medicine: 'औषध', routine: 'दिनचर्या' },
    now: 'आता',
    inH: (h, m) => (m ? `${h} तास ${m} मिनिटांत` : `${h} तासात`),
    inM: (m) => `${m} मिनिटांत`,
    ok: 'ठीक आहे',
  },
};

const CODE_TO_NAME = { en: 'English', hi: 'Hindi', mr: 'Marathi' };
const NAME_TO_CODE = { English: 'en', Hindi: 'hi', Marathi: 'mr' };

export function partOfDay(now = new Date()) {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  return 'evening';
}

// Language chosen at profile creation wins; the app language is the fallback.
export function resolveLanguage(profileLanguage, appLanguage) {
  if (TEXT[profileLanguage]) return profileLanguage;
  return CODE_TO_NAME[appLanguage] || 'English';
}

export function buildWelcome({
  name, routines, medicines, done = {}, taken = {},
  profileLanguage, appLanguage, now = new Date(), limit = 3,
}) {
  const language = resolveLanguage(profileLanguage, appLanguage);
  const tx = TEXT[language];
  const part = partOfDay(now);

  const items = [];

  todaysRoutines(routines, now).forEach((r) => {
    const at = getScheduledDate(r.time, now);
    if (!at || done[r._id] || at.getTime() < now.getTime() - 60 * 1000) return;
    items.push({ kind: 'routine', name: r.name, time: r.time, at });
  });

  buildDoses(todaysMedicines(medicines, now)).forEach((d) => {
    const at = getScheduledDate(d.time, now);
    if (!at || taken[d.key] || at.getTime() < now.getTime() - 60 * 1000) return;
    items.push({ kind: 'medicine', name: d.name, time: d.time, at });
  });

  items.sort((a, b) => a.at - b.at);

  const upcoming = items.slice(0, limit).map((it) => {
    const minutes = Math.max(0, Math.round((it.at.getTime() - now.getTime()) / 60000));
    const when = minutes < 1 ? tx.now : minutes < 60 ? tx.inM(minutes) : tx.inH(Math.floor(minutes / 60), minutes % 60);
    // English abbreviations ("3 h") would be read letter by letter, so speech uses full words.
    const whenSpoken = minutes < 1 ? tx.now : minutes < 60
      ? (tx.spokenM || tx.inM)(minutes)
      : (tx.spokenH || tx.inH)(Math.floor(minutes / 60), minutes % 60);
    return { kind: it.kind, kindLabel: tx.kind[it.kind], name: it.name, time: it.time, when, whenSpoken };
  });

  const title = tx.title(String(name || '').trim());
  const greeting = `${tx.greeting[part]}! ${tx.howAre}`;

  // What the phone says out loud (same content as the pop-up).
  const spoken = [
    title,
    greeting,
    ...(upcoming.length
      ? [tx.header, ...upcoming.map((u) => `${u.kindLabel}: ${u.name}, ${[tx.at, u.time].filter(Boolean).join(' ')}, ${u.whenSpoken}.`)]
      : [tx.none]),
  ].join(' ');

  return {
    part,
    title,
    greeting,
    header: tx.header,
    none: tx.none,
    ok: tx.ok,
    replay: tx.replay,
    languageCode: NAME_TO_CODE[language],
    speech: spoken,
    upcoming,
  };
}

// The "brain" of the voice assistant: given what the person said, decide
// what to say back and which action (if any) the app should perform.
// Pure functions - no React, no native modules.

import {
  parseCommand, parseYesNo, extractTimes, resolveTime, findByName, normalize,
} from './voiceParser';
import {
  todaysRoutines, todaysMedicines, buildDoses, splitTimes, timeToMinutes,
  getScheduledDate, getCompletionWindow,
} from './schedule';

// ------------------------------------------------------------------ text
const periodWord = {
  hi: (h) => (h >= 4 && h < 12 ? 'सुबह' : h >= 12 && h < 16 ? 'दोपहर' : h >= 16 && h < 20 ? 'शाम' : 'रात'),
  mr: (h) => (h >= 4 && h < 12 ? 'सकाळी' : h >= 12 && h < 16 ? 'दुपारी' : h >= 16 && h < 20 ? 'संध्याकाळी' : 'रात्री'),
};

// "1:50 PM" -> how it should be spoken in each language.
export function spokenTime(time, lang) {
  const mins = timeToMinutes(time);
  if (mins === Number.MAX_SAFE_INTEGER) return String(time || '');
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  if (lang === 'hi' || lang === 'mr') return `${periodWord[lang](h24)} ${h12}:${String(m).padStart(2, '0')}`;
  return m === 0 ? `${h12} ${h24 >= 12 ? 'PM' : 'AM'}` : `${h12}:${String(m).padStart(2, '0')} ${h24 >= 12 ? 'PM' : 'AM'}`;
}

const GREETINGS = {
  en: ['Good morning', 'Good afternoon', 'Good evening', 'Good night'],
  hi: ['सुप्रभात', 'नमस्कार', 'शुभ संध्या', 'शुभ रात्रि'],
  mr: ['सुप्रभात', 'नमस्कार', 'शुभ संध्याकाळ', 'शुभ रात्री'],
};

export function greetingFor(hour, lang) {
  const g = GREETINGS[lang] || GREETINGS.en;
  if (hour >= 4 && hour < 12) return g[0];
  if (hour >= 12 && hour < 17) return g[1];
  if (hour >= 17 && hour < 21) return g[2];
  return g[3];
}

const M = {
  en: {
    empty: () => 'I did not hear anything. Please try again.',
    unknown: () => 'Sorry, I did not understand. You can say: I have taken my medicine. Or: breakfast is done. Or: change Tap time to 5 PM.',
    doneRoutine: (n) => `Okay, ${n} is marked as done.`,
    doneDose: (n) => `Okay, ${n} is marked as taken.`,
    already: (n) => `${n} is already marked.`,
    tooEarlyRoutine: (n, t) => `${n} is scheduled for ${t}. Please tell me again closer to that time.`,
    tooEarlyDose: (n, t) => `${n} is due at ${t}. I will remind you then.`,
    nothingDue: () => 'No medicine is due right now.',
    allTaken: () => 'All your medicines for today are already confirmed.',
    askWhich: (l) => `Which one? ${l}. Say the name or the number.`,
    askItem: (l) => `Which medicine or routine do you want to change? ${l}`,
    askTime: (n) => `What new time for ${n}?`,
    askFrom: (n, t) => `${n} has these times: ${t}. Which time should I change?`,
    confirmChange: (n, f, t) => `Change ${n} from ${f} to ${t}. Say yes to confirm, or no to cancel.`,
    changed: (n, t) => `Done. ${n} is now at ${t}. Your reminders are updated.`,
    cancelled: () => 'Okay, cancelled.',
    sayYesNo: () => 'Please say yes or no.',
    sameTime: (n, t) => `${n} is already at ${t}.`,
    notFound: () => 'I could not find that name.',
    nothingSetUp: () => 'You have nothing set up yet.',
    error: () => 'Sorry, I could not save that. Please try again.',
    nextUp: (n, t) => `Next is ${n} at ${t}.`,
    nothingNext: () => 'You have nothing more scheduled for today.',
    briefing: (g, name, m, r) => `${g}${name ? `, ${name}` : ''}. Today you have ${m} medicine ${m === 1 ? 'dose' : 'doses'} and ${r} ${r === 1 ? 'activity' : 'activities'}.`,
    missedNote: (n) => `You have not yet marked ${n}.`,
    micDenied: () => 'Please allow microphone permission in your phone settings.',
    notAvailable: () => 'Voice listening is not available on this phone.',
  },
  hi: {
    empty: () => 'मुझे कुछ सुनाई नहीं दिया। कृपया फिर से बोलिए।',
    unknown: () => 'माफ़ कीजिए, मैं समझ नहीं पाया। आप कह सकते हैं: मैंने दवा ले ली। या: खाना हो गया। या: टैप का समय शाम 5 बजे बदलो।',
    doneRoutine: (n) => `ठीक है, ${n} पूरा हो गया।`,
    doneDose: (n) => `ठीक है, ${n} दवा ले ली गई है।`,
    already: (n) => `${n} पहले से दर्ज है।`,
    tooEarlyRoutine: (n, t) => `${n} का समय ${t} है। कृपया समय के पास आकर फिर बताइए।`,
    tooEarlyDose: (n, t) => `${n} का समय ${t} है। मैं तब याद दिला दूँगा।`,
    nothingDue: () => 'अभी किसी दवा का समय नहीं है।',
    allTaken: () => 'आज की सभी दवाइयाँ दर्ज हो चुकी हैं।',
    askWhich: (l) => `कौन सा? ${l}। नाम या नंबर बोलिए।`,
    askItem: (l) => `किस दवा या दिनचर्या का समय बदलना है? ${l}`,
    askTime: (n) => `${n} के लिए नया समय क्या होगा?`,
    askFrom: (n, t) => `${n} के समय हैं: ${t}। कौन सा समय बदलूँ?`,
    confirmChange: (n, f, t) => `${n} का समय ${f} से बदलकर ${t} करना है। पक्का करने के लिए हाँ बोलिए, रद्द करने के लिए नहीं।`,
    changed: (n, t) => `हो गया। ${n} का समय अब ${t} है। रिमाइंडर भी बदल दिए गए हैं।`,
    cancelled: () => 'ठीक है, रद्द कर दिया।',
    sayYesNo: () => 'कृपया हाँ या नहीं बोलिए।',
    sameTime: (n, t) => `${n} का समय पहले से ${t} है।`,
    notFound: () => 'मुझे यह नाम नहीं मिला।',
    nothingSetUp: () => 'अभी आपने कुछ सेट नहीं किया है।',
    error: () => 'माफ़ कीजिए, सेव नहीं हो पाया। कृपया फिर कोशिश कीजिए।',
    nextUp: (n, t) => `अगला है ${n}, ${t}।`,
    nothingNext: () => 'आज के लिए और कुछ बाकी नहीं है।',
    briefing: (g, name, m, r) => `${g}${name ? `, ${name}` : ''}। आज आपकी ${m} दवाइयाँ और ${r} गतिविधियाँ हैं।`,
    missedNote: (n) => `आपने ${n} अभी दर्ज नहीं किया है।`,
    micDenied: () => 'कृपया फ़ोन की सेटिंग में माइक्रोफ़ोन की अनुमति दीजिए।',
    notAvailable: () => 'इस फ़ोन पर बोलकर आदेश देना उपलब्ध नहीं है।',
  },
  mr: {
    empty: () => 'मला काही ऐकू आले नाही. कृपया पुन्हा बोला.',
    unknown: () => 'माफ करा, मला समजले नाही. तुम्ही म्हणू शकता: मी औषध घेतले. किंवा: जेवण झाले. किंवा: टॅपची वेळ संध्याकाळी ५ वाजता बदला.',
    doneRoutine: (n) => `ठीक आहे, ${n} पूर्ण झाले.`,
    doneDose: (n) => `ठीक आहे, ${n} औषध घेतल्याची नोंद केली.`,
    already: (n) => `${n} ची नोंद आधीच झाली आहे.`,
    tooEarlyRoutine: (n, t) => `${n} ची वेळ ${t} आहे. कृपया वेळेच्या जवळ आल्यावर पुन्हा सांगा.`,
    tooEarlyDose: (n, t) => `${n} ची वेळ ${t} आहे. मी तेव्हा आठवण करून देईन.`,
    nothingDue: () => 'आत्ता कोणत्याही औषधाची वेळ नाही.',
    allTaken: () => 'आजची सर्व औषधे नोंदवली आहेत.',
    askWhich: (l) => `कोणते? ${l}. नाव किंवा क्रमांक सांगा.`,
    askItem: (l) => `कोणत्या औषधाची किंवा दिनक्रमाची वेळ बदलायची? ${l}`,
    askTime: (n) => `${n} साठी नवीन वेळ कोणती?`,
    askFrom: (n, t) => `${n} च्या वेळा: ${t}. कोणती वेळ बदलू?`,
    confirmChange: (n, f, t) => `${n} ची वेळ ${f} ऐवजी ${t} करायची आहे. पक्के करण्यासाठी होय म्हणा, रद्द करण्यासाठी नाही.`,
    changed: (n, t) => `झाले. ${n} ची वेळ आता ${t} आहे. आठवणही बदलल्या आहेत.`,
    cancelled: () => 'ठीक आहे, रद्द केले.',
    sayYesNo: () => 'कृपया होय किंवा नाही म्हणा.',
    sameTime: (n, t) => `${n} ची वेळ आधीच ${t} आहे.`,
    notFound: () => 'मला हे नाव सापडले नाही.',
    nothingSetUp: () => 'तुम्ही अजून काही सेट केलेले नाही.',
    error: () => 'माफ करा, जतन करता आले नाही. कृपया पुन्हा प्रयत्न करा.',
    nextUp: (n, t) => `पुढे ${n}, ${t}.`,
    nothingNext: () => 'आजसाठी आणखी काही बाकी नाही.',
    briefing: (g, name, m, r) => `${g}${name ? `, ${name}` : ''}. आज तुमची ${m} औषधे आणि ${r} कामे आहेत.`,
    missedNote: (n) => `तुम्ही ${n} ची नोंद अजून केलेली नाही.`,
    micDenied: () => 'कृपया फोनच्या सेटिंगमध्ये मायक्रोफोनची परवानगी द्या.',
    notAvailable: () => 'या फोनवर बोलून आदेश देणे उपलब्ध नाही.',
  },
};

const msg = (lang) => M[lang] || M.en;

const numbered = (options) => options.map((o, i) => `${i + 1}, ${o.label}`).join('. ');

// ------------------------------------------------------------------ context
function buildContext(env) {
  const now = env.now || new Date();
  const allRoutines = env.routines || [];
  const allMedicines = env.medicines || [];

  const routines = todaysRoutines(allRoutines, now);
  const medicines = todaysMedicines(allMedicines, now);
  const doses = buildDoses(medicines);

  return {
    now,
    routines,
    medicines,
    allRoutines,
    allMedicines,
    doses,
    done: env.done || {},
    taken: env.taken || {},
    lang: env.language || 'en',
  };
}

const isDoseDue = (dose, now) => {
  const s = getScheduledDate(dose.time, now);
  return s !== null && now.getTime() >= s.getTime();
};

const distanceFromNow = (time, now) => {
  const s = getScheduledDate(time, now);
  return s ? Math.abs(s.getTime() - now.getTime()) : Infinity;
};

// Next thing that has not been done yet and is still ahead (or due now).
function nextUpcoming(ctx) {
  const { now } = ctx;
  const nowMs = now.getTime();
  const items = [
    ...ctx.routines.filter((r) => !ctx.done[r._id]).map((r) => ({ name: r.name, time: r.time })),
    ...ctx.doses.filter((d) => !ctx.taken[d.key]).map((d) => ({ name: d.name, time: d.time })),
  ]
    .map((i) => ({ ...i, at: getScheduledDate(i.time, now) }))
    .filter((i) => i.at && i.at.getTime() >= nowMs - 30 * 60 * 1000)
    .sort((a, b) => a.at - b.at);
  return items[0] || null;
}

export function buildBriefing(env, { greet = true } = {}) {
  const ctx = buildContext(env);
  const m = msg(ctx.lang);
  const parts = [];
  if (greet) parts.push(m.briefing(greetingFor(ctx.now.getHours(), ctx.lang), env.name || '', ctx.doses.length, ctx.routines.length));
  const next = nextUpcoming(ctx);
  parts.push(next ? m.nextUp(next.name, spokenTime(next.time, ctx.lang)) : m.nothingNext());
  return parts.join(' ');
}

// ------------------------------------------------------------------ choosing
const ORDINALS = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, one: 1, two: 2, three: 3, four: 4, five: 5,
  पहला: 1, पहली: 1, दूसरा: 2, दूसरी: 2, तीसरा: 3, पहिला: 1, पहिली: 1, दुसरा: 2, दुसरी: 2, तिसरा: 3, एक: 1, दो: 2, तीन: 3 };

function pickOption(text, options) {
  const n = normalize(text);
  const word = n.split(' ').find((w) => /^\d$/.test(w) || ORDINALS[w]);
  if (word) {
    const idx = (/^\d$/.test(word) ? Number(word) : ORDINALS[word]) - 1;
    if (options[idx]) return options[idx];
  }
  const byName = findByName(options.map((o) => ({ ...o, name: o.label })), n, 0.6);
  if (byName.length === 1 || (byName.length > 1 && byName[0].score - byName[1].score > 0.15)) return byName[0].item;
  return null;
}

// ------------------------------------------------------------------ actions
function doneForRoutine(ctx, routine) {
  const m = msg(ctx.lang);
  if (ctx.done[routine._id]) return { say: m.already(routine.name) };
  const win = getCompletionWindow(routine.time, ctx.now);
  const scheduled = getScheduledDate(routine.time, ctx.now);
  if (scheduled && !win.available && !win.missed) {
    return { say: m.tooEarlyRoutine(routine.name, spokenTime(routine.time, ctx.lang)) };
  }
  return { say: m.doneRoutine(routine.name), action: { type: 'markRoutine', routine } };
}

function doneForMedicine(ctx, medicine) {
  const m = msg(ctx.lang);
  const doses = ctx.doses.filter((d) => String(d.itemId) === String(medicine._id));
  const open = doses.filter((d) => !ctx.taken[d.key]);
  if (!doses.length) return { say: m.notFound() };
  if (!open.length) return { say: m.already(medicine.name) };
  const due = open.filter((d) => isDoseDue(d, ctx.now));
  if (!due.length) return { say: m.tooEarlyDose(medicine.name, spokenTime(open[0].time, ctx.lang)) };
  const dose = due.sort((a, b) => distanceFromNow(a.time, ctx.now) - distanceFromNow(b.time, ctx.now))[0];
  return { say: m.doneDose(dose.name), action: { type: 'markDose', dose } };
}

function resolveDoneChoice(ctx, option) {
  return option.kind === 'routine' ? doneForRoutine(ctx, option.item) : doneForMedicine(ctx, option.item);
}

function handleDone(ctx, cmd) {
  const m = msg(ctx.lang);
  const matches = cmd.matches || [];

  if (matches.length) {
    const best = matches[0].score;
    const top = matches.filter((r) => best - r.score < 0.1);
    if (top.length === 1) {
      const it = top[0].item;
      return it.kind === 'routine' ? doneForRoutine(ctx, it) : doneForMedicine(ctx, it);
    }
    const options = top.map((r) => ({ kind: r.item.kind, item: r.item, label: r.item.name }));
    return { say: m.askWhich(numbered(options)), pending: { type: 'chooseDone', options, retries: 0 } };
  }

  // No name was said: "I have taken it"
  const dueDoses = ctx.doses.filter((d) => !ctx.taken[d.key] && isDoseDue(d, ctx.now));
  if (cmd.typeHint === 'medicine' || cmd.typeHint === null) {
    if (dueDoses.length === 1) {
      const med = ctx.medicines.find((x) => String(x._id) === String(dueDoses[0].itemId));
      return doneForMedicine(ctx, med);
    }
    if (dueDoses.length > 1) {
      const nearest = [...dueDoses].sort((a, b) => distanceFromNow(a.time, ctx.now) - distanceFromNow(b.time, ctx.now));
      const inWindow = nearest.filter((d) => distanceFromNow(d.time, ctx.now) <= 30 * 60 * 1000);
      if (inWindow.length === 1) {
        const med = ctx.medicines.find((x) => String(x._id) === String(inWindow[0].itemId));
        return doneForMedicine(ctx, med);
      }
      const options = nearest.slice(0, 5).map((d) => ({
        kind: 'medicine', item: ctx.medicines.find((x) => String(x._id) === String(d.itemId)), label: d.name,
      }));
      return { say: m.askWhich(numbered(options)), pending: { type: 'chooseDone', options, retries: 0 } };
    }
    if (cmd.typeHint === 'medicine') {
      if (ctx.doses.length && ctx.doses.every((d) => ctx.taken[d.key])) return { say: m.allTaken() };
      const next = ctx.doses.find((d) => !ctx.taken[d.key]);
      return { say: `${m.nothingDue()} ${next ? m.nextUp(next.name, spokenTime(next.time, ctx.lang)) : ''}`.trim() };
    }
  }

  // Generic "done": offer routines that can be marked now
  const openRoutines = ctx.routines.filter((r) => !ctx.done[r._id] && getScheduledDate(r.time, ctx.now) &&
    ctx.now.getTime() >= getScheduledDate(r.time, ctx.now).getTime() - 30 * 60 * 1000);
  if (openRoutines.length) {
    const options = openRoutines.slice(-5).map((r) => ({ kind: 'routine', item: r, label: r.name }));
    if (options.length === 1) return doneForRoutine(ctx, options[0].item);
    return { say: m.askWhich(numbered(options)), pending: { type: 'chooseDone', options, retries: 0 } };
  }
  return { say: m.unknown() };
}

// ---- change time -------------------------------------------------------
function itemTimes(item) {
  return item.kind === 'medicine' ? splitTimes(item.times) : [item.time].filter(Boolean);
}

function matchFromTime(item, parsed) {
  const times = itemTimes(item);
  return times.find((t) => {
    const mins = timeToMinutes(t);
    const h24 = Math.floor(mins / 60);
    const min = mins % 60;
    if (parsed.hour24 !== undefined) return h24 === parsed.hour24 && min === parsed.minute;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const per = h24 >= 12 ? 'PM' : 'AM';
    return h12 === parsed.hour12 && min === parsed.minute && (!parsed.period || parsed.period === per);
  });
}

// Advance the "change time" conversation as far as possible with the slots we have.
function stepChange(ctx, slots) {
  const m = msg(ctx.lang);
  const { item } = slots;

  if (!item) {
    const all = [
  ...ctx.allMedicines.map((x) => ({ ...x, kind: 'medicine' })),
  ...ctx.allRoutines.map((x) => ({ ...x, kind: 'routine' })),
];
    if (!all.length) return { say: m.nothingSetUp() };
    const options = all.map((x) => ({
  kind: x.kind,
  item: x,
  label: x.name,
}));
    return { say: m.askItem(numbered(options)), pending: { type: 'changeItem', slots, options, retries: 0 } };
  }

  const times = itemTimes(item);
  let from = slots.from;
  if (!from) {
    if (times.length === 1) from = times[0];
    else if (slots.fromParsed) from = matchFromTime(item, slots.fromParsed);
  }
  if (!from && times.length > 1) {
    return {
      say: m.askFrom(item.name, times.map((t) => spokenTime(t, ctx.lang)).join(', ')),
      pending: { type: 'changeFrom', slots: { ...slots }, retries: 0 },
    };
  }
  if (!slots.toParsed) {
    return { say: m.askTime(item.name), pending: { type: 'changeTo', slots: { ...slots, from }, retries: 0 } };
  }

  const to = resolveTime(slots.toParsed, from);
  if (timeToMinutes(to) === timeToMinutes(from)) return { say: m.sameTime(item.name, spokenTime(to, ctx.lang)) };
  if (item.kind === 'medicine' && times.some((t) => timeToMinutes(t) === timeToMinutes(to))) {
    return { say: m.sameTime(item.name, spokenTime(to, ctx.lang)) };
  }
  return {
    say: m.confirmChange(item.name, spokenTime(from, ctx.lang), spokenTime(to, ctx.lang)),
    pending: { type: 'confirmChange', change: { item, from, to }, retries: 0 },
  };
}


function handleChange(ctx, cmd) {
  const best = cmd.matches?.[0]?.score || 0;
  const top = (cmd.matches || []).filter((r) => best - r.score < 0.1);

  let item = null;

  if (top.length === 1) {
    item = top[0].item;
  } else if (top.length > 1) {
    const options = top.map((r) => ({
      kind: r.item.kind,
      item: r.item,
      label: r.item.name,
    }));

    return {
      say: msg(ctx.lang).askWhich(numbered(options)),
      pending: {
        type: 'changeItem',
        slots: { times: cmd.times },
        options,
        retries: 0,
      },
    };
  }

  // A time was specified, but no existing item matched.
  // Do not offer unrelated routines or medicines.
  if (!item && cmd.times.length > 0 && !top.length) {
    return { say: msg(ctx.lang).notFound(), pending: null };
  }

  const slots = { item };

  if (cmd.times.length >= 2) {
    slots.fromParsed = cmd.times[0];
    slots.toParsed = cmd.times[1];
  } else if (cmd.times.length === 1) {
    slots.toParsed = cmd.times[0];
  }

  return stepChange(ctx, slots);
}


// ------------------------------------------------------------------ entry point
// state.pending is whatever the previous turn left open (or null).
export function decide({ text, pending, env }) {
  const ctx = buildContext(env);
  const m = msg(ctx.lang);
  const t = normalize(text);
const asksSpecificMedicineTime =
  /(when should i take|when do i take|time for|timing of|when is|कब लेना|किस समय|कधी घ्यायचे|किती वाजता)/i.test(t);

if (asksSpecificMedicineTime) {
  const matches = findByName(ctx.allMedicines, t, 0.3);

  if (matches.length > 0) {
    const medicine = matches[0].item;
    const times = splitTimes(medicine.times);

    if (times.length > 0) {
      return {
        say: `${medicine.name} is scheduled for ${times
          .map((time) => spokenTime(time, ctx.lang))
          .join(' and ')}.`,
        pending: null,
        listenAgain: false,
      };
    }
  }
}
  if (!t) {
    if (pending && pending.retries >= 1) return { say: m.cancelled(), pending: null };
    return { say: m.empty(), pending: pending ? { ...pending, retries: (pending.retries || 0) + 1 } : null, listenAgain: Boolean(pending) };
  }

  if (pending) {
    const retry = () => (pending.retries >= 1
      ? { say: m.cancelled(), pending: null }
      : { say: m.sayYesNo(), pending: { ...pending, retries: pending.retries + 1 }, listenAgain: true });

    if (pending.type === 'confirmChange') {
      const yn = parseYesNo(t);
      if (yn === 'yes') {
        return { say: m.changed(pending.change.item.name, spokenTime(pending.change.to, ctx.lang)), pending: null, action: { type: 'changeTime', ...pending.change } };
      }
      if (yn === 'no') return { say: m.cancelled(), pending: null };
      return retry();
    }

    if (pending.type === 'confirmFieldEdit') {
      const yn = parseYesNo(t);
      if (yn === 'yes') {
        return { say: pending.confirmedText || (ctx.lang === 'mr' ? 'माहिती अपडेट केली.' : ctx.lang === 'hi' ? 'जानकारी अपडेट कर दी गई।' : 'Information updated.'), pending: null, action: pending.action };
      }
      if (yn === 'no') return { say: m.cancelled(), pending: null };
      return retry();
    }

    if (pending.type === 'chooseDone' || pending.type === 'changeItem') {
      const chosen = pickOption(t, pending.options);
      if (chosen) {
        if (pending.type === 'chooseDone') return { ...resolveDoneChoice(ctx, chosen), pending: undefined };
        const times = extractTimes(t).length ? extractTimes(t) : (pending.slots?.times || []);
        const slots = { item: { ...chosen.item, kind: chosen.kind } };
        if (times.length >= 2) { slots.fromParsed = times[0]; slots.toParsed = times[1]; } else if (times.length === 1) slots.toParsed = times[0];
        return stepChange(ctx, { ...pending.slots, ...slots });
      }
      if (parseYesNo(t) === 'no') return { say: m.cancelled(), pending: null };
      if (pending.retries >= 1) return { say: m.cancelled(), pending: null };
      return { say: m.askWhich(numbered(pending.options)), pending: { ...pending, retries: pending.retries + 1 }, listenAgain: true };
    }

    if (pending.type === 'changeFrom' || pending.type === 'changeTo') {
      const found = extractTimes(t);
      if (found.length) {
        const slots = { ...pending.slots };
        if (pending.type === 'changeFrom') {
          slots.fromParsed = found[0];
          if (found[1]) slots.toParsed = found[1];
        } else slots.toParsed = found[0];
        const res = stepChange(ctx, slots);
        // if "from" still can't be matched, ask again rather than loop silently
        return res;
      }
      if (parseYesNo(t) === 'no') return { say: m.cancelled(), pending: null };
      if (pending.retries >= 1) return { say: m.cancelled(), pending: null };
      return {
        say: pending.type === 'changeTo' ? m.askTime(pending.slots.item.name) : m.askFrom(pending.slots.item.name, itemTimes(pending.slots.item).map((x) => spokenTime(x, ctx.lang)).join(', ')),
        pending: { ...pending, retries: pending.retries + 1 }, listenAgain: true,
      };
    }
  }


  // App-wide navigation commands (English, Hindi, Marathi).
  // Navigation is handled before routine/medicine intent parsing.
  const navRules = [
    { route: 'Dashboard', words: ['dashboard', 'home', 'डैशबोर्ड', 'होम', 'मुख्य पृष्ठ', 'मुख्य स्क्रीन', 'मुख्यपृष्ठ'] },
    { route: 'Profile', words: ['profile', 'प्रोफाइल', 'प्रोफ़ाइल', 'माझी माहिती', 'मेरी प्रोफाइल'] },
    { route: 'Routine', words: ['routine', 'routines', 'daily routine', 'दिनचर्या', 'दिनक्रम', 'दैनिक दिनचर्या', 'दिनचर्या खोलो', 'दिनक्रम उघडा'] },
    { route: 'Medicine', words: ['medicine', 'medicines', 'medication', 'दवा', 'दवाइयाँ', 'औषध', 'औषधे', 'गोळ्या'] },
    { route: 'Contacts', words: ['emergency contacts', 'contacts', 'contact', 'आपातकालीन संपर्क', 'संपर्क', 'आपत्कालीन संपर्क'] },
    { route: 'Review', words: ['review', 'review setup', 'समीक्षा', 'तपासणी', 'सेटअप तपासा'] },
    { route: 'Caregiver', words: ['caregiver', 'family care', 'care dashboard', 'देखभालकर्ता', 'कुटुंबाची काळजी'] },
  ];
  const wantsNavigation = /\b(go to|open|show|take me to|navigate to)\b/.test(t) ||
    ['खोलो', 'खोल', 'उघडा', 'उघड', 'जा', 'दाखवा', 'ले चलो', 'पर ले चलो'].some(w => t.includes(w));
  if (wantsNavigation) {
    const rule = navRules.find(r => r.words.some(w => t.includes(w)));
    if (rule) return { say: ctx.lang === 'mr' ? 'ठीक आहे, उघडत आहे.' : ctx.lang === 'hi' ? 'ठीक है, खोल रहा हूँ।' : 'Okay, opening it.', pending: null, action: { type: 'navigate', route: rule.route } };
  }

  // Simple field edits are confirmed before changing stored personal information.
  
  // Answer medicine timing questions directly from saved schedule.
  // Do not depend on Gemini for factual medicine times.
  const asksMedicineTiming =
    /(medicine|medicines|medication|tablet|tablets|दवा|दवाई|दवाइयाँ|औषध|औषधे|गोळी|गोळ्या)/i.test(t) &&
    /(time|timing|schedule|when|कब|समय|वक्त|वेळ|कधी|वेळा|किती वाजता)/i.test(t);

  if (asksMedicineTiming) {
    const medicines = ctx.doses;

    if (!medicines.length) {
      return {
        say: ctx.lang === 'mr'
          ? 'आजसाठी औषधांची वेळापत्रकात नोंद नाही.'
          : ctx.lang === 'hi'
            ? 'आज के लिए कोई दवा समय-सारणी में दर्ज नहीं है।'
            : 'No medicines are scheduled for today.',
        pending: null,
      };
    }

    const details = medicines.map((dose) =>
      `${dose.name} at ${spokenTime(dose.time, ctx.lang)}`
    );

    return {
      say: ctx.lang === 'mr'
        ? `तुमच्या औषधांच्या वेळा: ${details.join('. ')}`
        : ctx.lang === 'hi'
          ? `आपकी दवाइयों का समय: ${details.join('. ')}`
          : `Your medicine timings are: ${details.join('. ')}.`,
      pending: null,
      listenAgain: false,
    };
  }

  const fieldRules = [
    { target: 'profile', field: 'phone', labels: ['phone number', 'phone', 'mobile', 'फोन नंबर', 'मोबाइल', 'फोन', 'फोन क्रमांक'] },
    { target: 'profile', field: 'name', labels: ['my name', 'name', 'नाव', 'नाम'] },
    { target: 'profile', field: 'address', labels: ['address', 'location', 'पत्ता', 'पता'] },
    { target: 'profile', field: 'age', labels: ['age', 'वय', 'उम्र'] },
    { target: 'profile', field: 'allergies', labels: ['allergies', 'allergy', 'अॅलर्जी', 'एलर्जी'] },
    { target: 'profile', field: 'conditions', labels: ['medical condition', 'health condition', 'आजार', 'बीमारी'] },
    { target: 'contacts', field: 'phone', labels: ['emergency phone', 'contact phone', 'primary contact number', 'आपत्कालीन फोन', 'संपर्काचा फोन'] },
  ];
  const editVerb = ['change', 'update', 'set', 'make my', 'बदला', 'बदल', 'बदला', 'बदलून', 'अपडेट', 'करा', 'बदलायचा'];
  if (editVerb.some(w => t.includes(w))) {
    for (const rule of fieldRules) {
      const label = rule.labels.find(w => t.includes(w));
      if (!label) continue;
      const valueMatch = t.match(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+(?:to|as|is|करून|करा|है|है कि|आहे|नंबर)\\s+(.+)$', 'i'));
      let value = valueMatch?.[1]?.trim();
      if (!value) {
        const parts = t.split(label);
        value = parts[1]?.replace(/^(?:to|as|is|करून|करा|है|आहे|नंबर)\\s*/i, '').trim();
      }
      if (!value) continue;
      value = value.replace(/[.!?।]+$/, '').trim();
      const action = rule.target === 'profile'
        ? { type: 'updateProfileField', field: rule.field, value }
        : { type: 'updateContactField', field: rule.field, value };
      const confirm = ctx.lang === 'mr' ? `${rule.field === 'phone' ? 'फोन नंबर' : rule.field} ${value} असा बदलू का? होय किंवा नाही म्हणा.`
        : ctx.lang === 'hi' ? `${rule.field === 'phone' ? 'फ़ोन नंबर' : rule.field} ${value} करना है? हाँ या नहीं कहें।`
        : `Change ${rule.field} to ${value}? Say yes or no.`;
      return { say: confirm, pending: { type: 'confirmFieldEdit', action, confirmedText: ctx.lang === 'mr' ? 'माहिती अपडेट केली.' : ctx.lang === 'hi' ? 'जानकारी अपडेट कर दी गई।' : 'Information updated.', retries: 0 } };
    }
  }

  const cmd = parseCommand(t, { routines: ctx.routines, medicines: ctx.medicines });
  let result;
  switch (cmd.intent) {
    case 'done': result = handleDone(ctx, cmd); break;
    case 'change': {
  const changeCmd = parseCommand(text, {
    routines: ctx.allRoutines,
    medicines: ctx.allMedicines,
  });
  result = handleChange(ctx, changeCmd);
  break;
}
    case 'readout': result = { say: buildBriefing(env, { greet: false }) }; break;
    case 'unclear-item': result = { say: m.unknown() }; break;
    default: result = { say: m.unknown() };
  }
  return { pending: null, ...result, listenAgain: Boolean(result.pending) };
}

// Used by the UI to apply a change-time action to stored data.
export function applyTimeChange(items, change) {
  const { item, from, to } = change;
  return items.map((x) => {
    if (String(x._id) !== String(item._id)) return x;
    if (item.kind === 'routine') return { ...x, time: to };
    const times = splitTimes(x.times).map((t) => (timeToMinutes(t) === timeToMinutes(from) ? to : t));
    const unique = [...new Set(times)].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
    return { ...x, times: unique.join(', ') };
  });
}

// ------------------------------------------------------------------ notifications read aloud
const NOTE = {
  en: {
    routine: (n, t, m = 5) => `Reminder. ${n} is coming up in ${m} ${m === 1 ? 'minute' : 'minutes'}, at ${t}.`,
    medicine: (n, d, t) => `Medicine reminder. It is time for ${n}${d ? `, ${d}` : ''}. Please follow your prescribed instructions.`,
  },
  hi: {
    routine: (n, t, m = 5) => `याद दिलाना। ${n} का समय ${m} मिनट में है, ${t}।`,
    medicine: (n, d, t) => `दवा का समय हो गया है: ${n}${d ? `, ${d}` : ''}। कृपया डॉक्टर के बताए अनुसार लीजिए।`,
  },
  mr: {
    routine: (n, t, m = 5) => `आठवण. ${n} ची वेळ ${m} मिनिटांत आहे, ${t}.`,
    medicine: (n, d, t) => `औषधाची वेळ झाली आहे: ${n}${d ? `, ${d}` : ''}. कृपया डॉक्टरांनी सांगितल्याप्रमाणे घ्या.`,
  },
};

const WAKE_WORDS = ['wake', 'get up', 'getup', 'उठ', 'जाग', 'जागे'];
export const isWakeRoutine = (routine) => {
  const n = normalize(routine?.name || '');
  return WAKE_WORDS.some((w) => n.includes(w));
};

// What to say out loud when a Saathi notification arrives / is tapped.
export function notificationSpeech(data, env) {
  const lang = env.language || 'en';
  const N = NOTE[lang] || NOTE.en;
  if (!data) return '';
  if (data.saathiRoutineReminder) {
    const routine = (env.routines || []).find((r) => String(r._id) === String(data.routineId));
    // Wake-up reminder: greet and read the day plan.
    if (routine && isWakeRoutine(routine)) return buildBriefing(env, { greet: true });
    const name = data.name || routine?.name;
    const time = data.time || routine?.time;
    return name ? N.routine(name, spokenTime(time, lang), Number(data.minutes) || 5) : '';
  }
  if (data.saathiMedicineReminder) {
    const medicine = (env.medicines || []).find((m) => String(m._id) === String(data.medicineId));
    const name = data.name || medicine?.name;
    return name ? N.medicine(name, data.dosage || medicine?.dosage || '', spokenTime(data.time, lang)) : '';
  }
  return '';
}

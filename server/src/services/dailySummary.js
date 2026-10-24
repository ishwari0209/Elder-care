// Builds a caregiver's daily summary from the elder's schedule + user-reported
// completions. All numbers are computed here (never guessed), and the wording
// comes from fixed templates, so no personal data is sent to any AI service.

const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const GRACE_MINUTES = 60; // a slot is "due now" for 1 hour before it counts as no response
const MAX_LIST = 4;

function parseTimeToMinutes(value) {
  const m = String(value || '').trim().match(/^(\d{1,2})[:.](\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const p = m[3] && m[3].toUpperCase();
  if (min > 59) return null;
  if (p) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (p === 'PM' ? 12 : 0);
  } else if (h > 23) return null;
  return h * 60 + min;
}

function weekdayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return WEEK[new Date(y, m - 1, d, 12).getDay()];
}

function runsOn(item, date, weekday) {
  if (item.start && date < item.start) return false;
  if (item.end && date > item.end) return false;
  const days = Array.isArray(item.days) ? item.days : [];
  return !days.length || days.includes(weekday);
}

const TEXT = {
  English: {
    good: (n) => `${n} is on track today.`,
    attention: (n) => `It would be good to check in with ${n}.`,
    info: (n) => `Nothing is scheduled for ${n} today.`,
    meds: (d, t) => `Medicines: ${d} of ${t} doses confirmed.`,
    routines: (d, t) => `Routines: ${d} of ${t} done.`,
    noResponse: (l) => `Time has passed, not confirmed: ${l}.`,
    notDone: (l) => `Marked as not done: ${l}.`,
    due: (l) => `Due now: ${l}.`,
    next: (l) => `Coming up: ${l}.`,
    more: (n) => `and ${n} more`,
    footer: (n) => `Based on what ${n} recorded in the app. Not a medical assessment.`,
  },
  Hindi: {
    good: (n) => `आज ${n} की दिनचर्या ठीक चल रही है।`,
    attention: (n) => `${n} से हालचाल पूछना बेहतर होगा।`,
    info: (n) => `आज ${n} के लिए कुछ निर्धारित नहीं है।`,
    meds: (d, t) => `दवाइयाँ: ${t} में से ${d} खुराक की पुष्टि हुई।`,
    routines: (d, t) => `दिनचर्या: ${t} में से ${d} पूरी हुईं।`,
    noResponse: (l) => `समय निकल चुका, पुष्टि नहीं हुई: ${l}।`,
    notDone: (l) => `"नहीं किया" चिह्नित: ${l}।`,
    due: (l) => `अभी समय है: ${l}।`,
    next: (l) => `आगे: ${l}।`,
    more: (n) => `और ${n}`,
    footer: (n) => `यह जानकारी ${n} द्वारा ऐप में दर्ज की गई बातों पर आधारित है। यह चिकित्सीय आकलन नहीं है।`,
  },
  Marathi: {
    good: (n) => `आज ${n} यांची दिनचर्या व्यवस्थित सुरू आहे.`,
    attention: (n) => `${n} यांची विचारपूस करणे चांगले ठरेल.`,
    info: (n) => `आज ${n} यांच्यासाठी काहीही नियोजित नाही.`,
    meds: (d, t) => `औषधे: ${t} पैकी ${d} डोसची खात्री झाली.`,
    routines: (d, t) => `दिनचर्या: ${t} पैकी ${d} पूर्ण.`,
    noResponse: (l) => `वेळ निघून गेली, खात्री नाही: ${l}.`,
    notDone: (l) => `"केले नाही" म्हणून नोंद: ${l}.`,
    due: (l) => `आता वेळ आहे: ${l}.`,
    next: (l) => `पुढे: ${l}.`,
    more: (n) => `आणखी ${n}`,
    footer: (n) => `ही माहिती ${n} यांनी अॅपमध्ये केलेल्या नोंदींवर आधारित आहे. हे वैद्यकीय मूल्यमापन नाही.`,
  },
};

function joinLimited(slots, tx) {
  const shown = slots.slice(0, MAX_LIST).map((s) => `${s.name} (${s.time})`);
  if (slots.length > MAX_LIST) shown.push(tx.more(slots.length - MAX_LIST));
  return shown.join(', ');
}

function emptyCounts() {
  return { scheduled: 0, done: 0, notDone: 0, noResponse: 0, due: 0, upcoming: 0 };
}

function buildDailySummary({ elderName, routines, medicines, completions, date, nowMinutes, language }) {
  const tx = TEXT[language] || TEXT.English;
  const weekday = weekdayOf(date);
  const firstName = String(elderName || '').trim().split(/\s+/)[0] || 'Saathi user';

  const records = new Map(
    (completions || []).map((c) => [`${c.itemType}|${String(c.itemId)}|${c.time || ''}`, c.reportedDone])
  );

  const slots = [];
  for (const r of routines || []) {
    if (!runsOn(r, date, weekday)) continue;
    slots.push({ type: 'routine', id: String(r._id), name: r.name, time: r.time || '' });
  }
  for (const m of medicines || []) {
    if (!runsOn(m, date, weekday)) continue;
    String(m.times || '').split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean).forEach((time) => {
      slots.push({ type: 'medicine', id: String(m._id), name: m.name, time });
    });
  }

  const counts = { medicine: emptyCounts(), routine: emptyCounts() };

  for (const s of slots) {
    const record = records.get(`${s.type}|${s.id}|${s.time}`);
    const at = parseTimeToMinutes(s.time);
    if (record === true) s.status = 'done';
    else if (record === false) s.status = 'notDone';
    else if (at === null || at > nowMinutes) s.status = 'upcoming';
    else if (nowMinutes - at <= GRACE_MINUTES) s.status = 'due';
    else s.status = 'noResponse';
    s.minutes = at === null ? 1e9 : at;
    counts[s.type].scheduled += 1;
    counts[s.type][s.status] += 1;
  }

  slots.sort((a, b) => a.minutes - b.minutes);

  const total = counts.medicine.scheduled + counts.routine.scheduled;
  const needsAttention = counts.medicine.noResponse + counts.medicine.notDone +
    counts.routine.noResponse + counts.routine.notDone;

  let level = 'info';
  if (needsAttention > 0) level = 'attention';
  else if (total > 0 && slots.some((s) => s.status === 'done')) level = 'good';

  const pick = (type, status) => slots.filter((s) => s.type === type && s.status === status);
  const lines = [];

  for (const [type, label] of [['medicine', 'meds'], ['routine', 'routines']]) {
    const c = counts[type];
    if (!c.scheduled) continue;
    lines.push(tx[label](c.done, c.scheduled));
    if (c.noResponse) lines.push(tx.noResponse(joinLimited(pick(type, 'noResponse'), tx)));
    if (c.notDone) lines.push(tx.notDone(joinLimited(pick(type, 'notDone'), tx)));
    if (c.due) lines.push(tx.due(joinLimited(pick(type, 'due'), tx)));
  }

  const upcoming = slots.filter((s) => s.status === 'upcoming');
  if (upcoming.length) lines.push(tx.next(joinLimited(upcoming.slice(0, MAX_LIST + 1), tx)));
  lines.push(tx.footer(firstName));

  return {
    date,
    level,
    headline: level === 'good' ? tx.good(firstName) : level === 'attention' ? tx.attention(firstName) : tx.info(firstName),
    lines,
    counts,
    slots: slots.map(({ type, name, time, status }) => ({ type, name, time, status })),
  };
}

module.exports = { buildDailySummary, parseTimeToMinutes };

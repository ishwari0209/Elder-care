// Shared schedule helpers used by the dashboard AND the voice assistant,
// so both follow exactly the same rules.

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getLocalDate(now = new Date()) {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

// Supports 12:40 PM, 12.40 PM, and 24-hour times such as 13:20.
export function getScheduledDate(time, now) {
  const match = String(time || '').trim().match(/^(\d{1,2})[:.](\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]?.toUpperCase();
  if (minute > 59) return null;
  if (period) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (period === 'PM' ? 12 : 0);
  } else if (hour > 23) {
    return null;
  }
  const scheduled = new Date(now);
  scheduled.setHours(hour, minute, 0, 0);
  return scheduled;
}

export function timeToMinutes(value) {
  const d = getScheduledDate(value, new Date(2000, 0, 1));
  return d ? d.getHours() * 60 + d.getMinutes() : Number.MAX_SAFE_INTEGER;
}

// A routine can be marked from 30 minutes before its time; later is "missed" but still allowed.
export function getCompletionWindow(time, now) {
  const scheduled = getScheduledDate(time, now);
  if (!scheduled) return { available: true, missed: false, late: false };
  const opensAt = scheduled.getTime() - 30 * 60 * 1000;
  const closesAt = scheduled.getTime() + 30 * 60 * 1000;
  const current = now.getTime();
  return {
    available: current >= opensAt && current < closesAt,
    missed: current >= closesAt,
    late: current >= closesAt,
  };
}

// Routines that apply today (respects the "repeat days" setting).
export function todaysRoutines(routines, now = new Date()) {
  const todayName = DAY_NAMES[now.getDay()];
  return (Array.isArray(routines) ? routines : [])
    .filter((r) => {
      const days = Array.isArray(r.days) && r.days.length ? r.days : null;
      return !days || days.includes(todayName);
    })
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

// Medicines that apply today (start/end date, status and repeat days).
export function todaysMedicines(medicines, now = new Date()) {
  const todayString = getLocalDate(now);
  const todayName = DAY_NAMES[now.getDay()];
  return (Array.isArray(medicines) ? medicines : []).filter((m) => {
    const start = m.start || '';
    const end = m.end || '';
    const days = Array.isArray(m.days) && m.days.length ? m.days : null;
    return !(start && start > todayString) &&
      !(end && end < todayString) &&
      m.status !== 'Expired' &&
      !(days && !days.includes(todayName));
  });
}

export function splitTimes(times) {
  return String(times || '').split(',').map((t) => t.trim()).filter(Boolean);
}

// One entry per medicine per time, sorted by time.
export function buildDoses(medicines) {
  return (medicines || [])
    .flatMap((m) =>
      splitTimes(m.times).map((time) => ({
        key: `${m._id}|${m.name}|${time}`,
        itemId: m._id,
        name: m.name,
        dosage: m.dosage,
        time,
      }))
    )
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

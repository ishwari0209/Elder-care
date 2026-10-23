// Helpers to work out which weekdays fall between a start and end date.
export const WEEK_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const JS_TO_NAME = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));

const toDate = (v) => {
  const [y, m, d] = String(v).split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
};

// Returns the weekday names (Mon..Sun order) that occur from start to end.
// - no end date: ongoing, so every weekday is available
// - start..end of 1 day: only that weekday; 2 days: those 2 weekdays, etc.
export function availableDays(start, end) {
  if (!isDate(end)) return [...WEEK_ORDER];
  const from = isDate(start) ? toDate(start) : new Date();
  from.setHours(12, 0, 0, 0);
  const to = toDate(end);
  if (to < from) return [];

  const found = new Set();
  const cursor = new Date(from);
  for (let i = 0; i < 7 && cursor <= to; i++) {
    found.add(JS_TO_NAME[cursor.getDay()]);
    cursor.setDate(cursor.getDate() + 1);
  }
  return WEEK_ORDER.filter((d) => found.has(d));
}

// Keep the user's selection valid when the date range changes.
export function reconcileDays(prevDays, prevStart, prevEnd, nextStart, nextEnd) {
  const prevAvail = availableDays(prevStart, prevEnd);
  const nextAvail = availableDays(nextStart, nextEnd);
  const prev = Array.isArray(prevDays) ? prevDays : [];
  const hadAll = prevAvail.length > 0 && prevAvail.every((d) => prev.includes(d));
  if (hadAll) return nextAvail; // everything was ticked -> tick everything available
  const kept = prev.filter((d) => nextAvail.includes(d));
  return kept.length ? kept : nextAvail;
}

// Privacy filter for prescription text. ALLOWLIST approach: a line is kept only
// if it looks like a medicine line, so patient / doctor / clinic / address lines
// never survive. Phone numbers, emails and URLs are stripped from kept lines too.

const FORM = /^\s*(?:\d{1,2}\s*[).\-:]\s*)?(?:tab(?:let)?s?|cap(?:sule)?s?|syp|syrup|inj(?:ection)?|oint(?:ment)?|drops?|susp(?:ension)?|gel|cream|lotion|sachet|inhaler)\b\.?/i;
const STRENGTH = /\d+(?:\.\d+)?\s*(?:mg|mcg|µg|ug|ml|iu|g)\b/i;
const FREQ_DASH = /\b[0-4](?:\.5)?\s*[-–]\s*[0-4](?:\.5)?\s*[-–]\s*[0-4](?:\.5)?(?:\s*[-–]\s*[0-4])?\b/;
const FREQ_WORD = /\b(?:od|qd|bd|bid|tds|tid|qid|hs|sos|prn|once daily|twice daily|thrice daily|at night|bedtime|after food|before food|with food|empty stomach)\b/i;
const DURATION = /\b(?:x|for)\s*\d{1,3}\s*(?:days?|weeks?|wks?|months?)\b/i;

// Lines that identify a person or place. Always dropped.
const IDENTITY = /\b(?:dr|doctor|reg|regd|clinic|hospital|patient|pt|name|age|sex|gender|address|phone|ph|mob|mobile|tel|contact|email|e-mail|date|dob|weight|wt|bp|signature|sign)\b\s*[.:]?|\bmr\.|\bmrs\.|\bms\.|\bm\.?b\.?b\.?s\b|\bmd\b|@|https?:\/\/|www\./i;

function looksLikeMedicineLine(line) {
  return (
    FORM.test(line) ||
    STRENGTH.test(line) ||
    FREQ_DASH.test(line) ||
    FREQ_WORD.test(line) ||
    DURATION.test(line)
  );
}

function scrub(line) {
  return line
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\+?\d[\d\s\-().]{6,}\d/g, (m) => (m.replace(/\D/g, '').length >= 7 ? ' ' : m))
    .replace(/\s+/g, ' ')
    .trim();
}

function redactLines(lines, { maxLines = 30, maxLength = 150 } = {}) {
  const out = [];
  const seen = new Set();

  for (const raw of Array.isArray(lines) ? lines : []) {
    if (typeof raw !== 'string') continue;
    const line = scrub(raw.slice(0, 400));
    if (!line || line.length > maxLength) continue;
    if (IDENTITY.test(line)) continue;
    if (!looksLikeMedicineLine(line)) continue;

    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
    if (out.length >= maxLines) break;
  }
  return out;
}

module.exports = { redactLines };


const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authMiddleware = require('../middleware/authMiddleware');
const {
  generateSaathiResponse,
  extractMedicinesFromText,
} = require('../services/aiService');
const { redactLines } = require('../utils/redact');

const router = express.Router();

router.use(authMiddleware);

// POST /api/ai/chat
router.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const { message, language, context } = req.body || {};

    if (
      typeof message !== 'string' ||
      !message.trim() ||
      message.length > 2000
    ) {
      return res.status(400).json({
        message: 'Please provide a message under 2000 characters.',
      });
    }

    const allowedLanguages = ['English', 'Hindi', 'Marathi'];

    const selectedLanguage = allowedLanguages.includes(language)
      ? language
      : 'English';

    const safeContext =
      context &&
      typeof context === 'object' &&
      !Array.isArray(context)
        ? {
            profile: context.profile ?? {},
            routines: Array.isArray(context.routines)
              ? context.routines.slice(0, 50)
              : [],
            medicines: Array.isArray(context.medicines)
              ? context.medicines.slice(0, 50)
              : [],
          }
        : {};

    const answer = await generateSaathiResponse({
      message: message.trim(),
      language: selectedLanguage,
      context: safeContext,
    });

    return res.json({ answer });
  })
);


// --- simple per-user rate limit for the prescription endpoint (10 / hour) ---
const scanHits = new Map();
function scanAllowed(userId) {
  const now = Date.now();
  const recent = (scanHits.get(userId) || []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= 10) {
    scanHits.set(userId, recent);
    return false;
  }
  recent.push(now);
  scanHits.set(userId, recent);
  return true;
}

// POST /api/ai/prescription-text
// Receives TEXT ONLY (already read on the phone). It is redacted again here,
// is never stored or logged, and no image ever reaches the server.
router.post(
  '/prescription-text',
  asyncHandler(async (req, res) => {
    const { lines, language } = req.body || {};

    if (!Array.isArray(lines) || lines.length > 60) {
      return res.status(400).json({ message: 'Please send the text lines to read.' });
    }

    if (!scanAllowed(String(req.user.id))) {
      return res.status(429).json({ message: 'Too many scans. Please try again later.' });
    }

    const safeLines = redactLines(lines);

    if (!safeLines.length) {
      return res.json({ medicines: [] });
    }

    const selectedLanguage = ['English', 'Hindi', 'Marathi'].includes(language)
      ? language
      : 'English';

    try {
      const medicines = await extractMedicinesFromText({
        lines: safeLines,
        language: selectedLanguage,
      });
      return res.json({ medicines });
    } catch (error) {
      // Deliberately generic: never echo prescription text into logs or responses.
      console.error('Prescription AI failed:', error.message);
      return res.status(502).json({ message: 'AI could not read the prescription.' });
    }
  })
);

module.exports = router;

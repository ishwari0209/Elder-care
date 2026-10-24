
const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authMiddleware = require('../middleware/authMiddleware');
const {
  generateSaathiResponse,
  extractMedicinesFromText,
  companionReply,
} = require('../services/aiService');
const { detectRisk, fixedResponse } = require('../utils/safety');
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


// --- per-user rate limit for the companion chat (60 messages / hour) ---
const chatHits = new Map();
function chatAllowed(userId) {
  const now = Date.now();
  const recent = (chatHits.get(userId) || []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= 60) {
    chatHits.set(userId, recent);
    return false;
  }
  recent.push(now);
  chatHits.set(userId, recent);
  return true;
}

// Remove phone numbers / emails the user might type before text goes to the AI.
const scrubPersonal = (text) =>
  String(text)
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email removed]')
    .replace(/\+?\d[\d\s\-().]{6,}\d/g, (m) => (m.replace(/\D/g, '').length >= 7 ? '[number removed]' : m))
    .trim();

// POST /api/ai/companion  -> { reply, actions, lang }
// Free conversation (health worries, loneliness, boredom...). Emergencies and
// self-harm are answered by fixed safe messages, never left to the AI model.
router.post(
  '/companion',
  asyncHandler(async (req, res) => {
    const { messages, language, profile } = req.body || {};

    if (!Array.isArray(messages) || !messages.length || messages.length > 14) {
      return res.status(400).json({ message: 'Please send the conversation messages.' });
    }

    const clean = messages
      .filter((m) => m && ['user', 'assistant'].includes(m.role) && typeof m.text === 'string' && m.text.trim())
      .map((m) => ({ role: m.role, text: scrubPersonal(m.text.slice(0, 1000)) }))
      .filter((m) => m.text);

    if (!clean.length || clean[clean.length - 1].role !== 'user') {
      return res.status(400).json({ message: 'The last message must be from the user.' });
    }

    const selectedLanguage = ['English', 'Hindi', 'Marathi'].includes(language) ? language : 'English';

    // Safety first: does not depend on the AI and does not count against the limit.
    const risk = detectRisk(messages[messages.length - 1].text);
    if (risk) {
      return res.json(fixedResponse(risk, selectedLanguage));
    }

    if (!chatAllowed(String(req.user.id))) {
      return res.status(429).json({ message: 'You have chatted a lot. Please try again in a while.' });
    }

    const safeProfile = {
      name: String(profile?.name || '').trim().split(/\s+/)[0].slice(0, 40),
      age: String(profile?.age || '').slice(0, 5),
      notes: String(profile?.notes || '').slice(0, 300),
      hasFamily: Boolean(profile?.hasFamily),
      familyRelation: String(profile?.familyRelation || '').slice(0, 40),
      hasDoctor: Boolean(profile?.hasDoctor),
    };

    try {
      const result = await companionReply({
        messages: clean.slice(-12),
        language: selectedLanguage,
        profile: safeProfile,
      });
      return res.json(result);
    } catch (error) {
      // Deliberately generic: never echo the conversation into logs or responses.
      console.error('Companion AI failed:', error.message);
      return res.status(502).json({ message: 'Saathi could not reply right now.' });
    }
  })
);

module.exports = router;

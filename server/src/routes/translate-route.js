// FREE translation route using Google Gemini (free tier). No SDK needed (Node 18+).
//
// 1) Get a free key: https://aistudio.google.com/apikey   (no credit card)
// 2) On Render: add env var GEMINI_API_KEY=your_key
// 3) In your Express app:
//      const translateRoute = require('./translate-route');
//      app.use('/api/ai', authMiddleware, translateRoute);   // same auth as /api/ai/chat
//
// Translations are cached in memory on the server, so each string is sent to Gemini
// only ONCE per language for ALL users. This keeps usage far below the free limits.
// (Render free tier restarts clear this cache; it just refills. Optional: persist it in MongoDB.)
const express = require('express');
const router = express.Router();

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const cache = new Map(); // key: `${language}|${english}` -> translated

async function callGemini(texts, language) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const body = {
    systemInstruction: {
      parts: [{
        text:
          `You translate UI text for Saathi, an app for elderly people (medicines, routines, family care). ` +
          `Translate each English string into ${language}. Use simple, warm, everyday words an elderly person understands. ` +
          `Keep {placeholders}, numbers, emojis and brand names (Saathi, Google, SOS, AI) unchanged. ` +
          `Return a JSON array of strings, same length and order as the input.`,
      }],
    },
    contents: [{ role: 'user', parts: [{ text: JSON.stringify(texts) }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: { type: 'ARRAY', items: { type: 'STRING' } },
    },
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}`);
  const data = await r.json();
  const raw = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '[]';
  const out = JSON.parse(raw.replace(/```json|```/g, '').trim());
  if (!Array.isArray(out) || out.length !== texts.length) throw new Error('Bad AI output');
  return out.map(String);
}

router.post('/translate', async (req, res) => {
  try {
    const { texts, language } = req.body || {};
    if (!Array.isArray(texts) || !texts.length || texts.length > 80 || typeof language !== 'string' || language.length > 40)
      return res.status(400).json({ message: 'Invalid request' });
    const clean = texts.map((t) => String(t).slice(0, 500));

    // Serve from cache; only ask Gemini for what is missing.
    const result = new Array(clean.length);
    const missing = [];
    clean.forEach((t, i) => {
      const hit = cache.get(`${language}|${t}`);
      if (hit) result[i] = hit; else missing.push(i);
    });

    if (missing.length) {
      const translated = await callGemini(missing.map((i) => clean[i]), language);
      missing.forEach((idx, j) => {
        result[idx] = translated[j];
        cache.set(`${language}|${clean[idx]}`, translated[j]);
      });
    }
    res.json({ translations: result });
  } catch (e) {
    res.status(502).json({ message: 'Translation unavailable' });
  }
});

module.exports = router;

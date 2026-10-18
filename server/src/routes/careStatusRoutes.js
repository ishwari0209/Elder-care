
const express = require('express');
const authMiddleware = require("../middleware/authMiddleware");
const Profile = require('../models/Profile');
const Routine = require('../models/Routine');
const Medicine = require('../models/Medicine');
const EmergencyContacts = require('../models/EmergencyContacts');
const Completion = require('../models/Completion');
const asyncHandler = require('../middleware/asyncHandler');
const router = express.Router();
router.use(authMiddleware);
router.get('/', asyncHandler(async (req, res) => {
  const today = typeof req.query.date === 'string' ? req.query.date : new Date().toISOString().slice(0, 10);
  const userId = req.user.id;
  const [profile, routines, medicines, contacts, completions] = await Promise.all([
    Profile.findOne({ userId }),
    Routine.find({ userId }).sort({ time: 1 }),
    Medicine.find({ userId }).sort({ createdAt: -1 }),
    EmergencyContacts.findOne({ userId }),
    Completion.find({ userId, date: today })
  ]);
  res.json({ date: today, profile: profile || null, routines, medicines, emergencyContacts: contacts || null, completions });
}));
module.exports = router;

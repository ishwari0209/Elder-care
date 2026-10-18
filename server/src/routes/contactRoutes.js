
const express = require('express');
const authMiddleware = require("../middleware/authMiddleware");
const EmergencyContacts = require('../models/EmergencyContacts');
const asyncHandler = require('../middleware/asyncHandler');
const router = express.Router();
router.use(authMiddleware);
router.get('/', asyncHandler(async (req, res) => res.json(await EmergencyContacts.findOne({ userId: req.user.id }) || {})));
router.post('/', asyncHandler(async (req, res) => {
  const existing = await EmergencyContacts.findOne({ userId: req.user.id });
  if (existing) return res.status(409).json({ message: 'Contacts already exist. Use PUT to update.' });
  res.status(201).json({ message: 'Emergency contacts saved successfully', contacts: await EmergencyContacts.create({ ...req.body, userId: req.user.id }) });
}));
router.put('/', asyncHandler(async (req, res) => {
  const { userId, _id, ...updates } = req.body;
  const contacts = await EmergencyContacts.findOneAndUpdate({ userId: req.user.id }, { ...updates, userId: req.user.id }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
  res.json({ message: 'Emergency contacts saved successfully', contacts });
}));
module.exports = router;

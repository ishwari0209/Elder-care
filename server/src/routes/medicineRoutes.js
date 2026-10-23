
const express = require('express');
const authMiddleware = require("../middleware/authMiddleware");
const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const asyncHandler = require('../middleware/asyncHandler');
const router = express.Router();
router.use(authMiddleware);
const validId = (id) => mongoose.isValidObjectId(id);

router.get('/', asyncHandler(async (req, res) => {
  const today = new Date();
  const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');

  // Mark medicines as expired without deleting their records.
  await Medicine.updateMany(
    {
      userId: req.user.id,
      end: { $ne: '', $lt: localToday },
      status: { $ne: 'Expired' },
    },
    { $set: { status: 'Expired' } }
  );

  // Return all medicines so the app can access medication history.
  const medicines = await Medicine.find({
    userId: req.user.id,
  }).sort({ createdAt: -1 });

  res.json(medicines);
}));
router.post('/', asyncHandler(async (req, res) => res.status(201).json({ message: 'Medicine schedule created successfully', medicine: await Medicine.create({ ...req.body, userId: req.user.id }) })));
router.put('/sync/all', asyncHandler(async (req, res) => {
  if (!Array.isArray(req.body.items)) return res.status(400).json({ message: 'items must be an array' });
  const items = req.body.items.map(({ _id, userId, ...item }) => ({ ...item, userId: req.user.id }));
  await Medicine.deleteMany({ userId: req.user.id });
  const medicines = items.length ? await Medicine.insertMany(items) : [];
  res.json({ medicines });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid medicine ID' });
  }

  const { userId, _id, status, ...updates } = req.body;

  // Never allow the client to set or reset expiry status directly.
  const medicine = await Medicine.findOne({
    _id: req.params.id,
    userId: req.user.id,
  });

  if (!medicine) {
    return res.status(404).json({ message: 'Medicine schedule not found' });
  }

  Object.assign(medicine, updates);

  // Recalculate status from the end date using Indian local date.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.APP_TIME_ZONE || 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const values = {};
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }

  const today = `${values.year}-${values.month}-${values.day}`;

  medicine.status =
    medicine.end && medicine.end < today ? 'Expired' : 'Active';

  await medicine.save();

  res.json({
    message: 'Medicine schedule updated successfully',
    medicine,
  });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid medicine ID' });
  const medicine = await Medicine.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!medicine) return res.status(404).json({ message: 'Medicine schedule not found' });
  res.json({ message: 'Medicine schedule deleted successfully' });
}));
module.exports = router;

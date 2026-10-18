
const express = require('express');
const authMiddleware = require("../middleware/authMiddleware");
const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const asyncHandler = require('../middleware/asyncHandler');
const router = express.Router();
router.use(authMiddleware);
const validId = (id) => mongoose.isValidObjectId(id);

router.get('/', asyncHandler(async (req, res) => res.json(await Medicine.find({ userId: req.user.id }).sort({ createdAt: -1 }))));
router.post('/', asyncHandler(async (req, res) => res.status(201).json({ message: 'Medicine schedule created successfully', medicine: await Medicine.create({ ...req.body, userId: req.user.id }) })));
router.put('/sync/all', asyncHandler(async (req, res) => {
  if (!Array.isArray(req.body.items)) return res.status(400).json({ message: 'items must be an array' });
  const items = req.body.items.map(({ _id, userId, ...item }) => ({ ...item, userId: req.user.id }));
  await Medicine.deleteMany({ userId: req.user.id });
  const medicines = items.length ? await Medicine.insertMany(items) : [];
  res.json({ medicines });
}));
router.put('/:id', asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid medicine ID' });
  const { userId, _id, ...updates } = req.body;
  const medicine = await Medicine.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, updates, { new: true, runValidators: true });
  if (!medicine) return res.status(404).json({ message: 'Medicine schedule not found' });
  res.json({ message: 'Medicine schedule updated successfully', medicine });
}));
router.delete('/:id', asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid medicine ID' });
  const medicine = await Medicine.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!medicine) return res.status(404).json({ message: 'Medicine schedule not found' });
  res.json({ message: 'Medicine schedule deleted successfully' });
}));
module.exports = router;


const express = require('express');
const authMiddleware = require("../middleware/authMiddleware");
const mongoose = require('mongoose');
const Routine = require('../models/Routine');
const asyncHandler = require('../middleware/asyncHandler');
const router = express.Router();
router.use(authMiddleware);
const validId = (id) => mongoose.isValidObjectId(id);

router.get('/', asyncHandler(async (req, res) => res.json(await Routine.find({ userId: req.user.id }).sort({ time: 1, createdAt: 1 }))));
router.post('/', asyncHandler(async (req, res) => res.status(201).json({ message: 'Routine created successfully', routine: await Routine.create({ ...req.body, userId: req.user.id }) })));
router.put('/sync/all', asyncHandler(async (req, res) => {
  if (!Array.isArray(req.body.items)) return res.status(400).json({ message: 'items must be an array' });
  const items = req.body.items.map(({ _id, userId, ...item }) => ({ ...item, userId: req.user.id }));
  await Routine.deleteMany({ userId: req.user.id });
  const routines = items.length ? await Routine.insertMany(items) : [];
  res.json({ routines });
}));
router.put('/:id', asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid routine ID' });
  const { userId, _id, ...updates } = req.body;
  const routine = await Routine.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, updates, { new: true, runValidators: true });
  if (!routine) return res.status(404).json({ message: 'Routine not found' });
  res.json({ message: 'Routine updated successfully', routine });
}));
router.delete('/:id', asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid routine ID' });
  const routine = await Routine.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!routine) return res.status(404).json({ message: 'Routine not found' });
  res.json({ message: 'Routine deleted successfully' });
}));
module.exports = router;

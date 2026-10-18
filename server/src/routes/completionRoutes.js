const express = require('express');
const authMiddleware = require("../middleware/authMiddleware");
const mongoose = require('mongoose');
const Completion = require('../models/Completion');
const asyncHandler = require('../middleware/asyncHandler');
const router = express.Router();
router.use(authMiddleware);
router.get('/', asyncHandler(async (req, res) => {
  const filter = { userId: req.user.id };
  if (req.query.date) filter.date = String(req.query.date);
  if (req.query.itemType) filter.itemType = String(req.query.itemType);
  res.json(await Completion.find(filter).sort({ date: -1, createdAt: -1 }));
}));

router.post('/', asyncHandler(async (req, res) => {
  const { itemType, itemId, date, time = '', reportedDone, note = '' } = req.body;
  if (!['routine', 'medicine'].includes(itemType)) return res.status(400).json({ message: 'itemType must be routine or medicine' });
  if (!mongoose.isValidObjectId(itemId)) return res.status(400).json({ message: 'A valid itemId is required' });
  if (!date || typeof reportedDone !== 'boolean') return res.status(400).json({ message: 'date and boolean reportedDone are required' });
  const record = await Completion.findOneAndUpdate(
    { userId: req.user.id, itemType, itemId, date, time },
    { userId: req.user.id, itemType, itemId, date, time, reportedDone, note },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  res.status(200).json({ message: 'User-reported completion saved', completion: record });
}));
module.exports = router;

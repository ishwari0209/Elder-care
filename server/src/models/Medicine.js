const mongoose = require('mongoose');
const { encrypted } = require('../utils/fieldCrypto');
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Fields using ...encrypted() are stored encrypted in MongoDB
// and automatically decrypted when read through Mongoose.
const medicineSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, ...encrypted({ maxlength: 120 }) },
  dosage: { type: String, required: true, ...encrypted({ maxlength: 120 }) },
  times: { type: String, required: true, trim: true, maxlength: 200 },
  start: { type: String, default: '' },
  end: { type: String, default: '' },
  days: { type: [{ type: String, enum: DAYS }], default: DAYS },
  notes: { type: String, default: '', ...encrypted({ maxlength: 2000 }) },
  confirmations: { type: [{ date: String, time: String, reportedTaken: Boolean }], default: [] },
  status: {
  type: String,
  enum: ['Active', 'Expired'],
  default: 'Active',
  index: true,
},
}, {
  timestamps: true,
  strict: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});
module.exports = mongoose.model('Medicine', medicineSchema);

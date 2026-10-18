const mongoose = require('mongoose');
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const medicineSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  dosage: { type: String, required: true, trim: true, maxlength: 120 },
  times: { type: String, required: true, trim: true, maxlength: 200 },
  start: { type: String, default: '' },
  end: { type: String, default: '' },
  days: { type: [{ type: String, enum: DAYS }], default: DAYS },
  notes: { type: String, default: '', maxlength: 2000 },
  confirmations: { type: [{ date: String, time: String, reportedTaken: Boolean }], default: [] }
}, { timestamps: true, strict: true });
module.exports = mongoose.model('Medicine', medicineSchema);

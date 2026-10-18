const mongoose = require('mongoose');
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const routineSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, enum: ['Meal', 'Exercise', 'Appointment', 'Sleep', 'Other'], default: 'Other' },
time: {
  type: String,
  required: true,
  trim: true,
  match: /^(0?[1-9]|1[0-2])[:.][0-5]\d\s?(AM|PM)$/i,
},
  days: { type: [{ type: String, enum: DAYS }], default: DAYS },
  notes: { type: String, default: '', maxlength: 2000 },
  completedDates: { type: [String], default: [] }
}, { timestamps: true, strict: true });
module.exports = mongoose.model('Routine', routineSchema);

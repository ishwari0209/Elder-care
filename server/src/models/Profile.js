const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: true,
  unique: true,
},
  name: { type: String, required: true, trim: true, maxlength: 120 },
  age: { type: String, default: '' },
  language: { type: String, enum: ['Marathi', 'Hindi', 'English'], default: 'Hindi' },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  address: { type: String, default: '', trim: true, maxlength: 500 },
  conditions: { type: String, default: '', maxlength: 2000 },
  allergies: { type: String, default: '', maxlength: 2000 },
  doctor: { type: String, default: '', trim: true, maxlength: 120 },
  doctorPhone: { type: String, default: '', trim: true, maxlength: 30 }
}, { timestamps: true, strict: true });

module.exports = mongoose.model('Profile', profileSchema);

const mongoose = require('mongoose');
const { encrypted } = require('../utils/fieldCrypto');

// Fields using ...encrypted() are stored encrypted in MongoDB
// and automatically decrypted when read through Mongoose.
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
  phone: { type: String, required: true, ...encrypted({ maxlength: 30 }) },
  address: { type: String, default: '', ...encrypted({ maxlength: 500 }) },
  conditions: { type: String, default: '', ...encrypted({ maxlength: 2000 }) },
  allergies: { type: String, default: '', ...encrypted({ maxlength: 2000 }) },
  doctor: { type: String, default: '', ...encrypted({ maxlength: 120 }) },
  doctorPhone: { type: String, default: '', ...encrypted({ maxlength: 30 }) }
}, {
  timestamps: true,
  strict: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

module.exports = mongoose.model('Profile', profileSchema);

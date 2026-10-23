const mongoose = require('mongoose');
const { encrypted } = require('../utils/fieldCrypto');

// Fields using ...encrypted() are stored encrypted in MongoDB
// and automatically decrypted when read through Mongoose.
const emergencyContactsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, ...encrypted({ maxlength: 120 }) },
  relation: { type: String, default: '', ...encrypted({ maxlength: 80 }) },
  phone: { type: String, required: true, ...encrypted({ maxlength: 30 }) },
  name2: { type: String, default: '', ...encrypted({ maxlength: 120 }) },
  phone2: { type: String, default: '', ...encrypted({ maxlength: 30 }) },
  doctor: { type: String, default: '', ...encrypted({ maxlength: 120 }) },
  doctorPhone: { type: String, default: '', ...encrypted({ maxlength: 30 }) }
}, {
  timestamps: true,
  strict: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});
module.exports = mongoose.model('EmergencyContacts', emergencyContactsSchema);

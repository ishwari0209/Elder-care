const mongoose = require('mongoose');
const emergencyContactsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  relation: { type: String, default: '', trim: true, maxlength: 80 },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  name2: { type: String, default: '', trim: true, maxlength: 120 },
  phone2: { type: String, default: '', trim: true, maxlength: 30 },
  doctor: { type: String, default: '', trim: true, maxlength: 120 },
  doctorPhone: { type: String, default: '', trim: true, maxlength: 30 }
}, { timestamps: true, strict: true });
module.exports = mongoose.model('EmergencyContacts', emergencyContactsSchema);

const mongoose = require('mongoose');
const careLinkSchema = new mongoose.Schema({
  elderUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  caregiverUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  inviteCodeHash: { type: String, default: '', select: false },
  inviteExpiresAt: { type: Date, default: null },
  status: { type: String, enum: ['pending', 'accepted'], default: 'pending', index: true },
  acceptedAt: { type: Date, default: null },
}, { timestamps: true });
careLinkSchema.index({ elderUserId: 1, caregiverUserId: 1 }, { unique: true });
careLinkSchema.index({ inviteCodeHash: 1 }, { sparse: true });
module.exports = mongoose.model('CareLink', careLinkSchema);

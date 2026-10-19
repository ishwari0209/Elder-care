
const mongoose = require('mongoose');

const completionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    itemType: {
      type: String,
      enum: ['routine', 'medicine'],
      required: true,
    },

    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    date: {
      type: String,
      required: true,
    },

    time: {
      type: String,
      default: '',
    },

    reportedDone: {
      type: Boolean,
      required: true,
    },

    note: {
      type: String,
      default: '',
      maxlength: 500,
    },

    // MongoDB deletes this record 24 hours after creation.
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      expires: 0,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

completionSchema.index(
  { itemType: 1, itemId: 1, date: 1, time: 1 },
  { unique: true }
);

module.exports = mongoose.model('Completion', completionSchema);

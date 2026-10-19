
const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');

const authMiddleware = require('../middleware/authMiddleware');
const asyncHandler = require('../middleware/asyncHandler');
const CareLinkModule = require('../models/CareLink');

console.log('CareLink module:', CareLinkModule);
console.log('Export type:', typeof CareLinkModule);
console.log('Export keys:', Object.keys(CareLinkModule || {}));

const CareLink = CareLinkModule;
const User = require('../models/User');
const Profile = require('../models/Profile');
const Routine = require('../models/Routine');
const Medicine = require('../models/Medicine');
const EmergencyContacts = require('../models/EmergencyContacts');
const Completion = require('../models/Completion');

const router = express.Router();

router.use(authMiddleware);

if (typeof CareLink?.find !== 'function') {
  throw new Error(
    'CareLink is not a valid Mongoose model. Check server/src/models/CareLink.js export.'
  );
}

const hashCode = (code) =>
  crypto.createHash('sha256').update(code).digest('hex');

// Generate an invitation code for the logged-in elderly user.
router.post(
  '/invite',
  asyncHandler(async (req, res) => {
    const code = String(crypto.randomInt(10000000, 100000000));
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await CareLink.deleteMany({
      elderUserId: req.user.id,
      status: 'pending',
    });

    await CareLink.create({
      elderUserId: req.user.id,
      caregiverUserId: req.user.id,
      inviteCodeHash: hashCode(code),
      inviteExpiresAt: expiresAt,
      status: 'pending',
    });

    res.status(201).json({
      message: 'Share this one-time code privately with your trusted caregiver. It expires in 24 hours.',
      code,
      expiresAt,
    });
  })
);

// Accept an invitation using a separate caregiver account.
router.post(
  '/accept',
  asyncHandler(async (req, res) => {
    const code = String(req.body.code || '').trim();

    if (!/^\d{8}$/.test(code)) {
      return res.status(400).json({
        message: 'Enter the 8-digit invitation code.',
      });
    }

    const link = await CareLink.findOne({
      inviteCodeHash: hashCode(code),
      status: 'pending',
      inviteExpiresAt: { $gt: new Date() },
    }).select('+inviteCodeHash');

    if (!link) {
      return res.status(400).json({
        message: 'This invitation is invalid, expired, or already used.',
      });
    }

    if (String(link.elderUserId) === String(req.user.id)) {
      return res.status(400).json({
        message: 'Accept the invitation from a separate caregiver account.',
      });
    }

    const existing = await CareLink.findOne({
      elderUserId: link.elderUserId,
      caregiverUserId: req.user.id,
    });

    if (existing && String(existing._id) !== String(link._id)) {
      if (existing.status === 'accepted') {
        return res.status(409).json({
          message: 'This caregiver is already linked to this account.',
        });
      }

      await existing.deleteOne();
    }

    link.caregiverUserId = req.user.id;
    link.status = 'accepted';
    link.acceptedAt = new Date();
    link.inviteCodeHash = '';
    link.inviteExpiresAt = null;

    await link.save();

    const profile = await Profile.findOne({
      userId: link.elderUserId,
    }).select('name');

    res.json({
      message: `You are now linked to ${profile?.name || 'the Saathi user'}.`,
      elderId: String(link.elderUserId),
    });
  })
);

// List elderly accounts linked to the logged-in caregiver.
router.get(
  '/elders',
  asyncHandler(async (req, res) => {
    const links = await CareLink.find({
      caregiverUserId: req.user.id,
      status: 'accepted',
    }).select('elderUserId acceptedAt createdAt');

    const elders = await Promise.all(
      links.map(async (link) => {
        const [profile, user] = await Promise.all([
          Profile.findOne({
            userId: link.elderUserId,
          }).select('name age language'),

          User.findById(link.elderUserId).select('name'),
        ]);

        return {
          elderId: String(link.elderUserId),
          linkedAt: link.acceptedAt || link.createdAt,
          name: profile?.name || user?.name || 'Saathi user',
          age: profile?.age || '',
          language: profile?.language || '',
        };
      })
    );

    res.json({ elders });
  })
);

// Get care information only when an accepted caregiver link exists.
router.get(
  '/elders/:elderId/status',
  asyncHandler(async (req, res) => {
    const { elderId } = req.params;

    if (!mongoose.isValidObjectId(elderId)) {
      return res.status(400).json({
        message: 'Invalid elder account.',
      });
    }

    const link = await CareLink.findOne({
      elderUserId: elderId,
      caregiverUserId: req.user.id,
      status: 'accepted',
    });

    if (!link) {
      return res.status(403).json({
        message: 'You are not authorized to view this care information.',
      });
    }

    const date =
      typeof req.query.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
        ? req.query.date
        : new Date().toISOString().slice(0, 10);

    const [profile, routines, medicines, contacts, completions] =
      await Promise.all([
        Profile.findOne({ userId: elderId }).select(
          'name age language conditions allergies doctor doctorPhone'
        ),

        Routine.find({ userId: elderId }).sort({ time: 1 }),

        Medicine.find({ userId: elderId }).sort({ createdAt: -1 }),

        EmergencyContacts.findOne({ userId: elderId }).select(
          'name relation phone name2 phone2 doctor doctorPhone'
        ),

        Completion.find({
          userId: elderId,
          date,
        }).sort({ createdAt: -1 }),
      ]);

    res.json({
      date,
      profile: profile || null,

      routines: routines.map((routine) => ({
        _id: routine._id,
        name: routine.name,
        category: routine.category,
        time: routine.time,
        days: routine.days,
      })),

      medicines: medicines.map((medicine) => ({
        _id: medicine._id,
        name: medicine.name,
        dosage: medicine.dosage,
        times: medicine.times,
        start: medicine.start,
        end: medicine.end,
        days: medicine.days,
        notes: medicine.notes,
      })),

      emergencyContacts: contacts || null,

      completions: completions.map((completion) => ({
        itemType: completion.itemType,
        itemId: completion.itemId,
        date: completion.date,
        time: completion.time,
        reportedDone: completion.reportedDone,
        note: completion.note,
        updatedAt: completion.updatedAt,
      })),

      notice:
        'Completion records are user-reported. SOS calls are not automatically recorded by this endpoint.',
    });
  })
);
// List caregivers linked to the logged-in elderly user.

router.get(
  '/caregivers',
  asyncHandler(async (req, res) => {
    const links = await CareLink.find({
      elderUserId: req.user.id,
      status: 'accepted',
    }).select('caregiverUserId acceptedAt createdAt');

    const caregivers = await Promise.all(
      links.map(async (link) => {
        const [profile, user] = await Promise.all([
          Profile.findOne({
            userId: link.caregiverUserId,
          }).select('name'),

          User.findById(link.caregiverUserId).select('name email'),
        ]);

        return {
          caregiverId: String(link.caregiverUserId),
          name: profile?.name || user?.name || 'Saathi caregiver',
          email: user?.email || '',
          linkedAt: link.acceptedAt || link.createdAt,
        };
      })
    );

    res.json({ caregivers });
  })
);

// Allow an elderly user to revoke a caregiver's access.
router.delete(
  '/links/:caregiverId',
  asyncHandler(async (req, res) => {
    const { caregiverId } = req.params;

    if (!mongoose.isValidObjectId(caregiverId)) {
      return res.status(400).json({
        message: 'Invalid caregiver account.',
      });
    }

    const result = await CareLink.deleteOne({
      elderUserId: req.user.id,
      caregiverUserId: caregiverId,
      status: 'accepted',
    });

    if (!result.deletedCount) {
      return res.status(404).json({
        message: 'No active caregiver link found.',
      });
    }

    res.json({
      message: 'Caregiver access revoked.',
    });
  })
);

module.exports = router;

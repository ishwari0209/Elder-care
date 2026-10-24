const express = require('express');
const Profile = require('../models/Profile');
const asyncHandler = require('../middleware/asyncHandler');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Fields that can be updated by the client.
const ALLOWED_FIELDS = [
  'name',
  'age',
  'language',
  'phone',
  'address',
  'conditions',
  'allergies',
  'doctor',
  'doctorPhone',
];

// GET /api/profile
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const profile = await Profile.findOne({
      userId: req.user.id,
    });

    res.json({
      profile: profile || {},
    });
  })
);

// POST /api/profile - Create a profile.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const existing = await Profile.findOne({
      userId: req.user.id,
    });

    if (existing) {
      return res.status(409).json({
        message: 'Profile already exists. Use PUT to update it.',
      });
    }

    const profileData = {};

    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) {
        profileData[field] = req.body[field];
      }
    }

    const profile = await Profile.create({
      ...profileData,
      userId: req.user.id,
    });

    res.status(201).json({
      message: 'Profile created successfully.',
      profile,
    });
  })
);

// PUT /api/profile - Update an existing profile.
router.put(
  '/',
  asyncHandler(async (req, res) => {
    const updates = {};

    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: 'No valid profile fields provided to update.',
      });
    }

    let profile = await Profile.findOne({
      userId: req.user.id,
    });

    // If the profile does not exist, create it.
    if (!profile) {
      profile = await Profile.create({
        ...updates,
        userId: req.user.id,
      });

      return res.status(201).json({
        message: 'Profile created successfully.',
        profile,
      });
    }

    // Update only permitted fields.
    Object.assign(profile, updates);

    await profile.save();

    res.status(200).json({
      message: 'Profile updated successfully.',
      profile,
    });
  })
);

module.exports = router;
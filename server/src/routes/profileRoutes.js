
const express = require("express");
const Profile = require("../models/Profile");
const asyncHandler = require("../middleware/asyncHandler");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Every route below requires a valid login token.
router.use(authMiddleware);

// GET /api/profile
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const profile = await Profile.findOne({
      userId: req.user.id,
    });

    res.json(profile || {});
  })
);

// POST /api/profile
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const existing = await Profile.findOne({
      userId: req.user.id,
    });

    if (existing) {
      return res.status(409).json({
        message: "Profile already exists. Use PUT to update it.",
      });
    }

    const profile = await Profile.create({
      ...req.body,
      userId: req.user.id,
    });

    res.status(201).json({
      message: "Profile created successfully.",
      profile,
    });
  })
);

// PUT /api/profile
router.put(
  "/",
  asyncHandler(async (req, res) => {
    // Never allow the client to change profile ownership.
    const { userId, _id, ...updates } = req.body;

    let profile = await Profile.findOne({
      userId: req.user.id,
    });

    if (!profile) {
      profile = await Profile.create({
        ...updates,
        userId: req.user.id,
      });

      return res.status(201).json({
        message: "Profile created successfully.",
        profile,
      });
    }

    Object.assign(profile, updates);
    await profile.save();

    res.json({
      message: "Profile updated successfully.",
      profile,
    });
  })
);

module.exports = router;


const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { randomInt } = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");
const PendingSignup = require("../models/PendingSignup");

const router = express.Router();

function createToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign(
    { userId: userId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}




const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { randomInt } = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");
const PendingSignup = require("../models/PendingSignup");

const router = express.Router();

function createToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign(
    { userId: userId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function makeMailer() {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS ||
    !process.env.EMAIL_FROM
  ) {
    throw new Error("Email SMTP configuration is missing.");
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendOtp(email, otp, purpose) {
  const transporter = makeMailer();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject:
      purpose === "signup"
        ? "Verify your Saathi account"
        : "Reset your Saathi password",
    text:
      `Your Saathi verification code is ${otp}.\n\n` +
      "It expires in 10 minutes. If you did not request this code, ignore this email.",
  });
}

function validEmail(email) {
  return (
    typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  );
}

function validOtp(otp) {
  return typeof otp === "string" && /^\d{6}$/.test(otp.trim());
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
  };
}

// POST /api/auth/signup
// Starts signup and emails an OTP. Does NOT create the account yet.
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !validEmail(email) ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: "Enter your name, a valid email, and a password of at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const otp = String(randomInt(100000, 1000000));
    const passwordHash = await bcrypt.hash(password, 12);
    const otpHash = await bcrypt.hash(otp, 10);

    await PendingSignup.findOneAndUpdate(
      { email: normalizedEmail },
      {
        name: name.trim(),
        email: normalizedEmail,
        password: passwordHash,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    try {
      await sendOtp(normalizedEmail, otp, "signup");
    } catch (emailError) {
      await PendingSignup.deleteOne({ email: normalizedEmail });
      throw emailError;
    }

    return res.json({
      message: "Verification code sent to your email.",
      verificationRequired: true,
      email: normalizedEmail,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Signup OTP error:", error.message);

    return res.status(500).json({
      message: "Could not send the verification email. Check the email configuration and try again.",
    });
  }
});

// POST /api/auth/verify-signup
// Creates the account only after a valid OTP.
router.post("/verify-signup", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!validEmail(email) || !validOtp(otp)) {
      return res.status(400).json({
        message: "Enter a valid email and the 6-digit verification code.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const pending = await PendingSignup.findOne({
      email: normalizedEmail,
    });

    if (!pending || pending.expiresAt <= new Date()) {
      return res.status(400).json({
        message: "The code is invalid or expired. Please sign up again.",
      });
    }

    const matches = await bcrypt.compare(otp.trim(), pending.otpHash);

    if (!matches) {
      return res.status(400).json({
        message: "Incorrect verification code.",
      });
    }

    if (await User.exists({ email: normalizedEmail })) {
      await PendingSignup.deleteOne({ _id: pending._id });
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const user = await User.create({
      name: pending.name,
      email: pending.email,
      password: pending.password,
    });

    await PendingSignup.deleteOne({ _id: pending._id });

    return res.status(201).json({
      message: "Email verified and account created successfully.",
      token: createToken(user._id),
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Signup verification error:", error.message);

    return res.status(500).json({
      message: "Unable to verify your account.",
    });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!validEmail(email) || typeof password !== "string" || !password) {
      return res.status(400).json({
        message: "Enter your email and password.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    // Accounts created with Google have no password.
    if (
      !user ||
      !user.password ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    return res.json({
      message: "Login successful.",
      token: createToken(user._id),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Unable to log in.",
    });
  }
});

// POST /api/auth/google
// Signs in OR creates an account from a Google ID token (same endpoint for
// both the Sign Up and Log In screens).
const googleClient = new OAuth2Client();

function googleAudiences() {
  return (process.env.GOOGLE_CLIENT_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    const audience = googleAudiences();

    if (!audience.length) {
      return res.status(500).json({
        message: "Google sign-in is not configured on the server.",
      });
    }

    if (typeof idToken !== "string" || !idToken) {
      return res.status(400).json({ message: "Google sign-in failed." });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken, audience });
      payload = ticket.getPayload();
    } catch (verifyError) {
      return res.status(401).json({
        message: "Google sign-in could not be verified.",
      });
    }

    if (!payload || !payload.email || !payload.email_verified) {
      return res.status(401).json({
        message: "Your Google email address is not verified.",
      });
    }

    const email = payload.email.trim().toLowerCase();
    const googleId = payload.sub;

    let user =
      (await User.findOne({ googleId })) || (await User.findOne({ email }));
    let isNewUser = false;

    if (!user) {
      user = await User.create({
        name: (payload.name || email.split("@")[0]).trim(),
        email,
        googleId,
        authProvider: "google",
      });
      isNewUser = true;
    } else if (!user.googleId) {
      // Existing email/password account: link Google to it.
      user.googleId = googleId;
      await user.save();
    }

    return res.status(isNewUser ? 201 : 200).json({
      message: isNewUser
        ? "Account created with Google."
        : "Login successful.",
      token: createToken(user._id),
      user: publicUser(user),
      isNewUser,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Google auth error:", error.message);

    return res.status(500).json({ message: "Unable to sign in with Google." });
  }
});

// POST /api/auth/forgot-password
// Always returns a generic response to avoid revealing registered emails.
router.post("/forgot-password", async (req, res) => {
  const genericMessage =
    "If an account exists for this email, a verification code will be sent.";

  try {
    const { email } = req.body;

    if (!validEmail(email)) {
      return res.status(400).json({
        message: "Enter a valid email address.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.json({ message: genericMessage });
    }

    const otp = String(randomInt(100000, 1000000));
    user.resetOtpHash = await bcrypt.hash(otp, 10);
    user.resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      await sendOtp(normalizedEmail, otp, "reset");
    } catch (emailError) {
      user.resetOtpHash = undefined;
      user.resetOtpExpiresAt = undefined;
      await user.save();
      throw emailError;
    }

    return res.json({ message: genericMessage });
  } catch (error) {
    console.error("Forgot-password error:", error.message);

    return res.status(500).json({
      message: "Could not send the reset email. Please try again later.",
    });
  }
});

// POST /api/auth/reset-password
// Verifies the OTP and changes the password in one operation.
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (
      !validEmail(email) ||
      !validOtp(otp) ||
      typeof newPassword !== "string" ||
      newPassword.length < 8
    ) {
      return res.status(400).json({
        message: "Enter a valid email, 6-digit code, and a new password of at least 8 characters.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+resetOtpHash +resetOtpExpiresAt +password");

    if (
      !user ||
      !user.resetOtpHash ||
      !user.resetOtpExpiresAt ||
      user.resetOtpExpiresAt <= new Date()
    ) {
      return res.status(400).json({
        message: "The code is invalid or expired. Request a new code.",
      });
    }

    const matches = await bcrypt.compare(otp.trim(), user.resetOtpHash);

    if (!matches) {
      return res.status(400).json({
        message: "Incorrect verification code.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetOtpHash = undefined;
    user.resetOtpExpiresAt = undefined;
    await user.save();

    return res.json({
      message: "Password reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    console.error("Password reset error:", error.message);

    return res.status(500).json({
      message: "Unable to reset your password.",
    });
  }
});

module.exports = router;


function validEmail(email) {
  return (
    typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  );
}

function validOtp(otp) {
  return typeof otp === "string" && /^\d{6}$/.test(otp.trim());
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
  };
}

// POST /api/auth/signup
// Starts signup and emails an OTP. Does NOT create the account yet.
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !validEmail(email) ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: "Enter your name, a valid email, and a password of at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const otp = String(randomInt(100000, 1000000));
    const passwordHash = await bcrypt.hash(password, 12);
    const otpHash = await bcrypt.hash(otp, 10);

    await PendingSignup.findOneAndUpdate(
      { email: normalizedEmail },
      {
        name: name.trim(),
        email: normalizedEmail,
        password: passwordHash,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    try {
      await sendOtp(normalizedEmail, otp, "signup");
    } catch (emailError) {
      await PendingSignup.deleteOne({ email: normalizedEmail });
      throw emailError;
    }

    return res.json({
      message: "Verification code sent to your email.",
      verificationRequired: true,
      email: normalizedEmail,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Signup OTP error:", error.message);

    return res.status(500).json({
      message: "Could not send the verification email. Check the email configuration and try again.",
    });
  }
});

// POST /api/auth/verify-signup
// Creates the account only after a valid OTP.
router.post("/verify-signup", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!validEmail(email) || !validOtp(otp)) {
      return res.status(400).json({
        message: "Enter a valid email and the 6-digit verification code.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const pending = await PendingSignup.findOne({
      email: normalizedEmail,
    });

    if (!pending || pending.expiresAt <= new Date()) {
      return res.status(400).json({
        message: "The code is invalid or expired. Please sign up again.",
      });
    }

    const matches = await bcrypt.compare(otp.trim(), pending.otpHash);

    if (!matches) {
      return res.status(400).json({
        message: "Incorrect verification code.",
      });
    }

    if (await User.exists({ email: normalizedEmail })) {
      await PendingSignup.deleteOne({ _id: pending._id });
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const user = await User.create({
      name: pending.name,
      email: pending.email,
      password: pending.password,
    });

    await PendingSignup.deleteOne({ _id: pending._id });

    return res.status(201).json({
      message: "Email verified and account created successfully.",
      token: createToken(user._id),
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Signup verification error:", error.message);

    return res.status(500).json({
      message: "Unable to verify your account.",
    });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!validEmail(email) || typeof password !== "string" || !password) {
      return res.status(400).json({
        message: "Enter your email and password.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    // Accounts created with Google have no password.
    if (
      !user ||
      !user.password ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    return res.json({
      message: "Login successful.",
      token: createToken(user._id),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Unable to log in.",
    });
  }
});

// POST /api/auth/google
// Signs in OR creates an account from a Google ID token (same endpoint for
// both the Sign Up and Log In screens).
const googleClient = new OAuth2Client();

function googleAudiences() {
  return (process.env.GOOGLE_CLIENT_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    const audience = googleAudiences();

    if (!audience.length) {
      return res.status(500).json({
        message: "Google sign-in is not configured on the server.",
      });
    }

    if (typeof idToken !== "string" || !idToken) {
      return res.status(400).json({ message: "Google sign-in failed." });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken, audience });
      payload = ticket.getPayload();
    } catch (verifyError) {
      return res.status(401).json({
        message: "Google sign-in could not be verified.",
      });
    }

    if (!payload || !payload.email || !payload.email_verified) {
      return res.status(401).json({
        message: "Your Google email address is not verified.",
      });
    }

    const email = payload.email.trim().toLowerCase();
    const googleId = payload.sub;

    let user =
      (await User.findOne({ googleId })) || (await User.findOne({ email }));
    let isNewUser = false;

    if (!user) {
      user = await User.create({
        name: (payload.name || email.split("@")[0]).trim(),
        email,
        googleId,
        authProvider: "google",
      });
      isNewUser = true;
    } else if (!user.googleId) {
      // Existing email/password account: link Google to it.
      user.googleId = googleId;
      await user.save();
    }

    return res.status(isNewUser ? 201 : 200).json({
      message: isNewUser
        ? "Account created with Google."
        : "Login successful.",
      token: createToken(user._id),
      user: publicUser(user),
      isNewUser,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Google auth error:", error.message);

    return res.status(500).json({ message: "Unable to sign in with Google." });
  }
});

// POST /api/auth/forgot-password
// Always returns a generic response to avoid revealing registered emails.
router.post("/forgot-password", async (req, res) => {
  const genericMessage =
    "If an account exists for this email, a verification code will be sent.";

  try {
    const { email } = req.body;

    if (!validEmail(email)) {
      return res.status(400).json({
        message: "Enter a valid email address.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.json({ message: genericMessage });
    }

    const otp = String(randomInt(100000, 1000000));
    user.resetOtpHash = await bcrypt.hash(otp, 10);
    user.resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      await sendOtp(normalizedEmail, otp, "reset");
    } catch (emailError) {
      user.resetOtpHash = undefined;
      user.resetOtpExpiresAt = undefined;
      await user.save();
      throw emailError;
    }

    return res.json({ message: genericMessage });
  } catch (error) {
    console.error("Forgot-password error:", error.message);

    return res.status(500).json({
      message: "Could not send the reset email. Please try again later.",
    });
  }
});

// POST /api/auth/reset-password
// Verifies the OTP and changes the password in one operation.
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (
      !validEmail(email) ||
      !validOtp(otp) ||
      typeof newPassword !== "string" ||
      newPassword.length < 8
    ) {
      return res.status(400).json({
        message: "Enter a valid email, 6-digit code, and a new password of at least 8 characters.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+resetOtpHash +resetOtpExpiresAt +password");

    if (
      !user ||
      !user.resetOtpHash ||
      !user.resetOtpExpiresAt ||
      user.resetOtpExpiresAt <= new Date()
    ) {
      return res.status(400).json({
        message: "The code is invalid or expired. Request a new code.",
      });
    }

    const matches = await bcrypt.compare(otp.trim(), user.resetOtpHash);

    if (!matches) {
      return res.status(400).json({
        message: "Incorrect verification code.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetOtpHash = undefined;
    user.resetOtpExpiresAt = undefined;
    await user.save();

    return res.json({
      message: "Password reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    console.error("Password reset error:", error.message);

    return res.status(500).json({
      message: "Unable to reset your password.",
    });
  }
});

module.exports = router;

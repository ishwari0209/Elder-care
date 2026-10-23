
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./db");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const routineRoutes = require("./routes/routineRoutes");
const medicineRoutes = require("./routes/medicineRoutes");
const contactRoutes = require("./routes/contactRoutes");
const completionRoutes = require("./routes/completionRoutes");
const careStatusRoutes = require("./routes/careStatusRoutes");
const caregiverRoutes = require("./routes/caregiverRoutes");

const Medicine = require("./models/Medicine");

const app = express();
const PORT = process.env.PORT || 5000;

// Use the application's configured time zone for date-only fields.
const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Kolkata";

function getTodayDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  return `${values.year}-${values.month}-${values.day}`;
}

async function expireMedicines() {
  const today = getTodayDate();

  const result = await Medicine.updateMany(
    {
      end: { $type: "string", $ne: "", $lt: today },
      status: { $ne: "Expired" },
    },
    {
      $set: { status: "Expired" },
    }
  );

  if (result.modifiedCount > 0) {
    console.log(
      `Medicine expiry check: ${result.modifiedCount} medicine(s) marked Expired.`
    );
  }
}

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Saathi API",
    status: "running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Saathi Backend",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/routines", routineRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/completions", completionRoutes);
app.use("/api/care-status", careStatusRoutes);
app.use("/api/caregiver", caregiverRoutes);

async function startServer() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from the .env file.");
    }

    require("./utils/fieldCrypto").getKey();

    await connectDB();

    // Update expired medicine records immediately after connecting.
    try {
      await expireMedicines();
    } catch (error) {
      console.error("Initial medicine expiry check failed:", error.message);
    }

    // Recheck every hour. Do not let one failed check stop the server.
    const expiryTimer = setInterval(async () => {
      try {
        await expireMedicines();
      } catch (error) {
        console.error("Scheduled medicine expiry check failed:", error.message);
      }
    }, 60 * 60 * 1000);

    // Do not keep Node running solely because of this timer.
    expiryTimer.unref();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Saathi API running on port ${PORT}`);
      console.log(`Medicine expiry time zone: ${APP_TIME_ZONE}`);
    });
  } catch (error) {
    console.error("Failed to start Saathi API:", error.message);
    process.exit(1);
  }
}

startServer();

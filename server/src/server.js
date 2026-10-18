
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./db");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const authMiddleware = require("./middleware/authMiddleware");
const routineRoutes = require("./routes/routineRoutes");
const medicineRoutes = require("./routes/medicineRoutes");
const contactRoutes = require("./routes/contactRoutes");
const completionRoutes = require("./routes/completionRoutes");
const careStatusRoutes = require("./routes/careStatusRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

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

// Authentication
app.use("/api/auth", authRoutes);

// User profile
app.use("/api/profile", profileRoutes);

// User-specific care data
app.use("/api/routines", routineRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/completions", completionRoutes);
app.use("/api/care-status", careStatusRoutes);

async function startServer() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from the .env file.");
    }

    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Saathi API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start Saathi API:", error.message);
    process.exit(1);
  }
}

startServer();

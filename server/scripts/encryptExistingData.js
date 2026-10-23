// One-time migration: encrypts data that was saved BEFORE encryption was added.
// Safe to run more than once (already-encrypted values are skipped).
//   node scripts/encryptExistingData.js
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/db");
const { encrypt, isEncrypted, getKey } = require("../src/utils/fieldCrypto");

const TARGETS = [
  { model: "../src/models/Profile", fields: ["phone", "address", "conditions", "allergies", "doctor", "doctorPhone"] },
  { model: "../src/models/EmergencyContacts", fields: ["name", "relation", "phone", "name2", "phone2", "doctor", "doctorPhone"] },
  { model: "../src/models/Medicine", fields: ["name", "dosage", "notes"] },
];

(async () => {
  getKey();
  await connectDB();

  for (const { model, fields } of TARGETS) {
    const Model = require(model);
    let changed = 0;

    // Use the raw collection so schema setters/getters don't interfere.
    for await (const doc of Model.collection.find({})) {
      const $set = {};
      for (const f of fields) {
        if (typeof doc[f] === "string" && doc[f] !== "" && !isEncrypted(doc[f])) {
          $set[f] = encrypt(doc[f]);
        }
      }
      if (Object.keys($set).length) {
        await Model.collection.updateOne({ _id: doc._id }, { $set });
        changed++;
      }
    }
    console.log(`${Model.modelName}: encrypted ${changed} document(s)`);
  }

  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });

const crypto = require("crypto");

// AES-256-GCM field encryption.
// Stored format:  enc:v1:<iv>:<authTag>:<ciphertext>   (all base64url)
const PREFIX = "enc:v1:";

function getKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      "ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate one with: " +
        "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

function isEncrypted(value) {
  return typeof value === "string" && value.startsWith(PREFIX);
}

function encrypt(value) {
  if (value === undefined || value === null) return value;
  const text = String(value);
  if (text === "" || isEncrypted(text)) return text; // keep empty as empty

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const data = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return (
    PREFIX +
    [iv, tag, data].map((b) => b.toString("base64url")).join(":")
  );
}

function decrypt(value) {
  if (!isEncrypted(value)) return value; // legacy plaintext passes through
  try {
    const [iv, tag, data] = value
      .slice(PREFIX.length)
      .split(":")
      .map((p) => Buffer.from(p, "base64url"));
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch (error) {
    console.error("Field decryption failed (wrong ENCRYPTION_KEY or corrupted data).");
    return "";
  }
}

// Mongoose helper: spread into a field definition.
//   phone: { type: String, required: true, ...encrypted({ maxlength: 30 }) }
// maxlength is checked on the PLAIN text (ciphertext is longer).
function encrypted({ maxlength } = {}) {
  return {
    set(value) {
      if (value === undefined || value === null) return value;
      const text = String(value).trim();
      if (maxlength && !isEncrypted(text) && text.length > maxlength) {
        throw new Error(`Value is too long (max ${maxlength} characters).`);
      }
      return encrypt(text);
    },
    get: decrypt,
  };
}

module.exports = { encrypt, decrypt, encrypted, isEncrypted, getKey };

const crypto = require("crypto");

// 256-bit encryption key (32 bytes)
const ENCRYPTION_KEY = process.env.ENCRYPTION_SECRET_KEY
  ? crypto.createHash("sha256").update(String(process.env.ENCRYPTION_SECRET_KEY)).digest()
  : crypto.createHash("sha256").update("ezfinanz-secure-banking-key-2026-aes256").digest();

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // For AES-GCM

/**
 * Encrypt plain text using AES-256-GCM
 * Output format: iv_hex:authTag_hex:ciphertext_hex
 */
function encrypt(text) {
  if (!text || typeof text !== "string") return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error("AES-256 encryption error:", error);
    return text;
  }
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * Fallback to original text if not encrypted
 */
function decrypt(cipherText) {
  if (!cipherText || typeof cipherText !== "string") return cipherText;
  try {
    const parts = cipherText.split(":");
    if (parts.length !== 3) {
      // Not encrypted with this format, return as plain text (backward compatibility)
      return cipherText;
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    // If decryption fails, return original
    return cipherText;
  }
}

/**
 * Mask Aadhaar Number: e.g. "294838947331" -> "XXXX-XXXX-7331"
 */
function maskAadhaar(aadhaar) {
  if (!aadhaar) return "XXXX-XXXX-XXXX";
  const clean = String(aadhaar).replace(/\D/g, "");
  if (clean.length < 4) return "XXXX-XXXX-XXXX";
  const last4 = clean.slice(-4);
  return `XXXX-XXXX-${last4}`;
}

/**
 * Mask PAN Number: e.g. "ABCDE1234F" -> "ABCDE****F"
 */
function maskPAN(pan) {
  if (!pan) return "ABCDE****F";
  const clean = String(pan).trim().toUpperCase();
  if (clean.length !== 10) return "ABCDE****F";
  return `${clean.slice(0, 5)}****${clean.slice(-1)}`;
}

/**
 * Mask Bank Account Number: e.g. "5010029482910" -> "XXXXXXXXX2910"
 */
function maskBankAccount(accountNumber) {
  if (!accountNumber) return "XXXXXXXXXXXX";
  const clean = String(accountNumber).trim();
  if (clean.length <= 4) return "XXXX" + clean;
  const last4 = clean.slice(-4);
  const maskedPrefix = "X".repeat(Math.max(4, clean.length - 4));
  return `${maskedPrefix}${last4}`;
}

/**
 * Mask Smart ID Number based on type
 */
function maskIdNumber(idType, idNumber) {
  if (!idNumber) return "XXXX-XXXX";
  if (idType === "Aadhaar") return maskAadhaar(idNumber);
  if (idType === "PAN") return maskPAN(idNumber);
  const clean = String(idNumber).trim();
  if (clean.length <= 4) return "XXXX" + clean;
  return `${clean.slice(0, 2)}****${clean.slice(-2)}`;
}

/**
 * Mask Mobile Phone Number: e.g. "9876543210" -> "******3210"
 */
function maskPhone(phone) {
  if (!phone) return "N/A";
  const clean = String(phone).replace(/\D/g, "");
  if (clean.length < 4) return phone;
  const last4 = clean.slice(-4);
  return `******${last4}`;
}

module.exports = {
  encrypt,
  decrypt,
  maskAadhaar,
  maskPAN,
  maskBankAccount,
  maskIdNumber,
  maskPhone,
};

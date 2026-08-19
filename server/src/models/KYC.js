const mongoose = require("mongoose");

const kycSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    age: {
      type: Number,
      required: false,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    address: {
      street: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pincode: { type: String, required: true, trim: true },
      country: { type: String, default: "India", trim: true },
    },
    idType: {
      type: String,
      enum: ["PAN", "Aadhaar", "Passport", "Voter_ID", "Driving_License"],
      required: true,
    },
    idNumber: {
      type: String,
      required: true,
      trim: true,
    },
    maskedIdNumber: {
      type: String,
      default: null,
      trim: true,
    },
    isEncrypted: {
      type: Boolean,
      default: true,
    },
    idDocumentUrl: {
      type: String, // Base64 data URI or storage URL
      default: null,
    },
    idDocumentFileName: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING",
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("KYC", kycSchema);

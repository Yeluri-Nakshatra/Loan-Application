const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    supertokensUserId: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
      required: true,
    },

    // Email verification
    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailOtp: {
      type: String,
      default: null,
    },

    emailOtpExpiresAt: {
      type: Date,
      default: null,
    },

    // Phone verification
    phoneVerified: {
      type: Boolean,
      default: false,
    },

    phoneOtp: {
      type: String,
      default: null,
    },

    phoneOtpExpiresAt: {
      type: Date,
      default: null,
    },

    phoneLoginOtp: {
      type: String,
      default: null
    },

    phoneLoginOtpExpiresAt: {
      type: Date,
      default: null
    },

    // Final signup status
    signupCompleted: {
      type: Boolean,
      default: false,
    },

    // KYC Verification Status
    kycStatus: {
      type: String,
      enum: ["NOT_SUBMITTED", "PENDING", "VERIFIED", "REJECTED"],
      default: "NOT_SUBMITTED",
    },

    kycId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KYC",
      default: null,
    },

    // Loan Eligibility Status
    eligibilityStatus: {
      type: String,
      enum: ["NOT_CHECKED", "ELIGIBLE", "PARTIALLY_ELIGIBLE", "NOT_ELIGIBLE"],
      default: "NOT_CHECKED",
    },

    latestEligibilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Eligibility",
      default: null,
    },

    // Active Loan Application Reference
    activeApplicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LoanApplication",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
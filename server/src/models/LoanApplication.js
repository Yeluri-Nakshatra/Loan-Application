const mongoose = require("mongoose");

const loanApplicationSchema = new mongoose.Schema(
  {
    applicationId: {
      type: String,
      unique: true,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    kycId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KYC",
      default: null,
    },
    eligibilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Eligibility",
      default: null,
    },

    // Step 5: Loan & EMI Selection
    loanAmount: {
      type: Number,
      required: true,
      min: 1000,
    },
    tenureMonths: {
      type: Number,
      required: true,
      default: 24,
    },
    interestRate: {
      type: Number,
      required: true,
      default: 10.5,
    },
    monthlyEMI: {
      type: Number,
      required: true,
    },
    totalRepayment: {
      type: Number,
      required: true,
    },
    totalInterest: {
      type: Number,
      required: true,
    },
    // Fee & Net Disbursement Breakdown
    processingFee: {
      type: Number,
      default: 0,
    },
    gstOnProcessingFee: {
      type: Number,
      default: 0,
    },
    documentationCharges: {
      type: Number,
      default: 250,
    },
    totalCharges: {
      type: Number,
      default: 0,
    },
    netDisbursementAmount: {
      type: Number,
      default: 0,
    },
    effectiveIRR: {
      type: Number,
      default: 0,
    },
    loanPurpose: {
      type: String,
      enum: [
        "personal",
        "home_improvement",
        "business",
        "education",
        "debt_consolidation",
        "medical",
        "vehicle",
      ],
      default: "personal",
    },

    // Step 6: Bank Account Details
    bankDetails: {
      bankName: { type: String, default: null, trim: true },
      accountNumber: { type: String, default: null, trim: true },
      maskedAccountNumber: { type: String, default: null, trim: true },
      isEncrypted: { type: Boolean, default: true },
      ifscCode: { type: String, default: null, trim: true, uppercase: true },
      accountType: {
        type: String,
        enum: ["savings", "current"],
        default: "savings",
      },
      accountHolderName: { type: String, default: null, trim: true },
      bankVerified: { type: Boolean, default: false },
    },

    // Step 7: Confirmation of Declaration
    declaration: {
      termsAccepted: { type: Boolean, default: false },
      autoDebitConsent: { type: Boolean, default: false },
      creditInformationConsent: { type: Boolean, default: false },
      digitalSignatureName: { type: String, default: null, trim: true },
      declarationTimestamp: { type: Date, default: null },
    },

    // Step 8: Live Selfie Verification
    selfieVerification: {
      selfieUrl: { type: String, default: null }, // Base64 data URL
      selfieCapturedAt: { type: Date, default: null },
      isLivenessVerified: { type: Boolean, default: false },
    },

    // Step 9: Application Status & Underwriting Review
    status: {
      type: String,
      enum: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "DISBURSED",
      ],
      default: "DRAFT",
    },
    currentStep: {
      type: Number,
      default: 5, // 5: EMI, 6: Bank, 7: Declaration, 8: Selfie, 9: Completed
    },
    adminReview: {
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      selfieApproved: { type: Boolean, default: null },
      decision: {
        type: String,
        enum: ["APPROVED", "REJECTED", "PENDING"],
        default: "PENDING",
      },
      remarks: { type: String, default: null },
      reviewedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("LoanApplication", loanApplicationSchema);

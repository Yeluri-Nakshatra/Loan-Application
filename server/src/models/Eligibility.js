const mongoose = require("mongoose");

const eligibilitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    monthlyIncome: {
      type: Number,
      required: true,
      min: 0,
    },
    employmentType: {
      type: String,
      enum: ["salaried", "self_employed", "business"],
      default: "salaried",
      required: true,
    },
    employerName: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    requestedAmount: {
      type: Number,
      required: true,
      min: 1000,
    },
    tenureMonths: {
      type: Number,
      required: true,
      default: 24,
    },
    cibilScore: {
      type: Number,
      required: true,
      min: 300,
      max: 900,
    },
    currentDebts: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    // Calculated Financial Metrics
    dtiRatio: {
      type: Number,
      required: true, // percentage, e.g. 25.5
    },
    maxEligibleAmount: {
      type: Number,
      required: true,
    },
    estimatedMonthlyEMI: {
      type: Number,
      required: true,
    },
    suggestedInterestRate: {
      type: Number,
      required: true, // percentage APR e.g. 9.5
    },
    decision: {
      type: String,
      enum: ["ELIGIBLE", "PARTIALLY_ELIGIBLE", "NOT_ELIGIBLE"],
      required: true,
    },
    decisionReason: {
      type: String,
      default: "",
    },
    breakdown: {
      creditTier: { type: String },
      dtiStatus: { type: String },
      disposableIncome: { type: Number },
      maxAllowedEMI: { type: Number },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Eligibility", eligibilitySchema);

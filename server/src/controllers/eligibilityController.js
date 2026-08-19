const mongoose = require("mongoose");
const Eligibility = require("../models/Eligibility");
const User = require("../models/User");
const LoanApplication = require("../models/LoanApplication");

/**
 * Standard Banking EMI Calculation Formula
 */
function calculateMonthlyEMI(principal, annualRatePct, tenureMonths) {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  const monthlyRate = annualRatePct / 100 / 12;
  if (monthlyRate === 0) return principal / tenureMonths;

  const emi =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  return Math.round(emi);
}

/**
 * Calculate Max Loan Capacity from Max Allowed EMI
 */
function calculateMaxPrincipal(maxEMI, annualRatePct, tenureMonths) {
  if (maxEMI <= 0 || tenureMonths <= 0) return 0;
  const monthlyRate = annualRatePct / 100 / 12;
  if (monthlyRate === 0) return maxEMI * tenureMonths;

  const principal =
    (maxEMI * (Math.pow(1 + monthlyRate, tenureMonths) - 1)) /
    (monthlyRate * Math.pow(1 + monthlyRate, tenureMonths));
  return Math.max(0, Math.floor(principal / 1000) * 1000);
}

/**
 * Assess Customer Loan Eligibility
 */
const checkEligibility = async (req, res) => {
  try {
    const {
      userId,
      email,
      monthlyIncome,
      employmentType,
      employerName,
      designation,
      requestedAmount,
      tenureMonths = 24,
      cibilScore,
      currentDebts = 0,
    } = req.body;

    // 1. Resolve User
    let user = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    }
    if (!user && email) {
      user = await User.findOne({ email: email.trim().toLowerCase() });
    }

    if (!user) {
      return res.status(404).json({
        message: "User account not found. Please sign in.",
      });
    }

    // 2. Validate Inputs
    const income = Number(monthlyIncome);
    const reqAmount = Number(requestedAmount);
    const tenure = Number(tenureMonths) || 24;
    const score = Number(cibilScore);
    const userDeclaredDebts = Number(currentDebts) || 0;

    // Check system-verified active approved or disbursed loans in MongoDB
    const activeLoans = await LoanApplication.find({
      userId: user._id,
      status: { $in: ["APPROVED", "DISBURSED"] },
    });
    const verifiedActiveEMIs = activeLoans.reduce((sum, app) => sum + (app.monthlyEMI || 0), 0);

    // Total existing monthly debt obligation incorporates verified active loan EMIs
    const debts = Math.max(userDeclaredDebts, verifiedActiveEMIs);

    if (!income || income < 10000) {
      return res.status(400).json({
        message: "Monthly income must be at least $10,000 for lending evaluation.",
      });
    }

    if (!reqAmount || reqAmount < 5000) {
      return res.status(400).json({
        message: "Requested loan amount must be at least $5,000.",
      });
    }

    if (!score || score < 300 || score > 900) {
      return res.status(400).json({
        message: "Please enter a valid CIBIL / Credit Score between 300 and 900.",
      });
    }

    if (!employerName || !designation) {
      return res.status(400).json({
        message: "Employer / Company name and Job Designation are required.",
      });
    }

    // 3. Credit Score Tier & Pricing
    let creditTier = "Poor";
    let interestRate = 19.0;
    let incomeMultiplier = 5;

    if (score >= 750) {
      creditTier = "Excellent";
      interestRate = 9.5;
      incomeMultiplier = 30;
    } else if (score >= 650) {
      creditTier = "Good";
      interestRate = 12.0;
      incomeMultiplier = 20;
    } else if (score >= 550) {
      creditTier = "Fair";
      interestRate = 15.5;
      incomeMultiplier = 10;
    } else {
      creditTier = "Poor";
      interestRate = 19.0;
      incomeMultiplier = 5;
    }

    // 4. Debt-to-Income (DTI) & FOIR Capacity
    const dtiRatio = Math.round((debts / income) * 1000) / 10; // e.g. 25.5%
    let dtiStatus = "Healthy";
    if (dtiRatio > 50) {
      dtiStatus = "High Debt Burden";
    } else if (dtiRatio > 35) {
      dtiStatus = "Moderate";
    } else {
      dtiStatus = "Healthy";
    }

    // Fixed Obligation to Income Ratio (FOIR): max 50% of income for all EMIs combined
    const maxCombinedEMICap = income * 0.5;
    const maxAllowedNewEMI = Math.max(0, maxCombinedEMICap - debts);
    const disposableIncome = Math.max(0, income - debts);

    // Calculate maximum principal capacity based on max allowed EMI & income multiplier
    const capacityByEMI = calculateMaxPrincipal(maxAllowedNewEMI, interestRate, tenure);
    const capacityByMultiplier = income * incomeMultiplier;
    const maxEligibleAmount = Math.min(capacityByEMI, capacityByMultiplier);

    // Estimated monthly EMI for requested amount
    const estimatedEMI = calculateMonthlyEMI(reqAmount, interestRate, tenure);

    // 5. Decision Engine Logic
    let decision = "NOT_ELIGIBLE";
    let decisionReason = "";

    if (score < 550) {
      decision = "NOT_ELIGIBLE";
      decisionReason = `Credit score (${score}) is below the institutional underwriting threshold of 550.`;
    } else if (dtiRatio > 55) {
      decision = "NOT_ELIGIBLE";
      decisionReason = `Debt-to-Income ratio (${dtiRatio}%) exceeds the 50% risk ceiling. Please consolidate or clear existing debt.`;
    } else if (maxAllowedNewEMI < 1000 || maxEligibleAmount < 5000) {
      decision = "NOT_ELIGIBLE";
      decisionReason = "Current monthly debt obligations leave insufficient disposable income for new borrowing.";
    } else if (reqAmount <= maxEligibleAmount && score >= 650 && dtiRatio <= 45) {
      decision = "ELIGIBLE";
      decisionReason = `Approved for the requested amount of $${reqAmount.toLocaleString()} at ${interestRate}% APR based on healthy DTI (${dtiRatio}%) and ${creditTier} credit rating.`;
    } else {
      decision = "PARTIALLY_ELIGIBLE";
      decisionReason = `You are pre-approved for up to $${maxEligibleAmount.toLocaleString()} at ${interestRate}% APR. The requested amount ($${reqAmount.toLocaleString()}) exceeds your current recommended debt capacity.`;
    }

    // 6. Save Assessment Record
    const assessment = await Eligibility.create({
      userId: user._id,
      monthlyIncome: income,
      employmentType: employmentType || "salaried",
      employerName: employerName.trim(),
      designation: designation.trim(),
      requestedAmount: reqAmount,
      tenureMonths: tenure,
      cibilScore: score,
      currentDebts: debts,
      dtiRatio,
      maxEligibleAmount,
      estimatedMonthlyEMI: estimatedEMI,
      suggestedInterestRate: interestRate,
      decision,
      decisionReason,
      breakdown: {
        creditTier,
        dtiStatus,
        disposableIncome,
        maxAllowedEMI: maxAllowedNewEMI,
      },
    });

    // 7. Update User's Profile
    user.eligibilityStatus = decision;
    user.latestEligibilityId = assessment._id;
    await user.save();

    return res.status(200).json({
      message: "Eligibility evaluation completed successfully.",
      assessment,
      decision,
    });
  } catch (error) {
    console.error("checkEligibility error:", error);
    return res.status(500).json({
      message: error.message || "Failed to evaluate loan eligibility.",
    });
  }
};

/**
 * Retrieve User's Latest Eligibility Assessment
 */
const getLatestEligibility = async (req, res) => {
  try {
    const { userId, email } = req.query;

    let user = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    }
    if (!user && email) {
      user = await User.findOne({ email: email.trim().toLowerCase() });
    }

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const latest = await Eligibility.findOne({ userId: user._id }).sort({ createdAt: -1 });

    const activeLoans = await LoanApplication.find({
      userId: user._id,
      status: { $in: ["APPROVED", "DISBURSED"] },
    });
    const verifiedActiveEMIs = activeLoans.reduce((sum, app) => sum + (app.monthlyEMI || 0), 0);

    let assessment = latest ? latest.toObject() : null;

    if (assessment) {
      const currentIncome = assessment.monthlyIncome || 50000;
      const effectiveDebts = Math.max(assessment.currentDebts || 0, verifiedActiveEMIs);
      const interestRate = assessment.suggestedInterestRate || 10.5;
      const tenure = assessment.tenureMonths || 24;

      // Real-time FOIR calculation taking active loan EMIs into account
      const maxCombinedEMICap = currentIncome * 0.5;
      const maxAllowedNewEMI = Math.max(0, maxCombinedEMICap - effectiveDebts);
      const disposableIncome = Math.max(0, currentIncome - effectiveDebts);
      const realMaxPrincipal = calculateMaxPrincipal(maxAllowedNewEMI, interestRate, tenure);

      const dtiRatio = Math.round((effectiveDebts / currentIncome) * 1000) / 10;
      let dtiStatus = "Healthy";
      if (dtiRatio > 50) {
        dtiStatus = "High Debt Burden";
      } else if (dtiRatio > 35) {
        dtiStatus = "Moderate";
      }

      assessment.currentDebts = effectiveDebts;
      assessment.dtiRatio = dtiRatio;
      assessment.maxEligibleAmount = Math.max(0, realMaxPrincipal);
      assessment.breakdown = {
        ...(assessment.breakdown || {}),
        dtiStatus,
        disposableIncome,
        maxAllowedEMI: maxAllowedNewEMI,
      };

      if (dtiRatio > 55 || maxAllowedNewEMI < 1000 || realMaxPrincipal < 5000) {
        assessment.decision = "NOT_ELIGIBLE";
        assessment.decisionReason = `Active loan commitments ($${effectiveDebts.toLocaleString()}/mo) currently consume your maximum allowable monthly repayment capacity (50% FOIR limit).`;
      }
    }

    return res.status(200).json({
      eligibilityStatus: assessment?.decision || user.eligibilityStatus || "NOT_CHECKED",
      assessment,
      activeExistingEMI: verifiedActiveEMIs,
      activeLoansCount: activeLoans.length,
    });
  } catch (error) {
    console.error("getLatestEligibility error:", error);
    return res.status(500).json({
      message: "Failed to load eligibility records.",
    });
  }
};

module.exports = {
  checkEligibility,
  getLatestEligibility,
};

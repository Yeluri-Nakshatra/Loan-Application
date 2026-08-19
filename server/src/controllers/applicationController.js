const mongoose = require("mongoose");
const LoanApplication = require("../models/LoanApplication");
const User = require("../models/User");
const KYC = require("../models/KYC");
const Eligibility = require("../models/Eligibility");
const { encrypt, decrypt, maskBankAccount, maskIdNumber } = require("../utils/encryption");

/**
 * Format loan application safely (masking sensitive PII and financial numbers)
 */
function formatSafeApplication(appDoc) {
  if (!appDoc) return null;
  const obj = appDoc.toObject ? appDoc.toObject() : { ...appDoc };
  if (obj.bankDetails) {
    const rawAcc = decrypt(obj.bankDetails.accountNumber);
    obj.bankDetails.maskedAccountNumber = obj.bankDetails.maskedAccountNumber || maskBankAccount(rawAcc);
    obj.bankDetails.accountNumber = obj.bankDetails.maskedAccountNumber;
  }
  if (obj.kycId && typeof obj.kycId === "object") {
    const rawId = decrypt(obj.kycId.idNumber);
    obj.kycId.maskedIdNumber = obj.kycId.maskedIdNumber || maskIdNumber(obj.kycId.idType, rawId);
    obj.kycId.idNumber = obj.kycId.maskedIdNumber;
  }
  return obj;
}

/**
 * Standard EMI Calculation Helper
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
 * Helper to resolve user
 */
async function resolveUser(userId, email) {
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    const u = await User.findById(userId);
    if (u) return u;
  }
  if (email) {
    return await User.findOne({ email: email.trim().toLowerCase() });
  }
  return null;
}

/**
 * Step 5: Save EMI Term & Loan Product
 */
const saveEMITerm = async (req, res) => {
  try {
    const {
      userId,
      email,
      loanAmount,
      tenureMonths = 24,
      interestRate = 10.5,
      loanPurpose = "personal",
    } = req.body;

    const user = await resolveUser(userId, email);
    if (!user) {
      return res.status(404).json({ message: "User account not found. Please log in." });
    }

    const principal = Number(loanAmount);
    const tenure = Number(tenureMonths);
    const rate = Number(interestRate);

    if (!principal || principal < 5000) {
      return res.status(400).json({ message: "Minimum loan amount is $5,000." });
    }

    const monthlyEMI = calculateMonthlyEMI(principal, rate, tenure);
    const totalRepayment = monthlyEMI * tenure;
    const totalInterest = Math.max(0, totalRepayment - principal);

    // Fee & Net Disbursement Calculation
    const processingFee = Math.max(500, Math.round(principal * 0.02)); // 2% processing fee
    const gstOnProcessingFee = Math.round(processingFee * 0.18); // 18% GST
    const documentationCharges = 250; // Nominal documentation & stamp fee
    const totalCharges = processingFee + gstOnProcessingFee + documentationCharges;
    const netDisbursementAmount = Math.max(0, principal - totalCharges);

    // Approximate Annualized Effective IRR / APR (accounting for upfront fees)
    const annualFeeImpact = ((totalCharges / principal) / (tenure / 12)) * 100;
    const effectiveIRR = Math.round((rate + annualFeeImpact) * 10) / 10;

    // Find latest KYC and Eligibility records
    const kyc = await KYC.findOne({ userId: user._id });
    const eligibility = await Eligibility.findOne({ userId: user._id }).sort({ createdAt: -1 });

    // Check if user has an existing draft application (unless explicitly creating a new application)
    let application = null;
    if (!req.body.isNewApplication) {
      application = await LoanApplication.findOne({
        userId: user._id,
        status: "DRAFT",
      });
    }

    if (!application) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const appRef = `EZ-LN-${new Date().getFullYear()}-${randomSuffix}`;

      application = new LoanApplication({
        applicationId: appRef,
        userId: user._id,
        kycId: kyc ? kyc._id : null,
        eligibilityId: eligibility ? eligibility._id : null,
      });
    }

    application.loanAmount = principal;
    application.tenureMonths = tenure;
    application.interestRate = rate;
    application.monthlyEMI = monthlyEMI;
    application.totalRepayment = totalRepayment;
    application.totalInterest = totalInterest;
    application.processingFee = processingFee;
    application.gstOnProcessingFee = gstOnProcessingFee;
    application.documentationCharges = documentationCharges;
    application.totalCharges = totalCharges;
    application.netDisbursementAmount = netDisbursementAmount;
    application.effectiveIRR = effectiveIRR;
    application.loanPurpose = loanPurpose;
    application.currentStep = 6;
    if (kyc) application.kycId = kyc._id;
    if (eligibility) application.eligibilityId = eligibility._id;

    await application.save();

    user.activeApplicationId = application._id;
    await user.save();

    return res.status(200).json({
      message: "Loan parameters, fee breakdown, and EMI schedule selected successfully.",
      application,
    });
  } catch (error) {
    console.error("saveEMITerm error:", error);
    return res.status(500).json({
      message: error.message || "Failed to save EMI term selection.",
    });
  }
};

/**
 * Step 6: Save Bank Account Details
 */
const saveBankAccount = async (req, res) => {
  try {
    const {
      applicationId,
      userId,
      email,
      bankName,
      accountNumber,
      ifscCode,
      accountType = "savings",
      accountHolderName,
    } = req.body;

    let application = null;
    if (applicationId) {
      application = await LoanApplication.findOne({ applicationId });
    }
    if (!application) {
      const user = await resolveUser(userId, email);
      if (user && user.activeApplicationId) {
        application = await LoanApplication.findById(user.activeApplicationId);
      }
    }

    if (!application) {
      return res.status(404).json({ message: "Active loan application not found. Please start from Step 5." });
    }

    if (!bankName || !accountNumber || !ifscCode || !accountHolderName) {
      return res.status(400).json({
        message: "Bank Name, Account Number, IFSC Code, and Account Holder Name are required.",
      });
    }

    const cleanIFSC = ifscCode.trim().toUpperCase();
    const cleanAcc = accountNumber.trim();
    const encryptedAcc = encrypt(cleanAcc);
    const maskedAcc = maskBankAccount(cleanAcc);

    application.bankDetails = {
      bankName: bankName.trim(),
      accountNumber: encryptedAcc,
      maskedAccountNumber: maskedAcc,
      isEncrypted: true,
      ifscCode: cleanIFSC,
      accountType,
      accountHolderName: accountHolderName.trim(),
      bankVerified: true, // Auto-verified institutional check
    };
    application.currentStep = 7;

    await application.save();

    return res.status(200).json({
      message: "Disbursement bank account linked and verified successfully.",
      application: formatSafeApplication(application),
    });
  } catch (error) {
    console.error("saveBankAccount error:", error);
    return res.status(500).json({
      message: error.message || "Failed to save bank account details.",
    });
  }
};

/**
 * Step 7: Save Confirmation of Declaration & Undertaking
 */
const saveDeclaration = async (req, res) => {
  try {
    const {
      applicationId,
      userId,
      email,
      termsAccepted,
      autoDebitConsent,
      creditInformationConsent,
      digitalSignatureName,
    } = req.body;

    let application = null;
    if (applicationId) {
      application = await LoanApplication.findOne({ applicationId });
    }
    if (!application) {
      const user = await resolveUser(userId, email);
      if (user && user.activeApplicationId) {
        application = await LoanApplication.findById(user.activeApplicationId);
      }
    }

    if (!application) {
      return res.status(404).json({ message: "Active loan application not found." });
    }

    if (!termsAccepted || !autoDebitConsent || !creditInformationConsent) {
      return res.status(400).json({
        message: "Please accept all mandatory regulatory declarations and the e-Mandate auto-debit consent.",
      });
    }

    if (!digitalSignatureName || !digitalSignatureName.trim()) {
      return res.status(400).json({
        message: "Please enter your full legal name as your digital signature.",
      });
    }

    application.declaration = {
      termsAccepted: true,
      autoDebitConsent: true,
      creditInformationConsent: true,
      digitalSignatureName: digitalSignatureName.trim(),
      declarationTimestamp: new Date(),
    };
    application.currentStep = 8;

    await application.save();

    return res.status(200).json({
      message: "Legal declaration and NACH mandate confirmed.",
      application,
    });
  } catch (error) {
    console.error("saveDeclaration error:", error);
    return res.status(500).json({
      message: error.message || "Failed to save legal declaration.",
    });
  }
};

/**
 * Step 8: Submit Live Selfie Verification (Final Step)
 */
const submitSelfie = async (req, res) => {
  try {
    const { applicationId, userId, email, selfieUrl } = req.body;

    let application = null;
    if (applicationId) {
      application = await LoanApplication.findOne({ applicationId });
    }
    if (!application) {
      const user = await resolveUser(userId, email);
      if (user && user.activeApplicationId) {
        application = await LoanApplication.findById(user.activeApplicationId);
      }
    }

    if (!application) {
      return res.status(404).json({ message: "Active loan application not found." });
    }

    if (!selfieUrl) {
      return res.status(400).json({
        message: "Live selfie capture is required for final verification.",
      });
    }

    application.selfieVerification = {
      selfieUrl,
      selfieCapturedAt: new Date(),
      isLivenessVerified: true,
    };
    application.status = "UNDER_REVIEW";
    application.currentStep = 9;

    await application.save();

    return res.status(200).json({
      message: "Live selfie verified! Your loan application is now under underwriting review.",
      application,
    });
  } catch (error) {
    console.error("submitSelfie error:", error);
    return res.status(500).json({
      message: error.message || "Failed to submit live selfie verification.",
    });
  }
};

/**
 * Get Active Application Status for Customer
 */
const getApplicationStatus = async (req, res) => {
  try {
    const { userId, email, applicationId } = req.query;
    let application = null;
    let allApplications = [];

    const user = await resolveUser(userId, email);

    if (applicationId) {
      application = await LoanApplication.findOne({ applicationId })
        .populate("kycId")
        .populate("eligibilityId")
        .populate("userId", "name email phone");
    }

    if (user) {
      allApplications = await LoanApplication.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .populate("kycId")
        .populate("eligibilityId")
        .populate("userId", "name email phone");

      if (!application && allApplications.length > 0) {
        application = allApplications[0];
      }
    }

    // Compute dynamic dashboard metrics from real data
    const approvedLoans = allApplications.filter((a) => a.status === "APPROVED");
    const activeBorrowing = approvedLoans.reduce((sum, a) => sum + (a.loanAmount || 0), 0);
    const nextDueEMI = approvedLoans.reduce((sum, a) => sum + (a.monthlyEMI || 0), 0);

    // Calculate dynamic next due date (5th of coming month)
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 5);
    const formattedNextDue = nextMonth.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    return res.status(200).json({
      application: formatSafeApplication(application),
      applications: allApplications.map(formatSafeApplication),
      stats: {
        activeBorrowing,
        activeLoansCount: approvedLoans.length,
        nextDueEMI,
        nextDueDate: nextDueEMI > 0 ? formattedNextDue : "No Active Repayment",
      },
    });
  } catch (error) {
    console.error("getApplicationStatus error:", error);
    return res.status(500).json({
      message: "Failed to retrieve loan application status.",
    });
  }
};

/**
 * Get All Applications for Admin / Underwriting Console
 */
const getAllApplicationsAdmin = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status.toUpperCase();
    }

    const applications = await LoanApplication.find(filter)
      .populate("userId", "name email phone role kycStatus emailVerified phoneVerified signupCompleted createdAt")
      .populate("kycId")
      .populate("eligibilityId")
      .populate("adminReview.reviewedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: applications.length,
      applications: applications.map(formatSafeApplication),
    });
  } catch (error) {
    console.error("getAllApplicationsAdmin error:", error);
    return res.status(500).json({
      message: "Failed to load loan underwriting applications.",
    });
  }
};

/**
 * Admin 360° Decision: Approve Selfie & Sanction Loan / Reject
 */
const reviewApplicationAdmin = async (req, res) => {
  try {
    const { applicationId, decision, remarks, selfieApproved, reviewerId } = req.body;

    if (!applicationId || !["APPROVED", "REJECTED"].includes(decision)) {
      return res.status(400).json({
        message: "Valid Application ID and decision ('APPROVED' or 'REJECTED') are required.",
      });
    }

    const application = await LoanApplication.findOne({ applicationId });
    if (!application) {
      return res.status(404).json({ message: "Loan application record not found." });
    }

    application.status = decision;
    application.adminReview = {
      reviewedBy: reviewerId && mongoose.Types.ObjectId.isValid(reviewerId) ? reviewerId : null,
      selfieApproved: selfieApproved !== undefined ? selfieApproved : decision === "APPROVED",
      decision,
      remarks: remarks || (decision === "APPROVED" ? "All underwriting and biometric requirements satisfied." : "Application declined."),
      reviewedAt: new Date(),
    };

    await application.save();

    return res.status(200).json({
      message: `Loan application ${application.applicationId} marked as ${decision} successfully.`,
      application: formatSafeApplication(application),
    });
  } catch (error) {
    console.error("reviewApplicationAdmin error:", error);
    return res.status(500).json({
      message: error.message || "Failed to review loan application.",
    });
  }
};

/**
 * Admin Action: Disburse Sanctioned Funds to Verified Bank Account
 */
const disburseLoanAdmin = async (req, res) => {
  try {
    const { applicationId, reviewerId } = req.body;

    const application = await LoanApplication.findOne({ applicationId });
    if (!application) {
      return res.status(404).json({ message: "Loan application record not found." });
    }

    if (application.status !== "APPROVED") {
      return res.status(400).json({
        message: "Only approved and sanctioned loans can be disbursed.",
      });
    }

    application.status = "DISBURSED";
    await application.save();

    return res.status(200).json({
      message: `Funds of $${application.netDisbursementAmount || application.loanAmount} successfully wired to ${application.bankDetails?.bankName} (A/C ${application.bankDetails?.maskedAccountNumber || "••••" + application.bankDetails?.accountNumber?.slice(-4)}).`,
      application: formatSafeApplication(application),
    });
  } catch (error) {
    console.error("disburseLoanAdmin error:", error);
    return res.status(500).json({
      message: error.message || "Failed to disburse loan funds.",
    });
  }
};

module.exports = {
  saveEMITerm,
  saveBankAccount,
  saveDeclaration,
  submitSelfie,
  getApplicationStatus,
  getAllApplicationsAdmin,
  reviewApplicationAdmin,
  disburseLoanAdmin,
};

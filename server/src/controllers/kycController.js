const mongoose = require("mongoose");
const KYC = require("../models/KYC");
const User = require("../models/User");
const { encrypt, decrypt, maskIdNumber } = require("../utils/encryption");

/**
 * Format KYC document safely for client (Never expose raw PII)
 */
function formatSafeKYC(kycDoc) {
  if (!kycDoc) return null;
  const obj = kycDoc.toObject ? kycDoc.toObject() : { ...kycDoc };
  const rawDecrypted = decrypt(obj.idNumber);
  obj.maskedIdNumber = obj.maskedIdNumber || maskIdNumber(obj.idType, rawDecrypted);
  obj.idNumber = obj.maskedIdNumber; // Replace raw idNumber with masked version in API responses
  return obj;
}

/**
 * Submit or Update Customer KYC
 */
const submitKYC = async (req, res) => {
  try {
    const {
      userId,
      email,
      fullName,
      dob,
      gender,
      address,
      idType,
      idNumber,
      idDocumentUrl,
      idDocumentFileName,
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
        message: "User account not found. Please log in first.",
      });
    }

    // 2. Validate Required Fields
    if (!fullName || !dob || !gender || !address || !idType || !idNumber) {
      return res.status(400).json({
        message: "Full name, date of birth, gender, address, ID type, and ID number are required.",
      });
    }

    if (!address.street || !address.city || !address.state || !address.pincode) {
      return res.status(400).json({
        message: "Complete address (Street, City, State, and PIN code) is required.",
      });
    }

    // 3. Age Calculation & Validation
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) {
      return res.status(400).json({
        message: "Invalid Date of Birth format.",
      });
    }

    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);

    if (age < 18) {
      return res.status(400).json({
        message: "Applicant must be at least 18 years old to apply for lending facilities.",
      });
    }

    // 4. ID Format Validation (Simulated Standard Banking Regex)
    const cleanIdNumber = idNumber.trim().toUpperCase();

    if (idType === "PAN") {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(cleanIdNumber)) {
        return res.status(400).json({
          message: "Invalid PAN format. Standard format: ABCDE1234F (5 letters, 4 digits, 1 letter).",
        });
      }
    } else if (idType === "Aadhaar") {
      const cleanAadhaar = cleanIdNumber.replace(/\s+/g, "");
      if (!/^\d{12}$/.test(cleanAadhaar)) {
        return res.status(400).json({
          message: "Invalid Aadhaar number. Must be exactly 12 numerical digits.",
        });
      }
    }

    // 5. Upsert KYC record with AES-256 encrypted ID number and masked representation
    const encryptedIdNumber = encrypt(cleanIdNumber);
    const maskedId = maskIdNumber(idType, cleanIdNumber);

    const kycData = {
      userId: user._id,
      fullName: fullName.trim(),
      dob: birthDate,
      age: age,
      gender: gender.toLowerCase(),
      address: {
        street: address.street.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        pincode: address.pincode.trim(),
        country: address.country ? address.country.trim() : "India",
      },
      idType,
      idNumber: encryptedIdNumber,
      maskedIdNumber: maskedId,
      isEncrypted: true,
      idDocumentUrl: idDocumentUrl || null,
      idDocumentFileName: idDocumentFileName || null,
      status: "VERIFIED",
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: new Date(),
    };

    let kycRecord = await KYC.findOne({ userId: user._id });

    if (kycRecord) {
      Object.assign(kycRecord, kycData);
      await kycRecord.save();
    } else {
      kycRecord = await KYC.create(kycData);
    }

    // 6. Update User's KYC status to VERIFIED
    user.kycStatus = "VERIFIED";
    user.kycId = kycRecord._id;
    await user.save();

    return res.status(200).json({
      message: "KYC identity and address verified successfully.",
      kyc: formatSafeKYC(kycRecord),
      kycStatus: "VERIFIED",
    });
  } catch (error) {
    console.error("submitKYC error:", error);
    return res.status(500).json({
      message: error.message || "Failed to verify KYC details.",
    });
  }
};

/**
 * Get KYC Status for a Customer
 */
const getKYCStatus = async (req, res) => {
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

    const kycRecord = await KYC.findOne({ userId: user._id });

    let effectiveKycStatus = "NOT_SUBMITTED";
    if (kycRecord) {
      effectiveKycStatus = kycRecord.status || user.kycStatus || "VERIFIED";
    } else {
      effectiveKycStatus = "NOT_SUBMITTED";
      if (user.kycStatus && user.kycStatus !== "NOT_SUBMITTED") {
        user.kycStatus = "NOT_SUBMITTED";
        user.kycId = null;
        await user.save();
      }
    }

    return res.status(200).json({
      kycStatus: effectiveKycStatus,
      kyc: formatSafeKYC(kycRecord),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("getKYCStatus error:", error);
    return res.status(500).json({
      message: "Failed to retrieve KYC status.",
    });
  }
};

/**
 * Get All KYC Submissions for Admin Console
 */
const getAllKYCSubmissions = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status.toUpperCase();
    }

    const submissions = await KYC.find(filter)
      .populate("userId", "name email phone role kycStatus createdAt")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    console.error("getAllKYCSubmissions error:", error);
    return res.status(500).json({
      message: "Failed to load KYC submissions.",
    });
  }
};

/**
 * Admin Review (Approve / Reject) KYC Submission
 */
const reviewKYC = async (req, res) => {
  try {
    const { kycId, status, rejectionReason, reviewerId } = req.body;

    if (!kycId || !status || !["VERIFIED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        message: "Valid KYC ID and decision status ('VERIFIED' or 'REJECTED') are required.",
      });
    }

    const kycRecord = await KYC.findById(kycId);
    if (!kycRecord) {
      return res.status(404).json({
        message: "KYC record not found.",
      });
    }

    kycRecord.status = status;
    kycRecord.rejectionReason = status === "REJECTED" ? rejectionReason || "Document details could not be verified." : null;
    kycRecord.reviewedAt = new Date();

    if (reviewerId && mongoose.Types.ObjectId.isValid(reviewerId)) {
      kycRecord.reviewedBy = reviewerId;
    }

    await kycRecord.save();

    // Update the corresponding User
    await User.findByIdAndUpdate(kycRecord.userId, {
      kycStatus: status,
    });

    return res.status(200).json({
      message: `KYC submission marked as ${status} successfully.`,
      kyc: kycRecord,
    });
  } catch (error) {
    console.error("reviewKYC error:", error);
    return res.status(500).json({
      message: error.message || "Failed to review KYC submission.",
    });
  }
};

module.exports = {
  submitKYC,
  getKYCStatus,
  getAllKYCSubmissions,
  reviewKYC,
};

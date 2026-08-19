const express = require("express");
const {
  saveEMITerm,
  saveBankAccount,
  saveDeclaration,
  submitSelfie,
  getApplicationStatus,
  getAllApplicationsAdmin,
  reviewApplicationAdmin,
} = require("../controllers/applicationController");

const router = express.Router();

// Customer Endpoints (Steps 5 to 8)
router.post("/emi-term", saveEMITerm);
router.post("/bank-account", saveBankAccount);
router.post("/declaration", saveDeclaration);
router.post("/selfie", submitSelfie);
router.get("/status", getApplicationStatus);

// Admin Underwriting & Selfie Approval Endpoints
router.get("/admin/all", getAllApplicationsAdmin);
router.post("/admin/review", reviewApplicationAdmin);

module.exports = router;

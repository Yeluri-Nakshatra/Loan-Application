const express = require("express");
const {
  submitKYC,
  getKYCStatus,
  getAllKYCSubmissions,
  reviewKYC,
} = require("../controllers/kycController");

const router = express.Router();

// Customer Endpoints
router.post("/submit", submitKYC);
router.get("/status", getKYCStatus);

// Admin Underwriting Review Endpoints
router.get("/admin/all", getAllKYCSubmissions);
router.post("/admin/review", reviewKYC);

module.exports = router;

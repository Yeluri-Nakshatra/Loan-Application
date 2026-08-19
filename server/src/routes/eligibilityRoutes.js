const express = require("express");
const {
  checkEligibility,
  getLatestEligibility,
} = require("../controllers/eligibilityController");

const router = express.Router();

router.post("/check", checkEligibility);
router.get("/latest", getLatestEligibility);

module.exports = router;

const express = require("express");

const {
  signup,
  verifyEmail,
  verifyPhone,
  resendEmailOTP,
  resendPhoneOTP,
  login,
  forgotPassword,
  resetPassword,
  sendPhoneLoginOTP,
  loginWithPhoneOTP,
  // Step-by-step signup controllers
  sendSignupEmailOTP,
  verifySignupEmailOTP,
  sendSignupPhoneOTP,
  verifySignupPhoneOTP,
  completeSignup,
  // Third-party OAuth
  getGoogleAuthURL,
  handleGoogleCallback,
  registerAdmin,
} = require("../controllers/authController");

const {
    requireRole
} = require("../middlewares/authMiddleware");

const { verifySession } = require("supertokens-node/recipe/session/framework/express");
const router = express.Router();

// Admin Management
router.post("/register-admin", verifySession(), requireRole("admin"), registerAdmin);


// Step-by-Step Interactive Signup Routes
router.post("/signup/send-email-otp", sendSignupEmailOTP);
router.post("/signup/verify-email-otp", verifySignupEmailOTP);
router.post("/signup/send-phone-otp", sendSignupPhoneOTP);
router.post("/signup/verify-phone-otp", verifySignupPhoneOTP);
router.post("/complete-signup", completeSignup);

// Signup
router.post(
  "/signup",
  signup
);

// Email verification
router.post(
  "/verify-email",
  verifyEmail
);

// Resend email OTP
router.post(
  "/resend-email-otp",
  resendEmailOTP
);

// Phone verification
router.post(
  "/verify-phone",
  verifyPhone
);

// Resend phone OTP
router.post(
  "/resend-phone-otp",
  resendPhoneOTP
);
router.post("/login", login);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.post(
    "/phone-login/send-otp",
    sendPhoneLoginOTP
);

router.post(
    "/phone-login/verify-otp",
    loginWithPhoneOTP
);

// Third-Party OAuth Routes
router.get("/google/url", getGoogleAuthURL);
router.post("/google/callback", handleGoogleCallback);

// router.get(
//     "/dashboard",
//     requireRole("admin"),
//     (req, res) => {
//         res.json({
//             message: "Welcome to Admin Dashboard",
//             user: req.user
//         });
//     }
// );

module.exports = router;

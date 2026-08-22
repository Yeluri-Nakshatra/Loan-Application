
const User = require("../models/User");
const generateOTP = require("../utils/otpGenerator");
const { sendEmailOTP, sendPasswordResetEmail, sendPhoneBackupEmailOTP } = require("../services/emailService");
const { enqueueNotification } = require("../queues/notificationQueue");
const {
    sendPhoneOTP,
} = require("../services/phoneService");

const EmailPassword = require("supertokens-node/recipe/emailpassword");
const ThirdParty = require("supertokens-node/recipe/thirdparty");

const supertokens = require("supertokens-node");
const { RecipeUserId } = require("supertokens-node");

const Session = require(
    "supertokens-node/recipe/session"
);
const {
    createSuperTokensUser
} = require("../services/supertokensService");
const {
    deleteSuperTokensUser
} = require("../services/supertokensService");
const {
    getSuperTokensUserByEmail
} = require("../services/supertokensService");


const signup = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            phone,
            role,
        } = req.body;

        // -----------------------------------
        // 1. Validate fields
        // -----------------------------------

        if (
            !name ||
            !email ||
            !password ||
            !phone ||
            !role
        ) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }

        // -----------------------------------
        // 2. Validate role
        // -----------------------------------

        if (!["customer", "admin"].includes(role)) {
            return res.status(400).json({
                message: "Invalid role",
            });
        }

        // -----------------------------------
        // 3. Check MongoDB email
        // -----------------------------------

        const existingEmail = await User.findOne({
            email,
        });

        if (existingEmail) {

            // Signup already completed
            if (existingEmail.signupCompleted) {
                return res.status(400).json({
                    message: "Email already registered",
                });
            }

            // Signup started but not completed
            return res.status(400).json({
                message:
                    "Signup already started. Please continue verification.",
                userId: existingEmail._id,
            });
        }

        // -----------------------------------
        // 4. Check MongoDB phone
        // -----------------------------------

        const existingPhone = await User.findOne({
            phone,
        });

        if (existingPhone) {
            return res.status(400).json({
                message: "Phone number already registered",
            });
        }

        // -----------------------------------
        // 5. Check SuperTokens
        // -----------------------------------

        let superTokensUser =
            await getSuperTokensUserByEmail(email);

        // -----------------------------------
        // 6. Remove orphan SuperTokens user
        // -----------------------------------

        if (superTokensUser) {

            console.log(
                "Orphan SuperTokens user found:",
                superTokensUser.userId
            );

            const deleteResult =
                await deleteSuperTokensUser(
                    superTokensUser.userId
                );

            if (!deleteResult.success) {

                console.error(
                    "Failed to delete orphan SuperTokens user"
                );

                return res.status(500).json({
                    message:
                        "Existing authentication account found but could not be cleaned up.",
                });
            }

            console.log(
                "Old SuperTokens user deleted"
            );

            // No need to declare it again.
            superTokensUser = null;
        }

        // -----------------------------------
        // 7. Generate Email OTP
        // -----------------------------------

        const emailOtp = generateOTP();

        const emailOtpExpiresAt = new Date(
            Date.now() + 5 * 60 * 1000
        );

        // -----------------------------------
        // 8. Create SuperTokens account
        // -----------------------------------

        try {

            superTokensUser =
                await createSuperTokensUser(
                    email,
                    password
                );

            // Check creation result
            if (!superTokensUser.success) {

                if (
                    superTokensUser.reason ===
                    "EMAIL_ALREADY_EXISTS"
                ) {
                    return res.status(409).json({
                        message:
                            "Authentication account already exists.",
                    });
                }

                return res.status(500).json({
                    message:
                        "Failed to create authentication account",
                });
            }

            // -----------------------------------
            // 9. Create MongoDB user
            // -----------------------------------

            const user = await User.create({

                name,

                email,

                phone,

                role,

                supertokensUserId:
                    superTokensUser.userId,

                emailVerified: false,

                emailOtp,

                emailOtpExpiresAt,

                phoneVerified: false,

                phoneOtp: null,

                phoneOtpExpiresAt: null,

                signupCompleted: false,
            });

            // -----------------------------------
            // 10. Send Email OTP
            // -----------------------------------

            await sendEmailOTP(
                email,
                emailOtp
            );

            // -----------------------------------
            // 11. Response
            // -----------------------------------

            return res.status(201).json({

                message:
                    "Signup details saved. Email OTP sent.",

                userId: user._id,

            });

        } catch (error) {

            // -----------------------------------
            // Cleanup SuperTokens account
            // if MongoDB creation or another
            // operation fails
            // -----------------------------------

            if (
                superTokensUser &&
                superTokensUser.success
            ) {

                console.log(
                    "Cleaning up SuperTokens account:",
                    superTokensUser.userId
                );

                const deleteResult =
                    await deleteSuperTokensUser(
                        superTokensUser.userId
                    );

                if (!deleteResult.success) {
                    console.error(
                        "Failed to cleanup SuperTokens user:",
                        deleteResult.error
                    );
                }
            }

            throw error;
        }

    } catch (error) {

        console.error(
            "Signup error:",
            error
        );

        return res.status(500).json({
            message: "Signup failed",
        });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { userId, otp } = req.body;

        // 1. Validate input
        if (!userId || !otp) {
            return res.status(400).json({
                message: "User ID and OTP are required",
            });
        }

        // 2. Find user
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        // 3. Check whether email is already verified
        if (user.emailVerified) {
            return res.status(400).json({
                message: "Email is already verified",
            });
        }

        // 4. Check whether OTP exists
        if (!user.emailOtp) {
            return res.status(400).json({
                message: "OTP not found. Please request a new OTP",
            });
        }

        // 5. Check OTP expiry
        if (
            !user.emailOtpExpiresAt ||
            user.emailOtpExpiresAt < new Date()
        ) {
            return res.status(400).json({
                message: "OTP has expired",
            });
        }

        // 6. Compare OTP
        if (user.emailOtp !== otp) {
            return res.status(400).json({
                message: "Invalid OTP",
            });
        }

        // 7. Mark email as verified
        user.emailVerified = true;

        // 8. Remove used email OTP
        user.emailOtp = null;
        user.emailOtpExpiresAt = null;

        // 9. Generate phone OTP
        const phoneOtp = generateOTP();

        // 10. Set phone OTP expiry
        const phoneOtpExpiresAt = new Date(
            Date.now() + 5 * 60 * 1000
        );

        // 11. Save phone OTP
        user.phoneOtp = phoneOtp;
        user.phoneOtpExpiresAt = phoneOtpExpiresAt;

        // 12. Save changes
        await user.save();

        // 13. Send phone OTP via SMS + Email backup
        await sendPhoneOTP(
            user.phone,
            phoneOtp
        );
        if (user.email) {
            await sendPhoneBackupEmailOTP(user.email, user.phone, phoneOtp);
        }

        // 14. Response
        return res.status(200).json({
            message:
                "Email verified successfully. Phone verification OTP sent.",
            userId: user._id,
            devOtp: phoneOtp,
        });

    } catch (error) {
        console.error(
            "Email verification error:",
            error
        );

        return res.status(500).json({
            message: "Email verification failed",
        });
    }
};

const verifyPhone = async (req, res) => {
    try {
        const { userId, otp } = req.body;

        if (!userId || !otp) {
            return res.status(400).json({
                message: "User ID and OTP are required",
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        if (!user.emailVerified) {
            return res.status(400).json({
                message: "Please verify your email first",
            });
        }

        if (user.phoneVerified) {
            return res.status(400).json({
                message: "Phone number is already verified",
            });
        }

        if (!user.phoneOtp) {
            return res.status(400).json({
                message: "OTP not found. Please request a new OTP",
            });
        }

        if (
            !user.phoneOtpExpiresAt ||
            user.phoneOtpExpiresAt < new Date()
        ) {
            return res.status(400).json({
                message: "OTP has expired",
            });
        }

        if (user.phoneOtp !== otp) {
            return res.status(400).json({
                message: "Invalid OTP",
            });
        }

        // Mark phone as verified
        user.phoneVerified = true;

        // Remove OTP
        user.phoneOtp = null;
        user.phoneOtpExpiresAt = null;

        // Complete signup
        if (
            user.emailVerified &&
            user.phoneVerified
        ) {
            user.signupCompleted = true;
        }

        await user.save();

        return res.status(200).json({
            message: "Signup successful",

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                emailVerified: user.emailVerified,
                phoneVerified: user.phoneVerified,
                signupCompleted: user.signupCompleted,
            },
        });

    } catch (error) {
        console.error(
            "Phone verification error:",
            error
        );

        return res.status(500).json({
            message: "Phone verification failed",
        });
    }
};

const resendEmailOTP = async (req, res) => {
    try {
        const { userId } = req.body;

        // 1. Validate userId
        if (!userId) {
            return res.status(400).json({
                message: "User ID is required",
            });
        }

        // 2. Find user
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        // 3. Check whether email is already verified
        if (user.emailVerified) {
            return res.status(400).json({
                message: "Email is already verified",
            });
        }

        // 4. Generate new OTP
        const emailOtp = generateOTP();

        // 5. New expiry - 5 minutes
        const emailOtpExpiresAt = new Date(
            Date.now() + 5 * 60 * 1000
        );

        // 6. Replace old OTP
        user.emailOtp = emailOtp;
        user.emailOtpExpiresAt = emailOtpExpiresAt;

        // 7. Save
        await user.save();

        // 8. Send new OTP
        await sendEmailOTP(
            user.email,
            emailOtp
        );

        return res.status(200).json({
            message: "New email OTP sent successfully",
        });

    } catch (error) {
        console.error(
            "Resend email OTP error:",
            error
        );

        return res.status(500).json({
            message: "Failed to resend email OTP",
        });
    }
};

const resendPhoneOTP = async (req, res) => {
    try {
        const { userId } = req.body;

        // 1. Validate userId
        if (!userId) {
            return res.status(400).json({
                message: "User ID is required",
            });
        }

        // 2. Find user
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        // 3. Email must be verified first
        if (!user.emailVerified) {
            return res.status(400).json({
                message: "Please verify your email first",
            });
        }

        // 4. Check whether phone is already verified
        if (user.phoneVerified) {
            return res.status(400).json({
                message: "Phone number is already verified",
            });
        }

        // 5. Generate new OTP
        const phoneOtp = generateOTP();

        // 6. New expiry - 5 minutes
        const phoneOtpExpiresAt = new Date(
            Date.now() + 5 * 60 * 1000
        );

        // 7. Replace old OTP
        user.phoneOtp = phoneOtp;
        user.phoneOtpExpiresAt = phoneOtpExpiresAt;

        // 8. Save
        await user.save();

        // 9. Send new OTP via SMS + Email backup
        await sendPhoneOTP(
            user.phone,
            phoneOtp
        );
        if (user.email) {
            await sendPhoneBackupEmailOTP(user.email, user.phone, phoneOtp);
        }

        return res.status(200).json({
            message: "New phone verification code sent successfully.",
            devOtp: phoneOtp,
        });

    } catch (error) {
        console.error(
            "Resend phone OTP error:",
            error
        );

        return res.status(500).json({
            message: "Failed to resend phone OTP",
        });
    }
};

const login = async (req, res) => {
    try {

        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        // Find MongoDB user
        const user = await User.findOne({ email });

        console.log("LOGIN EMAIL:", email);

        console.log(
            "MONGODB USER:",
            user
                ? {
                    id: user._id,
                    email: user.email,
                    signupCompleted:
                        user.signupCompleted,
                    supertokensUserId:
                        user.supertokensUserId
                }
                : null
        );

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Signup must be completed
        if (!user.signupCompleted) {
            return res.status(403).json({
                message:
                    "Please complete signup verification first"
            });
        }

        // Check if selected role matches registered user role
        if (role && user.role !== role) {
            const roleName = user.role === "admin" ? "Loan Officer / Admin" : "Customer / Loan Applicant";
            const requestedRoleName = role === "admin" ? "Loan Officer / Admin" : "Customer / Loan Applicant";
            return res.status(403).json({
                message: `Access denied: Your account is registered as "${roleName}", not "${requestedRoleName}". Please select your correct account role.`
            });
        }

        // Verify email/password with SuperTokens
        const result = await EmailPassword.signIn(
            "public",
            email,
            password
        );

        console.log(
            "SUPERTOKENS LOGIN RESULT:",
            result.status
        );

        if (result.status === "WRONG_CREDENTIALS_ERROR") {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        if (result.status !== "OK") {
            return res.status(401).json({
                message: "Login failed"
            });
        }

        console.log(
            "SUPERTOKENS USER ID:",
            result.recipeUserId.getAsString()
        );

        // Create session


        const recipeUserId = new RecipeUserId(
            result.recipeUserId.getAsString()
        );

        await Session.createNewSession(
            req,
            res,
            "public",
            result.recipeUserId
        );

        return res.status(200).json({
            message: "Login successful",

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        // 1. Find user in MongoDB
        const user = await User.findOne({ email });

        if (!user || !user.signupCompleted) {
            // Do not reveal whether the email exists
            return res.status(200).json({
                message:
                    "If an account exists with this email, a password reset link has been sent."
            });
        }

        // 2. Get SuperTokens user
        const superTokensUser =
            await getSuperTokensUserByEmail(email);

        if (!superTokensUser) {
            return res.status(200).json({
                message:
                    "If an account exists with this email, a password reset link has been sent."
            });
        }

        // 3. Create password reset link
        const resetResult =
            await EmailPassword.createResetPasswordLink(
                "public",
                superTokensUser.userId,
                email
            );

        console.log(
            "RESET RESULT:",
            resetResult
        );

        if (resetResult.status !== "OK") {
            return res.status(500).json({
                message: "Unable to create password reset link"
            });
        }

        // 4. Send reset link through your email service
        await sendPasswordResetEmail(
            email,
            resetResult.link
        );

        return res.status(200).json({
            message:
                "If an account exists with this email, a password reset link has been sent."
        });

    } catch (error) {

        console.error(
            "Forgot password error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to process forgot password request"
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        // 1. Validate input
        if (!token || !password) {
            return res.status(400).json({
                message: "Token and new password are required"
            });
        }

        // 2. Validate password
        if (password.length < 8) {
            return res.status(400).json({
                message:
                    "Password must be at least 8 characters long"
            });
        }

        // 3. Reset password using SuperTokens
        const result =
            await EmailPassword.resetPasswordUsingToken(
                "public",
                token,
                password
            );

        console.log(
            "RESET PASSWORD RESULT:",
            result
        );

        // 4. Invalid / expired token
        if (
            result.status ===
            "RESET_PASSWORD_INVALID_TOKEN_ERROR"
        ) {
            return res.status(400).json({
                message:
                    "Reset link is invalid or has expired"
            });
        }

        // 5. Other unexpected status
        if (result.status !== "OK") {
            return res.status(400).json({
                message:
                    "Unable to reset password"
            });
        }

        // 6. Password successfully changed
        return res.status(200).json({
            message:
                "Password reset successfully"
        });

    } catch (error) {

        console.error(
            "Reset password error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to reset password"
        });
    }
};

const sendPhoneLoginOTP = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                message: "Phone number is required"
            });
        }

        // Find registered user
        const user = await User.findOne({ phone });

        if (!user) {
            return res.status(404).json({
                message: "Phone number is not registered"
            });
        }

        // Make sure signup is completed
        if (!user.signupCompleted) {
            return res.status(403).json({
                message: "Please complete signup first"
            });
        }

        // Generate OTP
        const otp = generateOTP();

        // OTP valid for 5 minutes
        user.phoneLoginOtp = otp;
        user.phoneLoginOtpExpiresAt = new Date(
            Date.now() + 5 * 60 * 1000
        );

        await user.save();

        // Send OTP via SMS + Email backup
        await sendPhoneOTP(
            user.phone,
            otp
        );
        if (user.email) {
            await sendPhoneBackupEmailOTP(user.email, user.phone, otp);
        }

        return res.status(200).json({
            message: "OTP sent successfully to your mobile and email.",
            userId: user._id,
            devOtp: otp,
        });

    } catch (error) {
        console.error(
            "Phone login OTP error:",
            error
        );

        return res.status(500).json({
            message: "Failed to send OTP"
        });
    }
};

const loginWithPhoneOTP = async (req, res) => {
    try {

        const { phone, otp, role } = req.body;

        // 1. Validate
        if (!phone || !otp) {
            return res.status(400).json({
                message:
                    "Phone number and OTP are required"
            });
        }

        // 2. Find user
        const user = await User.findOne({
            phone
        });

        if (!user) {
            return res.status(401).json({
                message:
                    "Invalid phone number or OTP"
            });
        }

        // 3. Check signup
        if (!user.signupCompleted) {
            return res.status(403).json({
                message:
                    "Please complete signup first"
            });
        }

        // Check if selected role matches registered user role
        if (role && user.role !== role) {
            const roleName = user.role === "admin" ? "Loan Officer / Admin" : "Customer / Loan Applicant";
            const requestedRoleName = role === "admin" ? "Loan Officer / Admin" : "Customer / Loan Applicant";
            return res.status(403).json({
                message: `Access denied: Your account is registered as "${roleName}", not "${requestedRoleName}". Please select your correct account role.`
            });
        }

        // 4. Check phone verification
        if (!user.phoneVerified) {
            return res.status(403).json({
                message:
                    "Phone number is not verified"
            });
        }

        // 5. Check OTP exists
        if (!user.phoneLoginOtp) {
            return res.status(400).json({
                message:
                    "OTP not found. Please request a new OTP"
            });
        }

        // 6. Check expiry
        if (
            !user.phoneLoginOtpExpiresAt ||
            user.phoneLoginOtpExpiresAt < new Date()
        ) {
            return res.status(400).json({
                message:
                    "OTP has expired. Please request a new OTP"
            });
        }

        // 7. Compare OTP
        if (user.phoneLoginOtp !== otp) {
            return res.status(401).json({
                message:
                    "Invalid phone number or OTP"
            });
        }

        // 8. Clear OTP
        user.phoneLoginOtp = null;

        user.phoneLoginOtpExpiresAt = null;

        await user.save();

        // 9. Create SuperTokens session
        const recipeUserId =
            new supertokens.RecipeUserId(
                user.supertokensUserId
            );

        await Session.createNewSession(
            req,
            res,
            "public",
            recipeUserId
        );

        // 10. Success
        return res.status(200).json({

            message:
                "Phone login successful",

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }

        });

    } catch (error) {

        console.error(
            "Phone login error:",
            error
        );

        return res.status(500).json({
            message:
                "Phone login failed"
        });
    }
};

/*
|--------------------------------------------------------------------------
| Step-by-Step Interactive Signup Controllers
|--------------------------------------------------------------------------
*/

const sendSignupEmailOTP = async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                message: "Full name and email address are required",
            });
        }

        const trimmedEmail = email.trim().toLowerCase();
        const trimmedName = name.trim();

        // Check if an existing completed user already exists
        const existingUser = await User.findOne({ email: trimmedEmail });
        if (existingUser && existingUser.signupCompleted) {
            return res.status(400).json({
                message: "An account with this email already exists. Please log in.",
            });
        }

        // Generate 6-digit OTP & 5 min expiry
        const emailOtp = generateOTP();
        const emailOtpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

        let user;
        if (existingUser) {
            // Update draft user
            existingUser.name = trimmedName;
            existingUser.emailOtp = emailOtp;
            existingUser.emailOtpExpiresAt = emailOtpExpiresAt;
            existingUser.emailVerified = false;
            user = await existingUser.save();
        } else {
            // Create fresh draft user
            user = await User.create({
                name: trimmedName,
                email: trimmedEmail,
                emailVerified: false,
                emailOtp,
                emailOtpExpiresAt,
                phoneVerified: false,
                signupCompleted: false,
            });
        }

        if (req.query.sync === 'true') {
            const { sendEmailOTP } = require("../services/emailService");
            await sendEmailOTP(trimmedEmail, emailOtp);
        } else {
            // Dispatch Email OTP to Redis Queue (Async)
            enqueueNotification("SEND_EMAIL_OTP", { email: trimmedEmail, otp: emailOtp });
        }

        return res.status(200).json({
            message: "Verification code sent to your email.",
            userId: user._id,
        });
    } catch (error) {
        console.error("sendSignupEmailOTP error:", error);
        return res.status(500).json({
            message: "Failed to send email verification code",
        });
    }
};

const verifySignupEmailOTP = async (req, res) => {
    try {
        const { userId, otp } = req.body;

        if (!userId || !otp) {
            return res.status(400).json({
                message: "User ID and verification code are required",
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User registration record not found",
            });
        }

        if (user.emailVerified) {
            return res.status(200).json({
                message: "Email is already verified",
                userId: user._id,
                emailVerified: true,
            });
        }

        if (!user.emailOtp) {
            return res.status(400).json({
                message: "No pending verification code found. Please request a new code.",
            });
        }

        if (!user.emailOtpExpiresAt || user.emailOtpExpiresAt < new Date()) {
            return res.status(400).json({
                message: "Verification code has expired. Please request a new code.",
            });
        }

        if (user.emailOtp !== otp.trim()) {
            return res.status(400).json({
                message: "Invalid verification code. Please check and try again.",
            });
        }

        // Mark verified and clear OTP
        user.emailVerified = true;
        user.emailOtp = null;
        user.emailOtpExpiresAt = null;
        await user.save();

        return res.status(200).json({
            message: "Email verified successfully.",
            userId: user._id,
            emailVerified: true,
            phoneVerified: user.phoneVerified || false,
            phone: user.phone || "",
            name: user.name || "",
        });
    } catch (error) {
        console.error("verifySignupEmailOTP error:", error);
        return res.status(500).json({
            message: "Failed to verify email",
        });
    }
};

const sendSignupPhoneOTP = async (req, res) => {
    try {
        const { userId, phone } = req.body;

        if (!userId || !phone) {
            return res.status(400).json({
                message: "User ID and phone number are required",
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User registration record not found",
            });
        }

        if (!user.emailVerified) {
            return res.status(400).json({
                message: "Please complete email verification first",
            });
        }

        const trimmedPhone = phone.trim();

        // Check if phone number is already registered to another active user
        const existingPhoneUser = await User.findOne({
            phone: trimmedPhone,
            _id: { $ne: user._id },
            signupCompleted: true,
        });

        if (existingPhoneUser) {
            return res.status(400).json({
                message: "This phone number is already registered to another account",
            });
        }

        const phoneOtp = generateOTP();
        const phoneOtpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

        user.phone = trimmedPhone;
        user.phoneOtp = phoneOtp;
        user.phoneOtpExpiresAt = phoneOtpExpiresAt;
        user.phoneVerified = false;
        await user.save();

        // Dispatch phone OTP via Redis Queue (Async)
        enqueueNotification("SEND_PHONE_OTP", { 
            phone: trimmedPhone, 
            otp: phoneOtp, 
            email: user.email 
        });

        return res.status(200).json({
            message: "Verification code sent to your phone and email.",
            userId: user._id,
            devOtp: phoneOtp,
        });
    } catch (error) {
        console.error("sendSignupPhoneOTP error:", error);
        return res.status(500).json({
            message: "Failed to send phone verification code",
        });
    }
};

const verifySignupPhoneOTP = async (req, res) => {
    try {
        const { userId, otp } = req.body;

        if (!userId || !otp) {
            return res.status(400).json({
                message: "User ID and verification code are required",
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User registration record not found",
            });
        }

        if (!user.emailVerified) {
            return res.status(400).json({
                message: "Please verify your email first",
            });
        }

        if (user.phoneVerified) {
            return res.status(200).json({
                message: "Phone number is already verified",
                userId: user._id,
                phoneVerified: true,
            });
        }

        if (!user.phoneOtp) {
            return res.status(400).json({
                message: "No pending verification code found. Please request a new code.",
            });
        }

        if (!user.phoneOtpExpiresAt || user.phoneOtpExpiresAt < new Date()) {
            return res.status(400).json({
                message: "Verification code has expired. Please request a new code.",
            });
        }

        if (user.phoneOtp !== otp.trim()) {
            return res.status(400).json({
                message: "Invalid verification code. Please check and try again.",
            });
        }

        user.phoneVerified = true;
        user.phoneOtp = null;
        user.phoneOtpExpiresAt = null;
        await user.save();

        return res.status(200).json({
            message: "Phone number verified successfully.",
            userId: user._id,
            phoneVerified: true,
        });
    } catch (error) {
        console.error("verifySignupPhoneOTP error:", error);
        return res.status(500).json({
            message: "Failed to verify phone number",
        });
    }
};

const completeSignup = async (req, res) => {
    try {
        const { userId, password, role } = req.body;

        if (!userId || !password) {
            return res.status(400).json({
                message: "User ID and password are required",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long",
            });
        }

        const selectedRole = role && ["customer", "admin"].includes(role) ? role : "customer";

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User registration record not found",
            });
        }

        if (!user.emailVerified || !user.phoneVerified) {
            return res.status(400).json({
                message: "Please complete both email and phone verification before finalizing registration",
            });
        }

        // Clean up any orphan SuperTokens user if one exists for this email
        let superTokensUser = await getSuperTokensUserByEmail(user.email);
        if (superTokensUser) {
            console.log("Cleaning orphan SuperTokens user before registration:", superTokensUser.userId);
            await deleteSuperTokensUser(superTokensUser.userId);
        }

        // Create SuperTokens user with verified email and password
        const stResult = await createSuperTokensUser(user.email, password);
        if (!stResult.success) {
            return res.status(500).json({
                message: "Failed to establish secure authentication credentials.",
            });
        }

        // Finalize MongoDB User
        user.supertokensUserId = stResult.userId;
        user.role = selectedRole;
        user.signupCompleted = true;
        await user.save();

        return res.status(201).json({
            message: "Account created and verified successfully.",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                emailVerified: user.emailVerified,
                phoneVerified: user.phoneVerified,
                signupCompleted: user.signupCompleted,
            },
        });
    } catch (error) {
        console.error("completeSignup error:", error);
        return res.status(500).json({
            message: "Failed to complete account registration",
        });
    }
};

/*
|--------------------------------------------------------------------------
| Third-Party OAuth (Google) Controllers with SuperTokens
|--------------------------------------------------------------------------
*/

const getGoogleAuthURL = async (req, res) => {
    try {
        const role = req.query.role || "customer";
        const mode = req.query.mode || "login"; // 'login' | 'signup'
        const clientId = process.env.GOOGLE_CLIENT_ID;

        if (!clientId) {
            return res.status(500).json({
                message: "Google Client ID is not configured on the server."
            });
        }

        const redirectUri = "https://loan-application-nine-pi.vercel.app/auth/callback/google";
        const scope = "openid email profile";
        const state = JSON.stringify({ role, mode });

        const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}&access_type=offline&prompt=consent`;

        return res.status(200).json({ url });
    } catch (error) {
        console.error("getGoogleAuthURL error:", error);
        return res.status(500).json({
            message: "Failed to generate Google OAuth URL"
        });
    }
};

const handleGoogleCallback = async (req, res) => {
    try {
        const { code, role, mode } = req.body;

        if (!code) {
            return res.status(400).json({
                message: "Authorization code is required"
            });
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = "https://loan-application-nine-pi.vercel.app/auth/callback/google";

        // 1. Exchange authorization code with Google for tokens
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });

        const tokenData = await tokenRes.json();

        if (!tokenRes.ok || !tokenData.access_token) {
            console.error("Google token exchange error:", tokenData);
            return res.status(400).json({
                message: tokenData.error_description || "Failed to authenticate with Google"
            });
        }

        // 2. Fetch user profile from Google
        const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        const googleUser = await userRes.json();

        if (!googleUser || !googleUser.email) {
            return res.status(400).json({
                message: "Unable to retrieve verified email from Google account"
            });
        }

        const email = googleUser.email.toLowerCase().trim();
        const name = googleUser.name || email.split("@")[0];
        const googleSub = googleUser.sub;
        const authMode = mode || "login";
        const selectedRole = role && ["customer", "admin"].includes(role) ? role : "customer";

        // 3. Find user in MongoDB
        let user = await User.findOne({ email });

        // Enforce Signup requirement: If mode is 'login' and user does not exist, reject!
        if (authMode === "login") {
            if (!user || !user.signupCompleted) {
                return res.status(404).json({
                    message: `No active account found for ${email}. Please sign up first to create your account.`
                });
            }

            // Existing user: Verify Role
            if (role && user.role !== role) {
                const roleName = user.role === "admin" ? "Loan Officer / Admin" : "Customer / Loan Applicant";
                const requestedRoleName = role === "admin" ? "Loan Officer / Admin" : "Customer / Loan Applicant";
                return res.status(403).json({
                    message: `Access denied: Your account is registered as "${roleName}", not "${requestedRoleName}". Please select your correct account role.`
                });
            }
        } else {
            // mode is 'signup'
            if (user && user.signupCompleted) {
                if (role && user.role !== role) {
                    const roleName = user.role === "admin" ? "Loan Officer / Admin" : "Customer / Loan Applicant";
                    const requestedRoleName = role === "admin" ? "Loan Officer / Admin" : "Customer / Loan Applicant";
                    return res.status(403).json({
                        message: `Account already registered as "${roleName}". Please login.`
                    });
                }
            } else if (!user) {
                // New User: Auto-register via Google Signup
                user = await User.create({
                    name,
                    email,
                    role: selectedRole,
                    emailVerified: true,
                    phoneVerified: false,
                    signupCompleted: true,
                    supertokensUserId: `google_${googleSub}`,
                });
            }
        }

        // 4. SuperTokens ThirdParty User Lookup / Creation
        let stUser = null;
        try {
            const stResult = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                googleSub,
                email,
                true
            );
            if (stResult.status === "OK") {
                stUser = stResult.user;
            }
        } catch (stErr) {
            console.warn("SuperTokens ThirdParty signinup warning:", stErr.message || stErr);
        }

        if (stUser && (!user.supertokensUserId || user.supertokensUserId !== stUser.id)) {
            user.supertokensUserId = stUser.id;
            await user.save();
        }

        // 5. Create SuperTokens Session if recipeUserId is available
        if (stUser) {
            try {
                const recipeUserId = new RecipeUserId(stUser.id);
                await Session.createNewSession(req, res, "public", recipeUserId);
            } catch (sessErr) {
                console.error("SuperTokens Session creation warning:", sessErr);
            }
        }

        return res.status(200).json({
            message: authMode === "signup" ? "Google signup completed successfully" : "Google login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                emailVerified: user.emailVerified,
                signupCompleted: user.signupCompleted,
            }
        });
    } catch (error) {
        console.error("handleGoogleCallback error:", error);
        return res.status(500).json({
            message: error.message || "Failed to complete Google OAuth authentication"
        });
    }
};


/**
 * Provision new admin account (Admin Only)
 */
const registerAdmin = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: "An account with this email already exists." });
        }
        
        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
            return res.status(400).json({ message: "An account with this phone already exists." });
        }
        
        const user = await User.create({
            name,
            email,
            phone,
            role: "admin",
            emailVerified: true,
            phoneVerified: true,
            signupCompleted: true,
        });
        
        const stResult = await createSuperTokensUser(email, password);
        if (!stResult.success) {
            await User.findByIdAndDelete(user._id);
            return res.status(500).json({ message: "Failed to create security record for admin." });
        }
        
        user.supertokensUserId = stResult.userId;
        await user.save();
        
        return res.status(201).json({ message: "Admin account provisioned successfully." });
    } catch (error) {
        console.error("registerAdmin error:", error);
        return res.status(500).json({ message: "Failed to provision admin account." });
    }
};

module.exports = {
    registerAdmin,
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
    // Step-by-step signup methods
    sendSignupEmailOTP,
    verifySignupEmailOTP,
    sendSignupPhoneOTP,
    verifySignupPhoneOTP,
    completeSignup,
    // Third-party OAuth
    getGoogleAuthURL,
    handleGoogleCallback,
};
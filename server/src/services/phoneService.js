const axios = require("axios");

/**
 * Multi-Channel Phone OTP Verification Service
 * 1. Dispatches SMS via Fast2SMS / Gateway if API key is provided
 * 2. Real-time Console logging for immediate local verification
 * 
 * @param {string} phone - Target 10-digit mobile number
 * @param {string|number} otp - 6-digit numeric OTP code
 */
const sendPhoneOTP = async (phone, otp) => {
    // 1. Sanitize phone number
    const cleanPhone = String(phone).replace(/\D/g, "").slice(-10);

    if (!cleanPhone || cleanPhone.length !== 10) {
        console.error(`[SMS Service] Invalid mobile number provided: "${phone}"`);
        throw new Error("Invalid 10-digit mobile phone number");
    }

    // Log OTP to server console immediately
    console.log("==================================================");
    console.log(`[SMS Service] 📲 DISPATCHING PHONE OTP VERIFICATION`);
    console.log(`[SMS Service] Target Mobile: +91 ${cleanPhone}`);
    console.log(`[SMS Service] >>> VERIFICATION OTP CODE: ${otp} <<<`);
    console.log("==================================================");

    // Fast2SMS integration (if FAST2SMS_API_KEY configured)
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    if (fast2smsKey) {
        try {
            const f2sRes = await axios.post(
                "https://www.fast2sms.com/dev/bulkV2",
                {
                    route: "q",
                    message: `Your Loan Application verification code is ${otp}. Valid for 5 minutes.`,
                    language: "english",
                    flash: 0,
                    numbers: cleanPhone,
                },
                {
                    headers: {
                        authorization: fast2smsKey,
                        "Content-Type": "application/json",
                    },
                    timeout: 8000,
                }
            );

            if (f2sRes.data && f2sRes.data.return === true) {
                console.log(`[SMS Service] ✓ SMS successfully sent via Fast2SMS to +91 ${cleanPhone}`);
                return {
                    success: true,
                    provider: "fast2sms",
                    message: "SMS sent successfully via Fast2SMS",
                };
            }
        } catch (f2sErr) {
            console.warn("[SMS Service] Fast2SMS notice:", f2sErr.response?.data?.message || f2sErr.message);
        }
    }

    // Fallback: Console & In-App Response
    console.log(`[SMS Service] ℹ️ Free Development Mode: Use code ${otp} to verify.`);
    return {
        success: true,
        provider: "console_fallback",
        otpHint: otp,
        message: "Verification OTP generated. Code logged to terminal console.",
    };
};

module.exports = {
    sendPhoneOTP,
};
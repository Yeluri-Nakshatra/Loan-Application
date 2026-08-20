const axios = require("axios");
const twilio = require("twilio");

/**
 * Multi-Channel Phone OTP Verification Service
 * 1. Dispatches SMS via Twilio if API keys are provided
 * 2. Fallback to Fast2SMS
 * 3. Real-time Console logging for immediate local verification
 * 
 * @param {string} phone - Target mobile number
 * @param {string|number} otp - 6-digit numeric OTP code
 */
const sendPhoneOTP = async (phone, otp) => {
    // Sanitize phone number. If no country code, default to +91.
    let cleanPhone = String(phone).trim();
    if (!cleanPhone.startsWith("+")) {
        const digits = cleanPhone.replace(/\D/g, "");
        cleanPhone = "+91" + digits.slice(-10);
    }

    // Log OTP to server console immediately
    console.log("==================================================");
    console.log(`[SMS Service] 📱 DISPATCHING PHONE OTP VERIFICATION`);
    console.log(`[SMS Service] Target Mobile: ${cleanPhone}`);
    console.log(`[SMS Service] >>> VERIFICATION OTP CODE: ${otp} <<<`);
    console.log("==================================================");

    // 1. Twilio Integration (if configured)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioToken && twilioPhone) {
        try {
            const client = twilio(twilioSid, twilioToken);
            const message = await client.messages.create({
                body: `Your EZFINANZ Loan Application verification code is ${otp}. Valid for 5 minutes.`,
                from: twilioPhone,
                to: cleanPhone
            });
            console.log(`[SMS Service] ✅ SMS successfully sent via Twilio to ${cleanPhone}. SID: ${message.sid}`);
            return {
                success: true,
                provider: "twilio",
                message: "SMS sent successfully via Twilio",
            };
        } catch (twilioErr) {
            console.error("[SMS Service] Twilio error:", twilioErr.message);
        }
    }

    // 2. Fast2SMS integration (Fallback)
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    if (fast2smsKey) {
        try {
            const digits = cleanPhone.replace(/\D/g, "").slice(-10);
            const f2sRes = await axios.post(
                "https://www.fast2sms.com/dev/bulkV2",
                {
                    route: "q",
                    message: `Your Loan Application verification code is ${otp}. Valid for 5 minutes.`,
                    language: "english",
                    flash: 0,
                    numbers: digits,
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
                console.log(`[SMS Service] ✅ SMS successfully sent via Fast2SMS to +91 ${digits}`);
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

    // 3. Fallback: Console & In-App Response
    console.log(`[SMS Service] 🛠️ Free Development Mode: Use code ${otp} to verify.`);
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
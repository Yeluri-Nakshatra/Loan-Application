const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendEmailOTP = async (email, otp) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,

    subject: "EZFINANZ Email Verification",

    html: `
      <div>
        <h2>EZFINANZ Email Verification</h2>

        <p>Your verification OTP is:</p>

        <h1>${otp}</h1>

        <p>This OTP is valid for 5 minutes.</p>

        <p>
          Please do not share this OTP with anyone.
        </p>
      </div>
    `,
  });
};

// Password reset email
const sendPasswordResetEmail = async (email, resetLink) => {

    await transporter.sendMail({
        from: `"Loan Application" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Reset Your Password",

        html: `
            <div style="font-family: Arial, sans-serif;">

                <h2>Password Reset</h2>

                <p>
                    We received a request to reset your password.
                </p>

                <p>
                    Click the button below to reset your password:
                </p>

                <a
                    href="${resetLink}"
                    style="
                        display:inline-block;
                        padding:12px 20px;
                        background:#2563eb;
                        color:white;
                        text-decoration:none;
                        border-radius:6px;
                    "
                >
                    Reset Password
                </a>

                <p>
                    If you did not request this, you can safely ignore
                    this email.
                </p>

            </div>
        `,
    });
};

// Phone verification backup via Email
const sendPhoneBackupEmailOTP = async (email, phone, otp) => {
    try {
        await transporter.sendMail({
            from: `"Loan Verification" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Your Phone Verification OTP Code",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
                    <h2 style="color: #1e3a8a;">Mobile Phone Verification</h2>
                    <p>You requested a phone verification OTP for mobile number <strong>+91 ${phone}</strong>.</p>
                    <div style="background: #f8fafc; padding: 15px; text-align: center; border-radius: 8px; margin: 15px 0;">
                        <span style="font-size: 28px; font-weight: bold; font-family: monospace; letter-spacing: 4px; color: #1e293b;">${otp}</span>
                    </div>
                    <p style="font-size: 12px; color: #64748b;">This OTP code is valid for 5 minutes. Please do not share it with anyone.</p>
                </div>
            `,
        });
        console.log(`[Email Service] ✓ Backup phone OTP sent to email: ${email}`);
    } catch (err) {
        console.warn("[Email Service] Failed to send backup email OTP:", err.message);
    }
};

module.exports = {
  sendEmailOTP,
  sendPasswordResetEmail,
  sendPhoneBackupEmailOTP,
};
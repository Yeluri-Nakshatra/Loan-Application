import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  BadgeCheck,
} from "lucide-react";
import {
  sendSignupEmailOTP,
  verifySignupEmailOTP,
  sendSignupPhoneOTP,
  verifySignupPhoneOTP,
  resendEmailOTP,
  resendPhoneOTP,
  completeSignup,
} from "../../services/api";
import { useToast } from "../../context/ToastContext";

export default function Signup({ onSwitchToLogin }) {
  const toast = useToast();
  const [searchParams] = useSearchParams();

  // Step Navigation: 1 = Contact & Verification, 2 = Password & Credentials, 3 = Completed
  const [currentStep, setCurrentStep] = useState(1);

  // Form Field States
  const [formData, setFormData] = useState({
    name: "",
    email: searchParams.get("email") || "",
    phone: "",
    role: "customer",
    password: "",
    confirmPassword: "",
  });

  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const resumeParam = searchParams.get("resume");
    if (emailParam) {
      setFormData((prev) => ({ ...prev, email: emailParam }));
      if (resumeParam) {
        toast.info("Resuming your registration. Please enter your name and verify your email OTP.");
      }
    }
  }, [searchParams]);

  // Verification States
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  // OTP Input & Visibility States
  const [showEmailOTPBox, setShowEmailOTPBox] = useState(false);
  const [emailOTP, setEmailOTP] = useState("");
  const [emailTimer, setEmailTimer] = useState(300); // 5 minutes in seconds

  const [showPhoneOTPBox, setShowPhoneOTPBox] = useState(false);
  const [phoneOTP, setPhoneOTP] = useState("");
  const [phoneTimer, setPhoneTimer] = useState(300); // 5 minutes in seconds

  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Loading States
  const [loading, setLoading] = useState({
    emailSend: false,
    emailVerify: false,
    emailResend: false,
    phoneSend: false,
    phoneVerify: false,
    phoneResend: false,
    submit: false,
  });

  // Timer intervals
  const emailTimerRef = useRef(null);
  const phoneTimerRef = useRef(null);

  // Email Timer Effect
  useEffect(() => {
    if (showEmailOTPBox && !emailVerified && emailTimer > 0) {
      emailTimerRef.current = setInterval(() => {
        setEmailTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else {
      clearInterval(emailTimerRef.current);
    }
    return () => clearInterval(emailTimerRef.current);
  }, [showEmailOTPBox, emailVerified, emailTimer]);

  // Phone Timer Effect
  useEffect(() => {
    if (showPhoneOTPBox && !phoneVerified && phoneTimer > 0) {
      phoneTimerRef.current = setInterval(() => {
        setPhoneTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else {
      clearInterval(phoneTimerRef.current);
    }
    return () => clearInterval(phoneTimerRef.current);
  }, [showPhoneOTPBox, phoneVerified, phoneTimer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // -------------------------------------------------------------
  // Step 1: Email OTP Handlers
  // -------------------------------------------------------------
  const handleSendEmailOTP = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter your full legal name first.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      toast.error("Please enter a valid official email address.");
      return;
    }

    setLoading((prev) => ({ ...prev, emailSend: true }));

    try {
      const res = await sendSignupEmailOTP(formData.name.trim(), formData.email.trim());
      setUserId(res.userId);
      setShowEmailOTPBox(true);
      setEmailTimer(300); // 5 minutes
      setEmailOTP("");
      toast.success(res.message || "A 6-digit verification code has been sent to your email.");
    } catch (err) {
      toast.error(err.message || "Failed to send email verification code.");
    } finally {
      setLoading((prev) => ({ ...prev, emailSend: false }));
    }
  };

  const handleVerifyEmailOTP = async () => {
    if (!emailOTP || emailOTP.trim().length !== 6) {
      toast.error("Please enter the complete 6-digit email verification code.");
      return;
    }

    setLoading((prev) => ({ ...prev, emailVerify: true }));

    try {
      const res = await verifySignupEmailOTP(userId, emailOTP.trim());
      setEmailVerified(true);
      setShowEmailOTPBox(false);

      if (res.phoneVerified) {
        setPhoneVerified(true);
        if (res.phone) {
          setFormData((prev) => ({
            ...prev,
            phone: res.phone,
            name: res.name || prev.name,
          }));
        }
        toast.success("Email verified! Your previously verified mobile number is active. You may proceed to Set Password.");
      } else {
        if (res.name) {
          setFormData((prev) => ({ ...prev, name: res.name || prev.name }));
        }
        toast.success("Email verified successfully! Now please verify your mobile phone number.");
      }
    } catch (err) {
      toast.error(err.message || "Invalid or expired email verification code.");
    } finally {
      setLoading((prev) => ({ ...prev, emailVerify: false }));
    }
  };

  const handleResendEmailOTP = async () => {
    if (!userId) {
      toast.error("Please initiate verification first.");
      return;
    }

    setLoading((prev) => ({ ...prev, emailResend: true }));

    try {
      const res = await resendEmailOTP(userId);
      setEmailTimer(300);
      setEmailOTP("");
      toast.success(res.message || "A fresh 6-digit verification code has been sent to your email.");
    } catch (err) {
      toast.error(err.message || "Failed to resend email verification code.");
    } finally {
      setLoading((prev) => ({ ...prev, emailResend: false }));
    }
  };

  // -------------------------------------------------------------
  // Step 1: Phone OTP Handlers
  // -------------------------------------------------------------
  const handleSendPhoneOTP = async () => {
    if (!emailVerified) {
      toast.error("Please verify your email address first before requesting a mobile phone OTP.");
      return;
    }
    const cleanPhone = formData.phone.trim().replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading((prev) => ({ ...prev, phoneSend: true }));

    try {
      const res = await sendSignupPhoneOTP(userId, formData.phone.trim());
      setShowPhoneOTPBox(true);
      setPhoneTimer(300); // 5 minutes
      setPhoneOTP("");
      toast.success(res.message || "A 6-digit verification code has been sent to your phone.");
    } catch (err) {
      toast.error(err.message || "Failed to send phone verification code.");
    } finally {
      setLoading((prev) => ({ ...prev, phoneSend: false }));
    }
  };

  const handleVerifyPhoneOTP = async () => {
    if (!phoneOTP || phoneOTP.trim().length !== 6) {
      toast.error("Please enter the complete 6-digit phone verification code.");
      return;
    }

    setLoading((prev) => ({ ...prev, phoneVerify: true }));

    try {
      const res = await verifySignupPhoneOTP(userId, phoneOTP.trim());
      setPhoneVerified(true);
      setShowPhoneOTPBox(false);
      toast.success("Mobile number verified successfully! You can now proceed to the next step.");
    } catch (err) {
      toast.error(err.message || "Invalid or expired phone verification code.");
    } finally {
      setLoading((prev) => ({ ...prev, phoneVerify: false }));
    }
  };

  const handleResendPhoneOTP = async () => {
    if (!userId) {
      toast.error("Please initiate verification first.");
      return;
    }

    setLoading((prev) => ({ ...prev, phoneResend: true }));

    try {
      const res = await resendPhoneOTP(userId);
      setPhoneTimer(300);
      setPhoneOTP("");
      toast.success(res.message || "A fresh 6-digit verification code has been sent to your phone.");
    } catch (err) {
      toast.error(err.message || "Failed to resend phone verification code.");
    } finally {
      setLoading((prev) => ({ ...prev, phoneResend: false }));
    }
  };

  // -------------------------------------------------------------
  // Validation for Moving to Step 2
  // -------------------------------------------------------------
  const handleProceedToStep2 = () => {
    if (!formData.name.trim()) {
      toast.error("Please enter your full legal name.");
      return;
    }
    if (!emailVerified) {
      toast.error("Please verify your email address to continue.");
      return;
    }
    if (!phoneVerified) {
      toast.error("Please verify your mobile phone number to continue.");
      return;
    }

    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // -------------------------------------------------------------
  // Step 2: Final Account Creation (Password & Role)
  // -------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!emailVerified || !phoneVerified) {
      toast.error("Both email and phone number must be verified.");
      setCurrentStep(1);
      return;
    }

    if (!formData.password) {
      toast.error("Please enter a secure account password.");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Password confirmation does not match. Please re-enter.");
      return;
    }

    setLoading((prev) => ({ ...prev, submit: true }));

    try {
      const res = await completeSignup(userId, formData.password, formData.role);
      setCurrentStep(3);
      toast.success(res.message || "Account registered and activated successfully!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err.message || "Failed to complete account registration.");
    } finally {
      setLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  // Password validation checks
  const hasMinLength = formData.password.length >= 8;
  const hasNumber = /\d/.test(formData.password);
  const hasLetter = /[a-zA-Z]/.test(formData.password);
  const passwordsMatch =
    formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;

  // -------------------------------------------------------------
  // STEP 3: Success Confirmation Screen
  // -------------------------------------------------------------
  if (currentStep === 3) {
    return (
      <div className="w-full max-w-lg md:max-w-xl mx-auto my-6 sm:my-10 px-4">
        {/* Step Indicator Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between max-w-xs mx-auto">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                ✓
              </div>
              <span className="text-[11px] font-semibold text-emerald-800 mt-1">Verification</span>
            </div>
            <div className="h-0.5 flex-1 bg-emerald-600 mx-2" />
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                ✓
              </div>
              <span className="text-[11px] font-semibold text-emerald-800 mt-1">Credentials</span>
            </div>
            <div className="h-0.5 flex-1 bg-emerald-600 mx-2" />
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                ✓
              </div>
              <span className="text-[11px] font-semibold text-emerald-800 mt-1">Active</span>
            </div>
          </div>
        </div>

        {/* Success Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8 text-center">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <BadgeCheck className="w-10 h-10 text-emerald-600" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            KYC & Credentials Verified
          </span>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Account Activated Successfully
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
            Your institutional lending account for <strong className="text-slate-900">{formData.name}</strong> is now live and ready.
          </p>

          <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs sm:text-sm space-y-2.5 text-slate-700">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Verified Email:</span>
              <span className="font-semibold text-slate-900">{formData.email}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Verified Mobile:</span>
              <span className="font-semibold text-slate-900">{formData.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Designated Role:</span>
              <span className="font-semibold uppercase tracking-wider text-blue-900 text-xs">
                {formData.role === "admin" ? "Loan Officer / Admin" : "Customer / Loan Applicant"}
              </span>
            </div>
          </div>

          <Link
            to="/login"
            className="w-full py-3 px-4 bg-blue-900 hover:bg-blue-800 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            Proceed to Secure Portal Login
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Main Step 1 & Step 2 Layout
  // -------------------------------------------------------------
  return (
    <div className="w-full max-w-xl md:max-w-2xl mx-auto my-6 sm:my-8 px-4 sm:px-6">
      {/* Top Banking Branding & Title */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-950 border border-blue-200 mb-2.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-800" />
          Institutional Banking Onboarding
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Create Lending Account
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
          Complete two-step verification to access personal and commercial loan services.
        </p>
      </div>

      {/* Multi-Step Visual Progress Stepper */}
      <div className="bg-white border border-slate-200 rounded-t-xl px-5 sm:px-8 py-3.5 sm:py-4 border-b">
        <div className="flex items-center justify-between">
          {/* Step 1 Pill */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-colors ${
                emailVerified && phoneVerified
                  ? "bg-emerald-600 text-white"
                  : currentStep === 1
                  ? "bg-blue-900 text-white shadow-sm"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {emailVerified && phoneVerified ? <Check className="w-4 h-4 stroke-[3]" /> : "1"}
            </div>
            <div>
              <p className="text-[10px] sm:text-xs uppercase font-bold tracking-wider text-slate-400">Step 1</p>
              <p className={`text-xs sm:text-sm font-bold ${currentStep === 1 ? "text-blue-950" : "text-slate-700"}`}>
                Identity & OTP
              </p>
            </div>
          </div>

          {/* Stepper Divider */}
          <div className={`h-0.5 flex-1 mx-3 sm:mx-6 transition-colors ${currentStep === 2 ? "bg-blue-900" : "bg-slate-200"}`} />

          {/* Step 2 Pill */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-colors ${
                currentStep === 2
                  ? "bg-blue-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-400 border border-slate-300"
              }`}
            >
              2
            </div>
            <div>
              <p className="text-[10px] sm:text-xs uppercase font-bold tracking-wider text-slate-400">Step 2</p>
              <p className={`text-xs sm:text-sm font-bold ${currentStep === 2 ? "text-blue-950" : "text-slate-400"}`}>
                Set Password
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Card Content */}
      <div className="bg-white border-x border-b border-slate-200 rounded-b-xl shadow-sm p-6 sm:p-8 space-y-5 sm:space-y-6">
        {/* =========================================================
            STEP 1: IDENTITY, EMAIL OTP, PHONE OTP, ROLE
           ========================================================= */}
        {currentStep === 1 && (
          <div className="space-y-5">
            {/* Step 1 Header Note */}
            <div className="border-b border-slate-100 pb-2.5">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                1. Personal & Contact Verification
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Enter your name, verify your official email, and verify your mobile number.
              </p>
            </div>

            {/* Field: Full Name */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Full Legal Name (as per Govt ID) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. Alexander Hamilton"
                disabled={emailVerified && phoneVerified}
                className="w-full px-3.5 py-2.5 sm:py-3 bg-white border border-slate-300 rounded-lg text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 disabled:bg-slate-50 disabled:text-slate-600"
              />
            </div>

            {/* Field: Email with Corner "Send OTP" / "Verified" Badge */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs sm:text-sm font-semibold text-slate-700">
                  Email Address <span className="text-red-500">*</span>
                </label>

                {/* Corner Status / Action Button */}
                {emailVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendEmailOTP}
                    disabled={loading.emailSend || !formData.email}
                    className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 text-xs sm:text-sm font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading.emailSend ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-900" />
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5 text-blue-700" />
                        Send OTP
                      </>
                    )}
                  </button>
                )}
              </div>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="name@example.com"
                disabled={emailVerified}
                className={`w-full px-3.5 py-2.5 sm:py-3 bg-white border rounded-lg text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 disabled:bg-slate-50 disabled:text-slate-600 ${
                  emailVerified ? "border-emerald-300 bg-emerald-50/20" : "border-slate-300"
                }`}
              />

              {/* Expandable Inline Email OTP Field */}
              {showEmailOTPBox && !emailVerified && (
                <div className="mt-2.5 p-3.5 sm:p-4 bg-slate-50 border border-blue-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm text-slate-700">
                    <span className="font-bold flex items-center gap-1.5 text-blue-950">
                      <Mail className="w-3.5 h-3.5 text-blue-700" />
                      Enter 6-Digit Email Code
                    </span>
                    <div className="flex items-center gap-1 text-slate-600 font-mono text-xs sm:text-sm">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatTime(emailTimer)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <input
                      type="text"
                      maxLength={6}
                      value={emailOTP}
                      onChange={(e) => setEmailOTP(e.target.value.replace(/\D/g, ""))}
                      placeholder="• • • • • •"
                      className="w-36 sm:w-44 px-3 py-2 bg-white border border-slate-300 rounded-md text-center text-base sm:text-lg font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyEmailOTP}
                      disabled={loading.emailVerify || emailOTP.length !== 6}
                      className="px-4 py-2 sm:px-5 sm:py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                    >
                      {loading.emailVerify ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify OTP"
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 pt-1.5 border-t border-slate-200">
                    <span>Didn't receive email code?</span>
                    <button
                      type="button"
                      onClick={handleResendEmailOTP}
                      disabled={loading.emailResend || emailTimer > 240}
                      className="text-blue-900 font-bold hover:underline disabled:text-slate-400 disabled:no-underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${loading.emailResend ? "animate-spin" : ""}`} />
                      Resend Code {emailTimer > 240 && `(${emailTimer - 240}s)`}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Field: Mobile Number with Corner "Send OTP" / "Verified" Badge */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs sm:text-sm font-semibold text-slate-700">
                  Mobile Phone Number <span className="text-red-500">*</span>
                </label>

                {/* Corner Status / Action Button */}
                {phoneVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendPhoneOTP}
                    disabled={loading.phoneSend || !formData.phone || !emailVerified}
                    className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 text-xs sm:text-sm font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading.phoneSend ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-900" />
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        <Phone className="w-3.5 h-3.5 text-blue-700" />
                        Send OTP
                      </>
                    )}
                  </button>
                )}
              </div>

              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="e.g. 9876543210"
                disabled={phoneVerified || !emailVerified}
                className={`w-full px-3.5 py-2.5 sm:py-3 bg-white border rounded-lg text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 disabled:bg-slate-50 disabled:text-slate-600 ${
                  phoneVerified ? "border-emerald-300 bg-emerald-50/20" : "border-slate-300"
                }`}
              />
              {!emailVerified && (
                <p className="text-[11px] sm:text-xs text-amber-700 mt-1">
                  * Verify your email above to enable mobile phone OTP dispatch.
                </p>
              )}

              {/* Expandable Inline Phone OTP Field */}
              {showPhoneOTPBox && !phoneVerified && (
                <div className="mt-2.5 p-3.5 sm:p-4 bg-slate-50 border border-blue-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm text-slate-700">
                    <span className="font-bold flex items-center gap-1.5 text-blue-950">
                      <Phone className="w-3.5 h-3.5 text-blue-700" />
                      Enter 6-Digit Mobile Code
                    </span>
                    <div className="flex items-center gap-1 text-slate-600 font-mono text-xs sm:text-sm">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatTime(phoneTimer)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <input
                      type="text"
                      maxLength={6}
                      value={phoneOTP}
                      onChange={(e) => setPhoneOTP(e.target.value.replace(/\D/g, ""))}
                      placeholder="• • • • • •"
                      className="w-36 sm:w-44 px-3 py-2 bg-white border border-slate-300 rounded-md text-center text-base sm:text-lg font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyPhoneOTP}
                      disabled={loading.phoneVerify || phoneOTP.length !== 6}
                      className="px-4 py-2 sm:px-5 sm:py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                    >
                      {loading.phoneVerify ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify OTP"
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 pt-1.5 border-t border-slate-200">
                    <span>Didn't receive SMS code?</span>
                    <button
                      type="button"
                      onClick={handleResendPhoneOTP}
                      disabled={loading.phoneResend || phoneTimer > 240}
                      className="text-blue-900 font-bold hover:underline disabled:text-slate-400 disabled:no-underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${loading.phoneResend ? "animate-spin" : ""}`} />
                      Resend Code {phoneTimer > 240 && `(${phoneTimer - 240}s)`}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Field: Role Selector Dropdown */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Account Role / Type <span className="text-red-500">*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 sm:py-3 bg-white border border-slate-300 rounded-lg text-sm sm:text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              >
                <option value="customer">
                  Customer / Loan Applicant (Apply & Manage Loans)
                </option>
                <option value="admin">
                  Loan Officer / Underwriter (Branch Admin Portal)
                </option>
              </select>
            </div>

            {/* Next Step Action CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleProceedToStep2}
                disabled={!emailVerified || !phoneVerified || !formData.name.trim()}
                className="w-full py-3 sm:py-3.5 px-5 bg-blue-900 hover:bg-blue-800 text-white text-sm sm:text-base font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Step 2: Set Password
                <ArrowRight className="w-4 h-4" />
              </button>
              {(!emailVerified || !phoneVerified) && (
                <p className="text-[11px] sm:text-xs text-center text-slate-500 mt-2">
                  Complete email & mobile OTP verification above to proceed.
                </p>
              )}
            </div>
          </div>
        )}

        {/* =========================================================
            STEP 2: PASSWORD CREATION & CONFIRMATION
           ========================================================= */}
        {currentStep === 2 && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Step 2 Header Note */}
            <div className="border-b border-slate-100 pb-2.5">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                2. Create Security Credentials
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Set a strong password for your verified lending account.
              </p>
            </div>

            {/* Verified Summary Chip */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm space-y-1.5 text-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Applicant:</span>
                <span className="font-semibold text-slate-900">{formData.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Email:</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> {formData.email}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Mobile:</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> {formData.phone}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Role:</span>
                <span className="font-semibold uppercase text-blue-900 text-[11px] sm:text-xs">
                  {formData.role === "admin" ? "Loan Officer" : "Customer / Applicant"}
                </span>
              </div>
            </div>

            {/* Field: Create Password */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Create Account Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Min. 8 characters with letters & numbers"
                  className="w-full px-3.5 py-2.5 sm:py-3 pr-10 bg-white border border-slate-300 rounded-lg text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Live Password Rules Feedback */}
              {formData.password && (
                <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px] sm:text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className={`flex items-center gap-1 ${hasMinLength ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? "text-emerald-600" : "text-slate-300"}`} />
                    At least 8 characters
                  </span>
                  <span className={`flex items-center gap-1 ${hasNumber ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasNumber ? "text-emerald-600" : "text-slate-300"}`} />
                    Contains a number (0-9)
                  </span>
                  <span className={`flex items-center gap-1 ${hasLetter ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasLetter ? "text-emerald-600" : "text-slate-300"}`} />
                    Contains letters (a-z, A-Z)
                  </span>
                </div>
              )}
            </div>

            {/* Field: Confirm Password */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Re-enter your password"
                  className="w-full px-3.5 py-2.5 sm:py-3 pr-10 bg-white border border-slate-300 rounded-lg text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {formData.confirmPassword && (
                <p className={`text-xs sm:text-sm mt-1.5 flex items-center gap-1 ${passwordsMatch ? "text-emerald-700 font-semibold" : "text-red-600"}`}>
                  {passwordsMatch ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Passwords match
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                      Passwords do not match
                    </>
                  )}
                </p>
              )}
            </div>

            {/* Step 2 Action Buttons */}
            <div className="pt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                }}
                className="py-3 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>

              <button
                type="submit"
                disabled={loading.submit || !passwordsMatch || !hasMinLength}
                className="flex-1 py-3 sm:py-3.5 px-5 bg-blue-900 hover:bg-blue-800 text-white text-sm sm:text-base font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading.submit ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Complete Registration & Open Account
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Switch to Login Footer Link */}
      <div className="text-center mt-5">
        <p className="text-xs sm:text-sm text-slate-600">
          Already have an active account?{" "}
          <Link
            to="/login"
            className="font-bold text-blue-900 hover:text-blue-800 hover:underline cursor-pointer"
          >
            Log In to Portal
          </Link>
        </p>
      </div>
    </div>
  );
}

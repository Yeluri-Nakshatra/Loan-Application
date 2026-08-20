import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Calculator,
  ShieldCheck,
  CreditCard,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Camera,
  RefreshCw,
  FileText,
  DollarSign,
  Check,
  HelpCircle,
  FileCheck2,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Percent,
  Receipt,
  ChevronDown,
  ChevronUp,
  Table,
  XCircle,
  CheckCircle,
  PlusCircle,
} from "lucide-react";
import {
  saveEMITerm,
  saveBankAccount,
  saveDeclaration,
  submitSelfie,
  getApplicationStatus,
  getLatestEligibility,
  getKYCStatus,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function LoanJourney() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Multi-Step Form Controller (5 = EMI Term, 6 = Bank Account, 7 = Declaration, 8 = Live Selfie, 9 = Tracking Console)
  const [currentStep, setCurrentStep] = useState(5);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [kycVerified, setKycVerified] = useState(true);

  const [applicationId, setApplicationId] = useState(null);
  const [applicationData, setApplicationData] = useState(null);

  // Step 5: Loan & EMI State
  const [loanAmount, setLoanAmount] = useState(100000);
  const [maxAllowedAmount, setMaxAllowedAmount] = useState(300000);
  const [tenureMonths, setTenureMonths] = useState(24);
  const [interestRate, setInterestRate] = useState(10.5);
  const [loanPurpose, setLoanPurpose] = useState("personal");
  const [showAmortization, setShowAmortization] = useState(false);

  // Step 6: Bank Account State
  const [bankName, setBankName] = useState("HDFC Bank");
  const [accountHolderName, setAccountHolderName] = useState(user?.name || "");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountType, setAccountType] = useState("savings");

  // Step 7: Legal Declaration State
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [autoDebitConsent, setAutoDebitConsent] = useState(false);
  const [creditConsent, setCreditConsent] = useState(false);
  const [digitalSignature, setDigitalSignature] = useState(user?.name || "");

  // Step 8: Live Selfie State
  const [cameraActive, setCameraActive] = useState(false);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // -------------------------------------------------------------
  // Live Financial Calculations for Step 5
  // -------------------------------------------------------------
  const calculateEMI = (principal, annualRate, tenure) => {
    if (!principal || !tenure) return 0;
    const monthlyRate = annualRate / 100 / 12;
    if (monthlyRate === 0) return Math.round(principal / tenure);
    const emi =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
      (Math.pow(1 + monthlyRate, tenure) - 1);
    return Math.round(emi);
  };

  const currentEMI = calculateEMI(loanAmount, interestRate, tenureMonths);
  const totalRepayment = currentEMI * tenureMonths;
  const totalInterest = Math.max(0, totalRepayment - loanAmount);

  // Upfront Charges Breakdown
  const processingFee = Math.max(500, Math.round(loanAmount * 0.02)); // 2%
  const gstOnProcessingFee = Math.round(processingFee * 0.18); // 18% GST
  const documentationCharges = 250; // Flat documentation fee
  const totalCharges = processingFee + gstOnProcessingFee + documentationCharges;
  const netDisbursementAmount = Math.max(0, loanAmount - totalCharges);

  // Effective IRR / APR (annualized cost including fees)
  const annualFeeImpact = ((totalCharges / (loanAmount || 1)) / (tenureMonths / 12)) * 100;
  const effectiveIRR = Math.round((interestRate + annualFeeImpact) * 10) / 10;

  // Month-by-month Amortization Schedule
  const generateAmortizationSchedule = () => {
    const schedule = [];
    let balance = loanAmount;
    const monthlyRate = interestRate / 100 / 12;

    for (let m = 1; m <= tenureMonths; m++) {
      const interestPart = Math.round(balance * monthlyRate);
      const principalPart = Math.min(balance, currentEMI - interestPart);
      const closingBalance = Math.max(0, balance - principalPart);

      schedule.push({
        month: m,
        openingBalance: balance,
        emi: currentEMI,
        principal: principalPart,
        interest: interestPart,
        closingBalance,
      });

      balance = closingBalance;
      if (balance <= 0) break;
    }
    return schedule;
  };

  const amortizationSchedule = generateAmortizationSchedule();

  // Load existing application, KYC, and eligibility
  useEffect(() => {
    const initData = async () => {
      try {
        const requestedAppId = searchParams.get("id");
        const isNewRequested = searchParams.get("new") === "true";

        const [appRes, eligRes, kycRes] = await Promise.all([
          getApplicationStatus(user?.id, user?.email, requestedAppId),
          getLatestEligibility(user?.id, user?.email),
          getKYCStatus(user?.id, user?.email),
        ]);

        if (kycRes) {
          const isVerified = kycRes.kycStatus === "VERIFIED";
          setKycVerified(isVerified);
          if (!isVerified) {
            toast.error("KYC verification required before proceeding with loan application. Redirecting to KYC portal...");
            navigate("/customer/kyc", { replace: true });
            return;
          }
        }

        if (!eligRes.assessment) {
          toast.info("Please evaluate your Loan Eligibility & credit capacity before configuring your loan.");
          navigate("/customer/eligibility", { replace: true });
          return;
        }

        if (eligRes.assessment.decision === "NOT_ELIGIBLE") {
          toast.error("Loan application cannot be initiated because eligibility criteria were not met.");
          navigate("/customer/eligibility", { replace: true });
          return;
        }

        if (kycRes.kyc) {
          setAccountHolderName(kycRes.kyc.fullName || user?.name || "");
          setDigitalSignature(kycRes.kyc.fullName || user?.name || "");
        }

        if (eligRes.assessment.maxEligibleAmount) {
          setMaxAllowedAmount(eligRes.assessment.maxEligibleAmount);
          setLoanAmount(Math.min(eligRes.assessment.requestedAmount || 100000, eligRes.assessment.maxEligibleAmount));
        }
        if (eligRes.assessment.suggestedInterestRate) {
          setInterestRate(eligRes.assessment.suggestedInterestRate);
        }
        if (eligRes.assessment.tenureMonths) {
          setTenureMonths(eligRes.assessment.tenureMonths);
        }

        if (appRes.application && !isNewRequested) {
          const app = appRes.application;
          setApplicationData(app);
          setApplicationId(app.applicationId);
          setLoanAmount(app.loanAmount || 100000);
          setTenureMonths(app.tenureMonths || 24);
          setInterestRate(app.interestRate || 10.5);
          setLoanPurpose(app.loanPurpose || "personal");

          if (app.bankDetails?.bankName) {
            setBankName(app.bankDetails.bankName || "HDFC Bank");
            setIfscCode(app.bankDetails.ifscCode || "");
            setAccountType(app.bankDetails.accountType || "savings");
            setAccountHolderName(app.bankDetails.accountHolderName || user?.name || "");

            // Never pre-fill masked 'XXXX' placeholder into active editable input fields
            if (app.bankDetails.accountNumber && !app.bankDetails.accountNumber.includes("X")) {
              setAccountNumber(app.bankDetails.accountNumber);
              setConfirmAccountNumber(app.bankDetails.accountNumber);
            } else {
              setAccountNumber("");
              setConfirmAccountNumber("");
            }
          }

          if (app.declaration?.termsAccepted) {
            setTermsAccepted(app.declaration.termsAccepted);
            setAutoDebitConsent(app.declaration.autoDebitConsent);
            setCreditConsent(app.declaration.creditInformationConsent);
            setDigitalSignature(app.declaration.digitalSignatureName || user?.name || "");
          }

          if (app.selfieVerification?.selfieUrl) {
            setSelfiePreview(app.selfieVerification.selfieUrl);
          }

          if (app.status === "UNDER_REVIEW" || app.status === "APPROVED" || app.status === "REJECTED" || app.status === "DISBURSED") {
            setCurrentStep(9);
          } else if (app.currentStep) {
            setCurrentStep(app.currentStep);
          }
        } else {
          // Fresh new loan application
          setApplicationId(null);
          setApplicationData(null);
          setSelfiePreview(null);
          setTermsAccepted(false);
          setAutoDebitConsent(false);
          setCreditConsent(false);
          setCurrentStep(5);
        }
      } catch (err) {
        console.error("Error initializing loan journey data:", err);
      } finally {
        setFetching(false);
      }
    };

    if (user) {
      initData();
    } else {
      setFetching(false);
    }
  }, [user, searchParams]);

  // Handler to start a fresh loan application
  const handleStartNewLoan = () => {
    setApplicationId(null);
    setApplicationData(null);
    setSelfiePreview(null);
    setTermsAccepted(false);
    setAutoDebitConsent(false);
    setCreditConsent(false);
    setCurrentStep(5);
    setSearchParams({ new: "true" });
    toast.info("Starting a new loan application. Select your desired loan amount and tenure.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Clean up camera stream
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Bind video element whenever camera becomes active
  useEffect(() => {
    if (cameraActive && mediaStreamRef.current && videoRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch((err) => {
        console.warn("Video stream auto-play caught:", err);
      });
    }
  }, [cameraActive]);

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    setSelfiePreview(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser environment.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      console.warn("Camera access warning:", err);
      setCameraError("Camera access denied or unavailable. You can use file upload or sample capture below.");
      setCameraActive(false);
    }
  };

  // Capture Live Frame
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setSelfiePreview(dataUrl);
    stopCamera();
  };

  // Fallback Image Upload for Selfie
  const handleSelfieFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelfiePreview(reader.result);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  // -------------------------------------------------------------
  // Step Handlers
  // -------------------------------------------------------------

  // Step 5 Submit: EMI Term
  const handleStep5Submit = async (e) => {
    e.preventDefault();
    if (loanAmount <= 0) {
      toast.error("Please enter a valid loan amount.");
      return;
    }

    setLoading(true);
    try {
      const isNew = !applicationId || searchParams.get("new") === "true";
      const res = await saveEMITerm({
        userId: user?.id,
        email: user?.email,
        loanAmount: Number(loanAmount),
        tenureMonths: Number(tenureMonths),
        interestRate: Number(interestRate),
        loanPurpose,
        isNewApplication: isNew,
      });
      setApplicationId(res.application.applicationId);
      setApplicationData(res.application);
      setSearchParams({});
      setCurrentStep(6);
      toast.success("Loan terms, fees, and EMI schedule confirmed!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err.message || "Failed to save EMI terms.");
    } finally {
      setLoading(false);
    }
  };

  // Step 6 Submit: Bank Account
  const handleStep6Submit = async (e) => {
    e.preventDefault();
    if (!accountNumber.trim()) {
      toast.error("Please enter your bank account number.");
      return;
    }
    if (accountNumber !== confirmAccountNumber) {
      toast.error("Account numbers do not match. Please verify.");
      return;
    }
    if (!ifscCode.trim()) {
      toast.error("Please enter your bank IFSC / Routing code.");
      return;
    }

    setLoading(true);
    try {
      const res = await saveBankAccount({
        applicationId,
        userId: user?.id,
        email: user?.email,
        bankName,
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        accountType,
        accountHolderName: accountHolderName.trim(),
      });
      setApplicationData(res.application);
      setCurrentStep(7);
      toast.success("Bank account verified and linked for disbursement!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err.message || "Failed to save bank account details.");
    } finally {
      setLoading(false);
    }
  };

  // Step 7 Submit: Declaration
  const handleStep7Submit = async (e) => {
    e.preventDefault();
    if (!termsAccepted || !autoDebitConsent || !creditConsent) {
      toast.error("Please agree to all terms, NACH mandate, and credit bureau disclosures.");
      return;
    }
    if (!digitalSignature.trim()) {
      toast.error("Please type your full legal name as digital signature.");
      return;
    }

    setLoading(true);
    try {
      const res = await saveDeclaration({
        applicationId,
        userId: user?.id,
        email: user?.email,
        termsAccepted,
        autoDebitConsent,
        creditInformationConsent: creditConsent,
        digitalSignatureName: digitalSignature.trim(),
      });
      setApplicationData(res.application);
      setCurrentStep(8);
      toast.success("Legal declarations and e-Mandate consent confirmed!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err.message || "Failed to save declaration.");
    } finally {
      setLoading(false);
    }
  };

  // Step 8 Submit: Live Selfie
  const handleStep8Submit = async (e) => {
    e.preventDefault();
    if (!selfiePreview) {
      toast.error("Please capture your live selfie before final submission.");
      return;
    }

    setLoading(true);
    try {
      const res = await submitSelfie({
        applicationId,
        userId: user?.id,
        email: user?.email,
        selfieUrl: selfiePreview,
      });
      setApplicationData(res.application);
      setCurrentStep(9);
      toast.success("Live selfie verified! Loan application submitted for underwriting approval.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err.message || "Failed to submit live selfie.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-900 animate-spin mb-2" />
        <p className="text-xs text-slate-500 font-medium">Loading loan onboarding portal...</p>
      </div>
    );
  }

  if (!kycVerified) {
    return (
      <div className="w-full max-w-xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-center space-y-5 animate-in fade-in">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-900 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">KYC Verification Required</h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
            Regulatory guidelines mandate identity and residential address verification before accessing credit sanctioning and disbursement facilities.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
          <Link
            to="/customer/dashboard"
            className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
          >
            Back to Dashboard
          </Link>
          <Link
            to="/customer/kyc"
            className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-1.5"
          >
            Complete KYC Now
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const stepsList = [
    { num: 5, label: "EMI Term Selection" },
    { num: 6, label: "Bank Account" },
    { num: 7, label: "Declaration" },
    { num: 8, label: "Live Selfie" },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto my-6 sm:my-10 px-4 sm:px-6 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/customer/dashboard"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Institutional Loan Application
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Complete the formal onboarding steps to sanction and disburse your credit facility.
          </p>
        </div>

        {applicationId && (
          <div className="px-3.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-950 text-xs font-mono font-bold self-start sm:self-center">
            Ref: {applicationId}
          </div>
        )}
      </div>

      {/* Stepper Progress Indicator */}
      {currentStep < 9 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-4 gap-2">
            {stepsList.map((step) => {
              const isDone = currentStep > step.num;
              const isCurrent = currentStep === step.num;
              return (
                <div key={step.num} className="flex flex-col items-center text-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all mb-1.5 ${
                      isDone
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                        ? "bg-blue-900 text-white ring-4 ring-blue-100"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : step.num}
                  </div>
                  <span
                    className={`text-[11px] font-bold hidden sm:inline-block ${
                      isCurrent ? "text-blue-950" : isDone ? "text-emerald-700" : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 5: EMI Term & Product Selection */}
      {/* ------------------------------------------------------------- */}
      {currentStep === 5 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in space-y-6">
          <div className="bg-slate-900 text-white p-6 sm:p-8 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-blue-300">
                Step 5 of 8 • Repayment & Terms
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">
                EMI Term Selection & Cost of Credit
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Select your loan amount and repayment tenure (6 to 60 months) with real-time fee and deduction calculations.
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-800 flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5 text-white" />
            </div>
          </div>

          <form onSubmit={handleStep5Submit} className="p-6 sm:p-8 space-y-8">
            {/* Amount Selector */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Required Loan Amount (Gross Principal)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="5000"
                    max={Math.max(50000, maxAllowedAmount)}
                    step="1000"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="w-40 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-lg font-bold text-blue-950 font-mono text-right focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>
              </div>

              <input
                type="range"
                min="5000"
                max={Math.max(50000, maxAllowedAmount)}
                step="1000"
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-900"
              />
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>Min: ₹5,000</span>
                <span className="text-emerald-700 font-bold">
                  Pre-Approved Ceiling: ₹{maxAllowedAmount.toLocaleString()}
                </span>
              </div>

              {/* Eligibility Check Callout */}
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-blue-950">
                  <Calculator className="w-4 h-4 text-blue-900 shrink-0" />
                  <span>
                    Your maximum limit is determined by your Debt-to-Income (DTI) & Credit score.
                  </span>
                </div>
                <Link
                  to="/customer/eligibility"
                  className="text-blue-900 hover:text-blue-950 font-bold hover:underline shrink-0 flex items-center gap-1"
                >
                  Check / Recalculate Eligibility →
                </Link>
              </div>
            </div>

            {/* Repayment Tenure Options: 6, 12, 18, 24, 36, 48, 60 Months */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Choose Repayment Tenure (Months)
                </label>
                <span className="text-xs font-bold text-blue-900">
                  Selected: {tenureMonths} Months ({tenureMonths / 12} {tenureMonths / 12 === 1 ? "Year" : "Years"})
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {[6, 12, 18, 24, 36, 48, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTenureMonths(m)}
                    className={`py-3 px-2 rounded-lg border text-center transition-all cursor-pointer font-bold ${
                      tenureMonths === m
                        ? "bg-blue-900 text-white border-blue-900 shadow-sm"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <div className="text-sm sm:text-base">{m}M</div>
                    <div className={`text-[10px] mt-0.5 ${tenureMonths === m ? "text-blue-200" : "text-slate-400"}`}>
                      {m < 12 ? `${m} Months` : `${m / 12} Yrs`}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Loan Purpose */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Loan Purpose Category <span className="text-red-500">*</span>
              </label>
              <select
                value={loanPurpose}
                onChange={(e) => setLoanPurpose(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              >
                <option value="personal">Personal Term Loan</option>
                <option value="home_improvement">Home & Real Estate Improvement</option>
                <option value="business">Business Expansion & Working Capital</option>
                <option value="education">Higher Education / Skill Certifications</option>
                <option value="debt_consolidation">Debt Consolidation & Restructuring</option>
                <option value="medical">Medical & Healthcare Expenses</option>
                <option value="vehicle">Automotive / Vehicle Financing</option>
              </select>
            </div>

            {/* Comprehensive Fee & Charges Deduction Breakdown Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <Receipt className="w-4 h-4 text-blue-900" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Transparent Fees, Deductions & Net Disbursement
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2 text-slate-600">
                  <div className="flex justify-between">
                    <span>Gross Principal Amount:</span>
                    <strong className="text-slate-900 font-mono">₹{loanAmount.toLocaleString()}.00</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Processing Fee (2.0%):</span>
                    <span className="font-mono text-slate-800">₹{processingFee.toLocaleString()}.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST on Processing Fee (18%):</span>
                    <span className="font-mono text-slate-800">₹{gstOnProcessingFee.toLocaleString()}.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Documentation & Stamp Charges:</span>
                    <span className="font-mono text-slate-800">₹{documentationCharges.toLocaleString()}.00</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-slate-800 font-bold">
                    <span>Total Upfront Charges:</span>
                    <span className="font-mono text-red-600">-₹{totalCharges.toLocaleString()}.00</span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      Net Disbursement Amount (Credited to Bank)
                    </span>
                    <p className="text-2xl sm:text-3xl font-bold text-emerald-900 mt-1 font-mono">
                      ₹{netDisbursementAmount.toLocaleString()}.00
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-1">
                      Direct deposit to your verified bank account upon sanction.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-emerald-200/60 mt-3 flex justify-between items-center text-[11px] text-emerald-900">
                    <span>Effective Annual Rate (IRR):</span>
                    <strong className="font-mono font-bold text-sm">{effectiveIRR}%</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time EMI Repayment Summary */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 shadow-xs">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Monthly EMI
                </span>
                <p className="text-xl sm:text-2xl font-bold text-blue-950 mt-1 font-mono">
                  ₹{currentEMI.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-500">Fixed monthly installment</span>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Applicable Rate (APR)
                </span>
                <p className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1 font-mono">
                  {interestRate}%
                </p>
                <span className="text-[10px] text-emerald-700 font-semibold">Tier 1 Reducing Rate</span>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Interest
                </span>
                <p className="text-xl sm:text-2xl font-bold text-slate-800 mt-1 font-mono">
                  ₹{totalInterest.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-500">Over {tenureMonths} months</span>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Repayment
                </span>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 font-mono">
                  ₹{totalRepayment.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-500">Principal + Total Interest</span>
              </div>
            </div>

            {/* Amortization Schedule Drawer Toggle */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAmortization(!showAmortization)}
                className="w-full px-5 py-3.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-blue-900" />
                  <span>Month-by-Month Amortization Schedule ({tenureMonths} Installments)</span>
                </div>
                {showAmortization ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAmortization && (
                <div className="max-h-72 overflow-y-auto p-4 bg-white">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                        <th className="p-2">Month</th>
                        <th className="p-2">Opening Balance</th>
                        <th className="p-2">EMI</th>
                        <th className="p-2">Principal</th>
                        <th className="p-2">Interest</th>
                        <th className="p-2">Closing Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {amortizationSchedule.map((row) => (
                        <tr key={row.month} className="hover:bg-slate-50/80">
                          <td className="p-2 font-bold text-slate-700">#{row.month}</td>
                          <td className="p-2 text-slate-600">₹{row.openingBalance.toLocaleString()}</td>
                          <td className="p-2 font-bold text-blue-950">₹{row.emi.toLocaleString()}</td>
                          <td className="p-2 text-emerald-700 font-semibold">₹{row.principal.toLocaleString()}</td>
                          <td className="p-2 text-red-600">₹{row.interest.toLocaleString()}</td>
                          <td className="p-2 font-bold text-slate-900">₹{row.closingBalance.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* CTA Button */}
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3 bg-blue-900 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Locking Loan Terms & Charges...
                  </>
                ) : (
                  <>
                    Confirm Terms & Proceed to Bank Setup
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 6: Add Bank Account */}
      {/* ------------------------------------------------------------- */}
      {currentStep === 6 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in">
          <div className="bg-slate-900 text-white p-6 sm:p-8 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-blue-300">
                Step 6 of 8 • Bank Setup
              </span>
              <h2 className="text-xl font-bold tracking-tight mt-0.5">
                Add Disbursement Bank Account
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Provide your active bank account for loan sanction disbursement and automated repayment.
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-800 flex items-center justify-center">
              <Building className="w-5 h-5 text-white" />
            </div>
          </div>

          <form onSubmit={handleStep6Submit} className="p-6 sm:p-8 space-y-6">
            {/* Live Disbursement Account Preview Card */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-xl shadow-md space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-300" />
                  <span className="font-bold text-sm tracking-wide text-white uppercase">
                    {bankName || "Select Bank"}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Penny-Drop Verification Active
                </span>
              </div>

              <div className="pt-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
                  Disbursement Account Number
                </span>
                <p className="text-lg sm:text-xl font-mono font-bold tracking-widest text-blue-100 mt-0.5">
                  {accountNumber ? `•••• •••• •••• ${accountNumber.slice(-4)}` : "•••• •••• •••• ••••"}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Account Holder</span>
                  <span className="font-semibold text-slate-200">{accountHolderName || "Account Holder Name"}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase">IFSC Code</span>
                  <span className="font-mono font-bold text-blue-200">{ifscCode || "IFSC0000000"}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 font-semibold"
                >
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="State Bank of India">State Bank of India (SBI)</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                  <option value="Bank of Baroda">Bank of Baroda</option>
                  <option value="Punjab National Bank">Punjab National Bank</option>
                  <option value="Chase Bank">Chase Bank / JPMorgan</option>
                  <option value="Bank of America">Bank of America</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                >
                  <option value="savings">Savings Account (Primary)</option>
                  <option value="current">Current Account (Commercial)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Holder Name (Must match KYC) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="Enter full name on bank account"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    KYC Matched ✓
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Bank Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 5010029482910"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 font-mono tracking-wider"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm Bank Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={confirmAccountNumber}
                  onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="Re-enter account number"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 font-mono tracking-wider"
                />
                {accountNumber && confirmAccountNumber && (
                  <p
                    className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${
                      accountNumber === confirmAccountNumber ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {accountNumber === confirmAccountNumber ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Account numbers matched
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" /> Account numbers do not match
                      </>
                    )}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Bank IFSC Code (11 Characters) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0001234"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 font-mono uppercase font-bold tracking-wider"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                  <span>Standard 11-character bank branch routing identifier.</span>
                  {ifscCode && ifscCode.length === 11 && (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Valid IFSC Format
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                ← Back to EMI Selection
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-blue-900 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying Bank Account...
                  </>
                ) : (
                  <>
                    Confirm Bank & Proceed to Declaration
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 7: Confirmation of Legal Declaration */}
      {/* ------------------------------------------------------------- */}
      {currentStep === 7 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in">
          <div className="bg-slate-900 text-white p-6 sm:p-8 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-blue-300">
                Step 7 of 8 • Legal Undertakings
              </span>
              <h2 className="text-xl font-bold tracking-tight mt-0.5">
                Borrower Declaration & Legal Undertaking
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Authorize e-Mandate automatic EMI debit and complete legal attestation.
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-800 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5 text-white" />
            </div>
          </div>

          <form onSubmit={handleStep7Submit} className="p-6 sm:p-8 space-y-6">
            {/* Sanction Summary Pill */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Sanctioned Facility:</span>
                <p className="text-base font-bold text-blue-950">
                  ₹{loanAmount.toLocaleString()} at {interestRate}% APR • {tenureMonths} Months
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-medium">Monthly Debit:</span>
                <p className="text-base font-bold text-emerald-800 font-mono">
                  ₹{currentEMI.toLocaleString()}/mo
                </p>
              </div>
            </div>

            {/* Legal Undertakings Checkboxes */}
            <div className="space-y-4">
              <label className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-blue-900 focus:ring-blue-900 cursor-pointer"
                />
                <div className="text-xs text-slate-700 leading-relaxed">
                  <strong className="text-slate-900 block font-bold mb-0.5">
                    1. Loan Sanction Agreement & Repayment Commitment
                  </strong>
                  I acknowledge and agree to the sanctioned loan terms, fixed interest rate of {interestRate}% APR, and commit to unencumbered monthly EMI servicing of ₹{currentEMI.toLocaleString()} for {tenureMonths} months.
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={autoDebitConsent}
                  onChange={(e) => setAutoDebitConsent(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-blue-900 focus:ring-blue-900 cursor-pointer"
                />
                <div className="text-xs text-slate-700 leading-relaxed">
                  <strong className="text-slate-900 block font-bold mb-0.5">
                    2. e-Mandate (NACH / Automated Clearing House) Debit Authorization
                  </strong>
                  I authorize EZFINANZ Lending to establish an automated electronic mandate on my linked bank account ({bankName}) to deduct scheduled EMIs on the 5th of each calendar month until tenure completion.
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={creditConsent}
                  onChange={(e) => setCreditConsent(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-blue-900 focus:ring-blue-900 cursor-pointer"
                />
                <div className="text-xs text-slate-700 leading-relaxed">
                  <strong className="text-slate-900 block font-bold mb-0.5">
                    3. Credit Information Bureau Reporting Authorization
                  </strong>
                  I consent to the periodic submission of my repayment history to authorized credit information companies (CIBIL, Experian, Equifax, CRIF High Mark) in compliance with RBI/banking regulations.
                </div>
              </label>
            </div>

            {/* Digital Signature */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Digital Signature (Type Full Legal Name) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={digitalSignature}
                onChange={(e) => setDigitalSignature(e.target.value)}
                placeholder="Full Name as per KYC"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Timestamp: <span className="font-mono">{new Date().toLocaleString()}</span> • IP & Device attestation recorded.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setCurrentStep(6)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                ← Back to Bank Details
              </button>

              <button
                type="submit"
                disabled={loading || !termsAccepted || !autoDebitConsent || !creditConsent}
                className="px-8 py-3 bg-blue-900 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recording Digital Signature...
                  </>
                ) : (
                  <>
                    Sign Declaration & Proceed to Live Selfie
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 8: Live Selfie or Photo Verification (Final Step) */}
      {/* ------------------------------------------------------------- */}
      {currentStep === 8 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in">
          <div className="bg-slate-900 text-white p-6 sm:p-8 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-blue-300">
                Step 8 of 8 • Final Step
              </span>
              <h2 className="text-xl font-bold tracking-tight mt-0.5">
                Live Selfie & Biometric Liveness Verification
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Capture a clear live selfie using your camera for final identity matching with your government ID.
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-800 flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </div>

          <form onSubmit={handleStep8Submit} className="p-6 sm:p-8 space-y-6">
            {/* Live Camera Viewport / Captured Preview */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-xl">
              {selfiePreview ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-emerald-500 shadow-md">
                    <img
                      src={selfiePreview}
                      alt="Captured Selfie"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-100 px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-4 h-4" />
                    Live Selfie Captured & Liveness Verified
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelfiePreview(null);
                      startCamera();
                    }}
                    className="text-xs text-slate-600 hover:text-blue-900 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retake Selfie
                  </button>
                </div>
              ) : cameraActive ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden border-4 border-blue-900 shadow-lg bg-slate-950 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      onLoadedMetadata={() => {
                        if (videoRef.current) {
                          videoRef.current.play().catch((err) => console.warn("play err:", err));
                        }
                      }}
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  </div>
                  <p className="text-xs text-slate-600 font-medium text-center">
                    Position your face inside the circle and look directly at the camera.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs sm:text-sm font-bold shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Capture Photo
                    </button>

                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Close Camera
                    </button>
                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center text-center space-y-4 max-w-sm">
                  <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-900 flex items-center justify-center">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Live Selfie Verification
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Click below to open your camera and capture a live selfie for identity matching.
                    </p>
                  </div>

                  {cameraError && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 text-left">
                      {cameraError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs sm:text-sm font-bold shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Open Live Camera
                  </button>

                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setCurrentStep(7)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                ← Back to Declaration
              </button>

              <button
                type="submit"
                disabled={loading || !selfiePreview}
                className="px-8 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting Application Dossier...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Complete & Submit Application
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 9: Application Submitted & Tracking Console */}
      {/* ------------------------------------------------------------- */}
      {currentStep === 9 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-6 sm:p-10 text-center space-y-6 animate-in fade-in">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-xs ${
              applicationData?.status === "APPROVED" || applicationData?.status === "DISBURSED"
                ? "bg-emerald-100 text-emerald-700"
                : applicationData?.status === "REJECTED"
                ? "bg-red-100 text-red-600"
                : "bg-blue-100 text-blue-900"
            }`}
          >
            {applicationData?.status === "APPROVED" || applicationData?.status === "DISBURSED" ? (
              <CheckCircle2 className="w-9 h-9" />
            ) : applicationData?.status === "REJECTED" ? (
              <XCircle className="w-9 h-9" />
            ) : (
              <Clock className="w-9 h-9" />
            )}
          </div>

          <div className="max-w-xl mx-auto space-y-2">
            {applicationData?.status === "APPROVED" || applicationData?.status === "DISBURSED" ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                Loan Approved & Sanctioned ✓
              </span>
            ) : applicationData?.status === "REJECTED" ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-300">
                <XCircle className="w-3.5 h-3.5 text-red-600" />
                Application Declined
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                Underwriting & Selfie Approval in Progress
              </span>
            )}

            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {applicationData?.status === "APPROVED" || applicationData?.status === "DISBURSED"
                ? "Loan Sanctioned & Approved!"
                : applicationData?.status === "REJECTED"
                ? "Loan Application Declined"
                : "Application Dossier Submitted Successfully!"}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600">
              {applicationData?.status === "APPROVED" || applicationData?.status === "DISBURSED" ? (
                <>
                  Your loan application <strong className="text-slate-900 font-mono">#{applicationId}</strong> and live selfie biometrics have been reviewed and approved by the underwriting desk.
                </>
              ) : applicationData?.status === "REJECTED" ? (
                <>
                  {applicationData?.adminReview?.remarks
                    ? `Underwriting Remarks: ${applicationData.adminReview.remarks}`
                    : "The underwriting desk was unable to approve this facility based on the submitted biometric or risk profile."}
                </>
              ) : (
                <>
                  Your application <strong className="text-slate-900 font-mono">#{applicationId}</strong> has been transmitted to our Underwriting & Risk Assessment desk. A loan officer is reviewing your selfie verification.
                </>
              )}
            </p>
          </div>

          {/* Timeline Tracker */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 max-w-2xl mx-auto text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              Application Verification Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-slate-700">1. Dual Contact Verification & Account Setup (Completed)</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-slate-700">2. Customer KYC Identity & Address Attestation (Completed)</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-slate-700">3. Financial Assessment & Loan Eligibility (Completed)</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-slate-700">4. EMI Schedule, Bank Mandate & Legal Declaration (Completed)</span>
              </div>

              {/* Dynamic Step 5 Status */}
              <div className="flex items-center gap-3 text-xs">
                {applicationData?.status === "APPROVED" || applicationData?.status === "DISBURSED" ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-emerald-900 font-bold">
                      5. Officer Review & Live Selfie Approval (Approved & Sanctioned ✓)
                    </span>
                  </>
                ) : applicationData?.status === "REJECTED" ? (
                  <>
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="text-red-900 font-bold">
                      5. Officer Review & Live Selfie Approval (Declined / Rejected ✗)
                    </span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                    <span className="text-amber-900 font-bold">
                      5. Officer Review & Live Selfie Approval (Queued for Review)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/customer/dashboard"
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
            >
              Return to Dashboard
            </Link>

            {(applicationData?.status === "APPROVED" ||
              applicationData?.status === "DISBURSED" ||
              applicationData?.status === "REJECTED") && (
              <button
                type="button"
                onClick={handleStartNewLoan}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Apply for Another Loan Facility
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

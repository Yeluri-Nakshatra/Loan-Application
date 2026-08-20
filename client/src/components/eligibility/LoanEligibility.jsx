import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calculator,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Briefcase,
  Building,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  PieChart,
  Percent,
  Sliders,
  HelpCircle,
  Info,
  XCircle,
} from "lucide-react";
import { checkLoanEligibility, getLatestEligibility, getKYCStatus } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function LoanEligibility() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Form State
  const [monthlyIncome, setMonthlyIncome] = useState(50000);
  const [requestedAmount, setRequestedAmount] = useState(300000);
  const [tenureMonths, setTenureMonths] = useState(24);
  const [cibilScore, setCibilScore] = useState(760);
  const [currentDebts, setCurrentDebts] = useState(5000);
  const [activeLoanEMI, setActiveLoanEMI] = useState(0);
  const [employmentType, setEmploymentType] = useState("salaried");
  const [employerName, setEmployerName] = useState("Standard Chartered / Tech Corp");
  const [designation, setDesignation] = useState("Senior Software Engineer");

  // Assessment Result State
  const [assessment, setAssessment] = useState(null);

  // Live Calculations for Real-time Feedback
  const liveDti =
    monthlyIncome > 0
      ? Math.round((currentDebts / monthlyIncome) * 1000) / 10
      : 0;

  const liveDisposable = Math.max(0, monthlyIncome - currentDebts);

  const getCibilColor = (score) => {
    if (score >= 750) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (score >= 650) return "text-blue-800 bg-blue-50 border-blue-200";
    if (score >= 550) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-red-700 bg-red-50 border-red-200";
  };

  const getCibilLabel = (score) => {
    if (score >= 750) return "Excellent (Tier 1 Prime)";
    if (score >= 650) return "Good (Prime Standard)";
    if (score >= 550) return "Fair (Moderate Risk)";
    return "Poor (High Risk)";
  };

  // Load previous assessment on mount (and verify KYC prerequisite)
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const [eligRes, kycRes] = await Promise.all([
          getLatestEligibility(user?.id, user?.email),
          getKYCStatus(user?.id, user?.email),
        ]);

        if (kycRes && kycRes.kycStatus !== "VERIFIED") {
          toast.error("Please complete your KYC identity verification first before checking loan eligibility.");
          navigate("/customer/kyc", { replace: true });
          return;
        }

        if (eligRes.activeExistingEMI > 0) {
          setActiveLoanEMI(eligRes.activeExistingEMI);
          setCurrentDebts(Math.max(eligRes.activeExistingEMI, eligRes.assessment?.currentDebts || 0));
        } else if (eligRes.assessment) {
          setCurrentDebts(eligRes.assessment.currentDebts || 5000);
        }

        if (eligRes.assessment) {
          setAssessment(eligRes.assessment);
          setMonthlyIncome(eligRes.assessment.monthlyIncome || 50000);
          setRequestedAmount(eligRes.assessment.requestedAmount || 300000);
          setTenureMonths(eligRes.assessment.tenureMonths || 24);
          setCibilScore(eligRes.assessment.cibilScore || 760);
          setEmploymentType(eligRes.assessment.employmentType || "salaried");
          setEmployerName(eligRes.assessment.employerName || "");
          setDesignation(eligRes.assessment.designation || "");
        }
      } catch (err) {
        console.error("Error loading previous eligibility assessment:", err);
      } finally {
        setFetching(false);
      }
    };

    if (user) {
      fetchLatest();
    } else {
      setFetching(false);
    }
  }, [user]);

  const handleCalculate = async (e) => {
    e.preventDefault();

    if (!monthlyIncome || monthlyIncome <= 0) {
      toast.error("Please enter a valid monthly income.");
      return;
    }

    if (!requestedAmount || requestedAmount <= 0) {
      toast.error("Please enter your desired loan amount.");
      return;
    }

    if (!employerName.trim() || !designation.trim()) {
      toast.error("Please provide your employer name and job designation.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        userId: user?.id,
        email: user?.email,
        monthlyIncome: Number(monthlyIncome),
        requestedAmount: Number(requestedAmount),
        tenureMonths: Number(tenureMonths),
        cibilScore: Number(cibilScore),
        currentDebts: Number(currentDebts) || 0,
        employmentType,
        employerName: employerName.trim(),
        designation: designation.trim(),
      };

      const res = await checkLoanEligibility(payload);
      setAssessment(res.assessment);

      if (res.decision === "ELIGIBLE") {
        toast.success("Congratulations! You are fully eligible for the requested loan facility.");
      } else if (res.decision === "PARTIALLY_ELIGIBLE") {
        toast.info("You are pre-approved with a customized counter-offer limit.");
      } else {
        toast.error("Eligibility requirements not met at this time.");
      }

      // Smooth scroll down to the decision card
      setTimeout(() => {
        const decisionCard = document.getElementById("eligibility-decision-card");
        if (decisionCard) {
          decisionCard.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } catch (err) {
      toast.error(err.message || "Failed to evaluate loan eligibility.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-900 animate-spin mb-2" />
        <p className="text-xs text-slate-500 font-medium">Loading credit assessment tools...</p>
      </div>
    );
  }

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
            Institutional Loan Eligibility Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Input your financial parameters to calculate instant loan capacity, debt-to-income affordability, and pre-approved APR rates.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-950 border border-blue-200 self-start sm:self-center">
          <ShieldCheck className="w-4 h-4 text-blue-800" />
          FOIR 50% Banking Standards
        </div>
      </div>

      {/* Main Assessment Form Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Financial & Employment Attestation</h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Evaluates CIBIL credit tiers and Fixed Obligation to Income Ratios (FOIR).
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-800 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <form onSubmit={handleCalculate} className="p-6 sm:p-8 space-y-8">
          {/* Section 1: Income & Employment */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Briefcase className="w-4 h-4 text-blue-900" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                1. Income & Employment Profile
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Monthly Net In-Hand Income (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="10000"
                    step="1000"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                    placeholder="e.g. 50000"
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Annual Equivalent: ₹{(monthlyIncome * 12).toLocaleString()}/year
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Employment Classification <span className="text-red-500">*</span>
                </label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                >
                  <option value="salaried">Salaried (Corporate / MNC / Govt)</option>
                  <option value="self_employed">Self-Employed Professional (Doctor, CA, Consultant)</option>
                  <option value="business">Business Enterprise / Proprietor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Employer / Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={employerName}
                  onChange={(e) => setEmployerName(e.target.value)}
                  placeholder="e.g. Acme Financial Group"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Job Designation / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Lead Technical Architect"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Credit Score & Existing Debts */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <CreditCard className="w-4 h-4 text-blue-900" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                2. Credit Rating & Existing Obligations
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    CIBIL / Credit Score (300 - 900) <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getCibilColor(cibilScore)}`}>
                    {cibilScore} • {getCibilLabel(cibilScore)}
                  </span>
                </div>
                <input
                  type="range"
                  min="300"
                  max="900"
                  step="5"
                  value={cibilScore}
                  onChange={(e) => setCibilScore(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-900"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                  <span>300 (Poor)</span>
                  <span>550 (Fair)</span>
                  <span>650 (Good)</span>
                  <span>750+ (Excellent)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Current Monthly Debts / Existing EMIs (₹) <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-xs font-bold ${liveDti > 50 ? "text-red-600" : liveDti > 35 ? "text-amber-600" : "text-emerald-600"}`}>
                    DTI: {liveDti}%
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={currentDebts}
                    onChange={(e) => setCurrentDebts(Number(e.target.value))}
                    placeholder="e.g. 5000"
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 font-mono"
                  />
                </div>
                {activeLoanEMI > 0 && (
                  <div className="mt-1.5 p-2 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-950 flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <span>
                      Includes <strong>₹{activeLoanEMI.toLocaleString()}/mo</strong> from your verified active loan.
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  Disposable Income: <strong className="text-slate-700 font-mono">₹{liveDisposable.toLocaleString()}</strong>/month
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Requested Loan & Tenure */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <DollarSign className="w-4 h-4 text-blue-900" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                3. Desired Loan Facility
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Requested Loan Amount (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="5000"
                    step="1000"
                    value={requestedAmount}
                    onChange={(e) => setRequestedAmount(Number(e.target.value))}
                    placeholder="e.g. 300000"
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Repayment Tenure <span className="text-red-500">*</span>
                </label>
                <select
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                >
                  <option value={12}>12 Months (1 Year)</option>
                  <option value={24}>24 Months (2 Years)</option>
                  <option value={36}>36 Months (3 Years)</option>
                  <option value={48}>48 Months (4 Years)</option>
                  <option value={60}>60 Months (5 Years)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submission Action */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Evaluates against live underwriting algorithms with 0 impact on your official credit file.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3 bg-blue-900 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running Underwriting Evaluation...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4" />
                  Evaluate Loan Eligibility
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Decision Results Section */}
      {assessment && (
        <div id="eligibility-decision-card" className="space-y-6 animate-in fade-in">
          {/* Main Decision Banner */}
          <div
            className={`p-6 sm:p-8 rounded-xl border shadow-sm ${
              assessment.decision === "ELIGIBLE"
                ? "bg-emerald-50/90 border-emerald-300 text-emerald-950"
                : assessment.decision === "PARTIALLY_ELIGIBLE"
                ? "bg-amber-50/90 border-amber-300 text-amber-950"
                : "bg-red-50/90 border-red-300 text-red-950"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-1">
                  {assessment.decision === "ELIGIBLE" ? (
                    <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  ) : assessment.decision === "PARTIALLY_ELIGIBLE" ? (
                    <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm">
                      <Clock className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-sm">
                      <AlertCircle className="w-7 h-7" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        assessment.decision === "ELIGIBLE"
                          ? "bg-emerald-200/70 text-emerald-900"
                          : assessment.decision === "PARTIALLY_ELIGIBLE"
                          ? "bg-amber-200/70 text-amber-900"
                          : "bg-red-200/70 text-red-900"
                      }`}
                    >
                      Decision: {assessment.decision.replace("_", " ")}
                    </span>
                    <span className="text-xs text-slate-500">
                      Evaluated on {new Date(assessment.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold mt-1">
                    {assessment.decision === "ELIGIBLE"
                      ? "Fully Eligible for Requested Credit Facility!"
                      : assessment.decision === "PARTIALLY_ELIGIBLE"
                      ? "Pre-Approved with Counter-Offer Facility"
                      : "Eligibility Thresholds Not Met"}
                  </h2>

                  <p className="text-xs sm:text-sm mt-1 text-slate-700 max-w-2xl">
                    {assessment.decisionReason}
                  </p>
                </div>
              </div>

              {assessment.decision !== "NOT_ELIGIBLE" ? (
                <button
                  type="button"
                  onClick={() => {
                    toast.success("Routing to Step 3: Loan Application Form...");
                    navigate("/customer/apply");
                  }}
                  className="px-6 py-3 bg-blue-900 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition-colors shrink-0 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Proceed to Loan Application (Step 3)
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="px-5 py-3 bg-red-100 border border-red-300 rounded-lg text-red-950 text-xs font-bold text-center max-w-xs shrink-0">
                  <div className="flex items-center justify-center gap-1.5 text-red-700 mb-1">
                    <XCircle className="w-4 h-4" />
                    <span>Application Blocked</span>
                  </div>
                  Loan cannot be issued. Criteria thresholds not met.
                </div>
              )}
            </div>
          </div>

          {/* Detailed Financial Diagnostics Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Max Eligible Loan
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">
                ₹{assessment.maxEligibleAmount.toLocaleString()}.00
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Requested: ₹{assessment.requestedAmount.toLocaleString()}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Estimated Monthly EMI
              </span>
              <p className="text-2xl font-bold text-blue-950 mt-2 font-mono">
                ₹{assessment.estimatedMonthlyEMI.toLocaleString()}/mo
              </p>
              <p className="text-xs text-slate-500 mt-1">
                For {assessment.tenureMonths} Months Tenure
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Debt-to-Income (DTI)
              </span>
              <p
                className={`text-2xl font-bold mt-2 font-mono ${
                  assessment.dtiRatio > 50
                    ? "text-red-600"
                    : assessment.dtiRatio > 35
                    ? "text-amber-600"
                    : "text-emerald-700"
                }`}
              >
                {assessment.dtiRatio}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Status: {assessment.breakdown?.dtiStatus || "Healthy"}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pre-Approved APR Rate
              </span>
              <p className="text-2xl font-bold text-emerald-700 mt-2 font-mono">
                {assessment.suggestedInterestRate}% APR
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Credit Rating: {assessment.breakdown?.creditTier || "Good"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

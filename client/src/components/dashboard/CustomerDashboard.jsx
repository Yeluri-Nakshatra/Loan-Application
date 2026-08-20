import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  ShieldCheck,
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle2,
  FileText,
  DollarSign,
  PlusCircle,
  LogOut,
  AlertCircle,
  ChevronRight,
  UserCheck,
  Building,
  Calendar,
  ShieldAlert,
  ArrowRight,
  Calculator,
  Camera,
  Check,
  FolderOpen,
  RefreshCw,
  Eye,
  XCircle,
  X,
} from "lucide-react";
import {
  getKYCStatus,
  getLatestEligibility,
  getApplicationStatus,
} from "../../services/api";

export default function CustomerDashboard() {
  const { user, logoutUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [kycStatus, setKycStatus] = useState("NOT_SUBMITTED");
  const [kycRecord, setKycRecord] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [activeApp, setActiveApp] = useState(null);
  const [allApps, setAllApps] = useState([]);
  const [selectedDossierDetail, setSelectedDossierDetail] = useState(null);
  const [stats, setStats] = useState({
    activeBorrowing: 0,
    activeLoansCount: 0,
    nextDueEMI: 0,
    nextDueDate: "No Active Repayment",
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [kycRes, eligRes, appRes] = await Promise.all([
        getKYCStatus(user?.id, user?.email),
        getLatestEligibility(user?.id, user?.email),
        getApplicationStatus(user?.id, user?.email),
      ]);

      setKycStatus(kycRes.kycStatus || "NOT_SUBMITTED");
      setKycRecord(kycRes.kyc);

      if (eligRes.assessment) {
        setEligibility(eligRes.assessment);
      }

      if (appRes.application) {
        setActiveApp(appRes.application);
      } else {
        setActiveApp(null);
      }

      if (appRes.applications) {
        setAllApps(appRes.applications);
      }

      if (appRes.stats) {
        setStats(appRes.stats);
      }
    } catch (err) {
      console.error("Failed to load customer dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const handleSignOut = () => {
    logoutUser();
    toast.info("Signed out of your customer account.");
    navigate("/login");
  };

  const handleApplyNewClick = () => {
    if (kycStatus !== "VERIFIED") {
      toast.error("KYC verification required before applying for credit facilities. Redirecting to KYC portal...");
      navigate("/customer/kyc");
      return;
    }
    if (!eligibility || eligibility.decision === "NOT_ELIGIBLE") {
      toast.info("Please evaluate your loan eligibility and credit capacity first.");
      navigate("/customer/eligibility");
      return;
    }
    if (activeApp && (activeApp.status === "APPROVED" || activeApp.status === "REJECTED" || activeApp.status === "DISBURSED")) {
      navigate("/customer/apply?new=true");
    } else {
      navigate("/customer/apply");
    }
  };

  const handleViewDossier = (appId) => {
    if (kycStatus !== "VERIFIED") {
      navigate("/customer/kyc");
      return;
    }
    const targetId = appId || activeApp?.applicationId;
    if (targetId) {
      navigate(`/customer/apply?id=${targetId}`);
    } else {
      navigate("/customer/apply");
    }
  };

  const handleApplyClick = handleApplyNewClick;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Banner / Account Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Welcome back, {user?.name || "Customer"}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
                  <UserCheck className="w-3.5 h-3.5 text-blue-700" />
                  Verified Borrower
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Account: <span className="font-mono text-slate-700">{user?.email}</span> • Mobile: <span className="font-mono text-slate-700">{user?.phone || "N/A"}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={fetchDashboardData}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Refresh Dashboard Data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <Link
                to="/customer/eligibility"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-950 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer"
              >
                <Calculator className="w-4 h-4 text-blue-900" />
                Borrowing Power
              </Link>

              <Link
                to="/customer/kyc"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-blue-900" />
                {kycStatus === "VERIFIED" ? "KYC Details" : "Complete KYC"}
              </Link>

              <button
                type="button"
                onClick={handleApplyNewClick}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                {activeApp && activeApp.status === "DRAFT"
                  ? "Resume Application"
                  : activeApp && (activeApp.status === "APPROVED" || activeApp.status === "DISBURSED")
                  ? "Apply for Another Loan"
                  : "Apply for Loan"}
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-slate-500" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        {/* Dynamic Section 1: Active Loan Dossier Journey Tracker */}
        {activeApp ? (
          <div className="p-5 sm:p-6 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Loan Dossier #{activeApp.applicationId} • {activeApp.loanPurpose?.replace("_", " ").toUpperCase()}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                  {activeApp.status === "APPROVED"
                    ? "Loan Sanctioned & Approved by Underwriting Desk ✓"
                    : activeApp.status === "UNDER_REVIEW"
                    ? "Application Under Review (Officer Inspecting Live Selfie & KYC)"
                    : activeApp.status === "REJECTED"
                    ? "Loan Application Declined by Underwriting Desk"
                    : `Application in Progress (Step ${activeApp.currentStep || 5} of 8)`}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    activeApp.status === "APPROVED"
                      ? "bg-emerald-100 text-emerald-800"
                      : activeApp.status === "REJECTED"
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {activeApp.status.replace("_", " ")}
                </span>

                <button
                  type="button"
                  onClick={() => handleViewDossier(activeApp.applicationId)}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  {activeApp.status === "DRAFT" ? "Resume Application" : "View Dossier"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900">1. Loan & EMI</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    ${activeApp.loanAmount?.toLocaleString()} • {activeApp.tenureMonths}M
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2.5">
                {activeApp.bankDetails?.bankName ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-slate-900">2. Bank Setup</div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[120px]">
                    {activeApp.bankDetails?.bankName || "Pending Setup"}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2.5">
                {activeApp.declaration?.termsAccepted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-slate-900">3. NACH Mandate</div>
                  <div className="text-[11px] text-slate-500">
                    {activeApp.declaration?.termsAccepted ? "Signed & Verified" : "Pending Signature"}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2.5">
                {activeApp.selfieVerification?.selfieUrl ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Camera className="w-4 h-4 text-blue-900 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-slate-900">4. Live Selfie</div>
                  <div className="text-[11px] text-slate-500">
                    {activeApp.selfieVerification?.selfieUrl ? "Biometrics Captured" : "Pending Capture"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State CTA Card when user has no active loan */
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Ready to Apply for a Sanctioned Credit Facility?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  Select your desired loan amount and tenure with instant automated sanctioning and disbursement.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyClick}
              className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs sm:text-sm font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              Start Loan Application
            </button>
          </div>
        )}

        {/* Dynamic Section 2: KYC Compliance Alert Card */}
        <div
          className={`p-4 sm:p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            kycStatus === "VERIFIED"
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
              : kycStatus === "PENDING"
              ? "bg-amber-50/90 border-amber-200 text-amber-950"
              : kycStatus === "REJECTED"
              ? "bg-red-50/90 border-red-200 text-red-950"
              : "bg-blue-50/90 border-blue-200 text-blue-950"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div className="shrink-0 mt-0.5">
              {kycStatus === "VERIFIED" ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : kycStatus === "PENDING" ? (
                <Clock className="w-6 h-6 text-amber-600" />
              ) : kycStatus === "REJECTED" ? (
                <AlertCircle className="w-6 h-6 text-red-600" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-blue-800" />
              )}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">
                {kycStatus === "VERIFIED"
                  ? "Identity Verified (KYC Compliance Completed)"
                  : kycStatus === "PENDING"
                  ? "KYC Verification Under Review"
                  : kycStatus === "REJECTED"
                  ? "KYC Verification Action Required"
                  : "Complete Your KYC to Unlock Credit Facilities"}
              </h2>
              <p className="text-xs sm:text-sm mt-0.5 text-slate-600">
                {kycStatus === "VERIFIED"
                  ? `Verified as ${kycRecord?.fullName || user?.name} (${kycRecord?.idType}: ${kycRecord?.idNumber}). Identity and residential attestation confirmed.`
                  : kycStatus === "PENDING"
                  ? "Your identity document and residential address have been submitted."
                  : kycStatus === "REJECTED"
                  ? `Your KYC was rejected: ${kycRecord?.rejectionReason || "Details could not be verified."}. Please update and resubmit.`
                  : "Regulatory guidelines mandate identity and address verification before processing borrowing applications."}
              </p>
            </div>
          </div>

          <Link
            to="/customer/kyc"
            className={`self-start sm:self-center px-4 py-2 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
              kycStatus === "VERIFIED"
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : kycStatus === "PENDING"
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-blue-900 text-white hover:bg-blue-800 shadow-sm"
            }`}
          >
            {kycStatus === "VERIFIED" ? "View KYC Record" : "Open KYC Portal"}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Dynamic Section 3: Loan Eligibility & Credit Capacity Widget */}
        <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center shrink-0 mt-0.5">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Loan Eligibility & Credit Capacity Engine
                </h3>
                {eligibility && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      eligibility.decision === "ELIGIBLE"
                        ? "bg-emerald-100 text-emerald-800"
                        : eligibility.decision === "PARTIALLY_ELIGIBLE"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {eligibility.decision.replace("_", " ")}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                {eligibility
                  ? `Max Sanctionable Capacity: ₹${eligibility.maxEligibleAmount.toLocaleString()} • DTI: ${eligibility.dtiRatio}% • Rate: ${eligibility.suggestedInterestRate}% APR`
                  : "Calculate your maximum borrowable limit, debt-to-income affordability, and pre-approved APR rates."}
              </p>
            </div>
          </div>

          <Link
            to="/customer/eligibility"
            className="self-start sm:self-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {eligibility ? "Recalculate Eligibility" : "Check Eligibility"}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Dynamic Section 4: KPI Financial Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Active Borrowing */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Borrowing</span>
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-900">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3 font-mono">
              ₹{stats.activeBorrowing.toLocaleString()}.00
            </p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {stats.activeLoansCount > 0
                  ? `${stats.activeLoansCount} Active Sanctioned Loan${stats.activeLoansCount > 1 ? "s" : ""}`
                  : "No Active Borrowings"}
              </span>
            </div>
          </div>

          {/* Assessed Credit Line */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Assessed Credit Line
              </span>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3 font-mono">
              ₹{eligibility ? eligibility.maxEligibleAmount.toLocaleString() : "0"}.00
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {eligibility ? `${eligibility.suggestedInterestRate}% APR Tier 1` : "Run eligibility check to evaluate"}
            </p>
          </div>

          {/* Monthly Next Due EMI */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Monthly EMI</span>
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3 font-mono">
              ₹{stats.nextDueEMI.toLocaleString()}.00
            </p>
            <p className="text-xs text-amber-700 font-medium mt-1">
              {stats.nextDueEMI > 0 ? `Due on ${stats.nextDueDate}` : "No scheduled repayments"}
            </p>
          </div>

          {/* CIBIL Score */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">CIBIL Score</span>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3 font-mono">
              {eligibility ? `${eligibility.cibilScore} / 900` : "N/A"}
            </p>
            <p className="text-xs text-emerald-700 font-semibold mt-1">
              {eligibility ? eligibility.breakdown?.creditTier || "Tier 1 Prime" : "Pending Financial Assessment"}
            </p>
          </div>
        </div>

        {/* Dynamic Section 5: Real Loan Portfolio & Applications Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Your Loan Portfolio & Applications</h2>
              <p className="text-xs text-slate-500">Real-time status of your requested facilities</p>
            </div>
            <button
              type="button"
              onClick={handleApplyClick}
              className="text-xs font-bold text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
            >
              New Application <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <th className="px-6 py-3.5">Loan ID & Product</th>
                  <th className="px-6 py-3.5">Facility Amount</th>
                  <th className="px-6 py-3.5">Tenure & Monthly EMI</th>
                  <th className="px-6 py-3.5">Application Date</th>
                  <th className="px-6 py-3.5">Disbursement Bank</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {allApps.length > 0 ? (
                  allApps.map((app) => (
                    <tr key={app._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        <div className="capitalize">{app.loanPurpose?.replace("_", " ")} Loan</div>
                        <span className="text-xs font-mono text-blue-900 font-bold">{app.applicationId}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 font-mono">
                        ₹{app.loanAmount?.toLocaleString()}.00
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        <div>{app.tenureMonths} Months</div>
                        <div className="text-xs text-slate-500 font-semibold font-mono">
                          ₹{app.monthlyEMI?.toLocaleString()}/mo
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(app.createdAt).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {app.bankDetails?.bankName ? (
                          <div>
                            <div className="font-semibold text-slate-900">{app.bankDetails.bankName}</div>
                            <div className="text-xs font-mono text-slate-400">
                              A/C: ••••{app.bankDetails.accountNumber ? app.bankDetails.accountNumber.slice(-4) : "N/A"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Pending Setup</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedDossierDetail(app)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border transition-transform hover:scale-105 cursor-pointer ${
                            app.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : app.status === "REJECTED"
                              ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                              : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                          }`}
                          title="Click to view full decision and underwriting details"
                        >
                          {app.status.replace("_", " ")}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedDossierDetail(app)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 rounded-md text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {app.status === "REJECTED" ? "View Reason" : "View Dossier"}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold">No Loan Applications Found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        When you submit a loan application, your facility details and real-time approval status will appear here.
                      </p>
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={handleApplyClick}
                          className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                        >
                          Apply for Your First Loan
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Detailed Loan Dossier & Rejection / Approval Reason Modal */}
      {/* ------------------------------------------------------------- */}
      {selectedDossierDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-7 border border-slate-200 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Loan Dossier #{selectedDossierDetail.applicationId}
                </span>
                <h3 className="text-lg font-bold text-slate-900 capitalize">
                  {selectedDossierDetail.loanPurpose?.replace("_", " ")} Loan Application
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDossierDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Announcement Banner */}
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                selectedDossierDetail.status === "APPROVED"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : selectedDossierDetail.status === "REJECTED"
                  ? "bg-red-50 border-red-200 text-red-950"
                  : "bg-amber-50 border-amber-200 text-amber-950"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {selectedDossierDetail.status === "APPROVED" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : selectedDossierDetail.status === "REJECTED" ? (
                  <XCircle className="w-5 h-5 text-red-600" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold">
                  {selectedDossierDetail.status === "APPROVED"
                    ? "Loan Sanctioned & Approved ✓"
                    : selectedDossierDetail.status === "REJECTED"
                    ? "Loan Application Declined by Underwriting Desk"
                    : "Application Underwriting Review in Progress"}
                </h4>
                <p className="text-xs mt-1 text-slate-700 leading-relaxed">
                  {selectedDossierDetail.status === "APPROVED"
                    ? "Your facility has been officially sanctioned. Disbursement has been verified to your linked bank account."
                    : selectedDossierDetail.status === "REJECTED"
                    ? "This loan request was declined during the risk review or live biometric verification stage."
                    : "A loan underwriting officer is reviewing your live selfie, KYC, and affordability ratios."}
                </p>
              </div>
            </div>

            {/* Officer Remarks & Rejection Reason Callout */}
            {selectedDossierDetail.adminReview?.remarks && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-blue-900" />
                  <span>Underwriting Officer Remarks & Decision Reason</span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-800 bg-white p-3 rounded-lg border border-slate-200/80 leading-relaxed">
                  "{selectedDossierDetail.adminReview.remarks}"
                </p>
                {selectedDossierDetail.adminReview.reviewedAt && (
                  <p className="text-[11px] text-slate-400">
                    Decision Date: {new Date(selectedDossierDetail.adminReview.reviewedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Financial Parameters Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Loan Amount</span>
                <strong className="text-sm font-mono text-slate-900">
                  ₹{selectedDossierDetail.loanAmount?.toLocaleString()}.00
                </strong>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Tenure & EMI</span>
                <strong className="text-sm font-mono text-blue-950">
                  {selectedDossierDetail.tenureMonths}M • ₹{selectedDossierDetail.monthlyEMI?.toLocaleString()}/mo
                </strong>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Interest Rate</span>
                <strong className="text-sm font-mono text-emerald-700">
                  {selectedDossierDetail.interestRate}% APR
                </strong>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Linked Bank</span>
                <strong className="text-xs font-semibold text-slate-900 block truncate">
                  {selectedDossierDetail.bankDetails?.bankName || "HDFC Bank"}
                </strong>
                <span className="text-[10px] font-mono text-slate-400">
                  A/C: ••••{selectedDossierDetail.bankDetails?.accountNumber ? selectedDossierDetail.bankDetails.accountNumber.slice(-4) : "N/A"}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedDossierDetail(null)}
                className="w-full sm:w-auto px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Close Window
              </button>

              <button
                type="button"
                onClick={() => {
                  const appId = selectedDossierDetail.applicationId;
                  setSelectedDossierDetail(null);
                  navigate(`/customer/apply?id=${appId}`);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Open Full Verification Journey (Step 9)
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

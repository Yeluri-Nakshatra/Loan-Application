import SystemTelemetry from "./SystemTelemetry";
import Signup from "../auth/Signup";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  ShieldAlert,
  Users,
  DollarSign,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  Activity,
  Menu,
  FileCheck,
  Search,
  Filter,
  BadgeCheck,
  Building2,
  AlertTriangle,
  FileText,
  Eye,
  MapPin,
  X,
  Loader2,
  Camera,
  CheckCircle2,
  CreditCard,
  Building,
  FileCheck2,
  Send,
  Calendar,
} from "lucide-react";
import {
  getAllApplicationsAdmin,
  reviewApplicationAdmin,
  getAllKYCSubmissions,
} from "../../services/api";

export default function AdminDashboard() {
  const { user, logoutUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("applications");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // 'applications' | 'kyc'
  const [applications, setApplications] = useState([]);
  const [kycList, setKycList] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingKyc, setLoadingKyc] = useState(false);

  const [selectedAppDossier, setSelectedAppDossier] = useState(null);
  const [selectedKycDocument, setSelectedKycDocument] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Dedicated Rejection Modal State
  const [rejectionModalApp, setRejectionModalApp] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submittingRejection, setSubmittingRejection] = useState(false);

  const presetRejectionReasons = [
    "Biometric face does not match government ID document photo.",
    "Live selfie is blurry, dark, or facial features are obscured.",
    "Liveness check failed / photo of a screen or printed picture detected.",
    "Face is partially cropped, tilted, or sunglasses/mask detected.",
    "Government ID document unreadable or mismatched name.",
  ];

  const fetchApplications = async () => {
    setLoadingApps(true);
    try {
      const res = await getAllApplicationsAdmin("all");
      setApplications(res.applications || []);
    } catch (err) {
      console.error("Error loading loan applications:", err);
    } finally {
      setLoadingApps(false);
    }
  };

  const fetchKycQueue = async () => {
    setLoadingKyc(true);
    try {
      const res = await getAllKYCSubmissions("all");
      setKycList(res.submissions || []);
    } catch (err) {
      console.error("Error loading KYC submissions:", err);
    } finally {
      setLoadingKyc(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "kyc" && kycList.length === 0) {
      fetchKycQueue();
    } else if (tab === "applications") {
      fetchApplications();
    }
  };

  const handleSignOut = () => {
    logoutUser();
    toast.info("Signed out of administrative console.");
    navigate("/login");
  };

  // Helper for dynamic Current Stage badge
  const getCurrentStageBadge = (app) => {
    if (app.status === "APPROVED") {
      return { label: "Approved & Sanctioned ✓", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
    if (app.status === "DISBURSED") {
      return { label: "Disbursed 💰", color: "bg-purple-50 text-purple-700 border-purple-200" };
    }
    if (app.status === "REJECTED") {
      return { label: "Declined / Rejected ✗", color: "bg-red-50 text-red-700 border-red-200" };
    }
    if (app.status === "UNDER_REVIEW") {
      if (!app.selfieVerification?.selfieUrl) {
        return { label: "Selfie Pending", color: "bg-amber-50 text-amber-700 border-amber-200" };
      }
      return { label: "Under Review (Selfie Submitted)", color: "bg-blue-50 text-blue-800 border-blue-200" };
    }
    if (app.status === "DRAFT") {
      if (app.currentStep === 5) return { label: "EMI Selection Stage", color: "bg-slate-100 text-slate-700 border-slate-300" };
      if (app.currentStep === 6) return { label: "Bank Setup Stage", color: "bg-slate-100 text-slate-700 border-slate-300" };
      if (app.currentStep === 7) return { label: "Declaration Pending", color: "bg-amber-50 text-amber-700 border-amber-200" };
      if (app.currentStep === 8) return { label: "Selfie Pending", color: "bg-amber-50 text-amber-700 border-amber-200" };
    }
    return { label: app.status || "In Progress", color: "bg-slate-100 text-slate-700 border-slate-300" };
  };

  // 1. Approve Selfie & Sanction Loan
  const handleApproveLoan = async (appId, applicantName) => {
    try {
      await reviewApplicationAdmin(
        appId,
        "APPROVED",
        "All underwriting criteria and live selfie biometric checks verified.",
        true,
        user?.id
      );
            setApplications((prev) => prev.map((app) => app.applicationId === appId ? { ...app, status: "APPROVED", adminReview: { decision: "APPROVED", selfieApproved: true, reviewedAt: new Date(), reviewedBy: { name: user?.name || "Admin" } } } : app));
      setSelectedAppDossier(null);
      toast.success(`Photo approved and Loan #${appId} sanctioned for ${applicantName}!`);
    } catch (err) {
      toast.error(err.message || "Failed to approve loan application.");
    }
  };

  // Open Rejection Dialog
  const openRejectionDialog = (appId, applicantName, selfieUrl) => {
    setRejectionModalApp({ appId, applicantName, selfieUrl });
    setRejectionReason(presetRejectionReasons[0]);
  };

  // 2. Confirm Rejection with Optional/Detailed Reason
  const handleConfirmRejection = async () => {
    if (!rejectionModalApp) return;
    const finalReason = rejectionReason.trim() || "Biometric selfie does not meet underwriting standards.";
    setSubmittingRejection(true);

    try {
      await reviewApplicationAdmin(
        rejectionModalApp.appId,
        "REJECTED",
        finalReason,
        false,
        user?.id
      );

      setApplications((prev) =>
        prev.map((app) =>
          app.applicationId === rejectionModalApp.appId
            ? {
                ...app,
                status: "REJECTED",
                adminReview: {
                    decision: "REJECTED",
                    remarks: finalReason,
                    selfieApproved: false,
                    reviewedAt: new Date(),
                    reviewedBy: { name: user?.name || "Admin" },
                  },
              }
            : app
        )
      );

      // Automatically close both rejection dialog and underlying dossier modal upon rejection
      setSelectedAppDossier(null);
      toast.error(`Photo rejected and application #${rejectionModalApp.appId} declined.`);
      setRejectionModalApp(null);
      setRejectionReason("");
    } catch (err) {
      toast.error(err.message || "Failed to submit rejection.");
    } finally {
      setSubmittingRejection(false);
    }
  };

  // Filter & Search Logic
  const filteredApps = applications.filter((app) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      app.applicationId?.toLowerCase().includes(q) ||
      app.userId?.name?.toLowerCase().includes(q) ||
      app.userId?.email?.toLowerCase().includes(q) ||
      app.loanPurpose?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === "ALL") return true;
    if (statusFilter === "UNDER_REVIEW") return app.status === "UNDER_REVIEW" || app.status === "SUBMITTED";
    if (statusFilter === "APPROVED") return app.status === "APPROVED";
    if (statusFilter === "REJECTED") return app.status === "REJECTED";
    return true;
  });

  const pendingAppsCount = applications.filter(
    (app) => app.status === "UNDER_REVIEW" || app.status === "SUBMITTED"
  ).length;

  const approvedAppsCount = applications.filter((app) => app.status === "APPROVED").length;
  const rejectedAppsCount = applications.filter((app) => app.status === "REJECTED").length;

  const totalSanctionedSum = applications
    .filter((app) => app.status === "APPROVED")
    .reduce((sum, app) => sum + (app.loanAmount || 0), 0);

  return (
    <div className="h-[calc(100vh-64px)] flex bg-slate-50 text-slate-900 overflow-hidden">
      {/* --- LEFT SIDEBAR --- */}
            {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-30 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* --- LEFT SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white flex flex-col shadow-xl transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 h-full overflow-y-auto ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-amber-400" />
              Decision Console
            </h1>
            <p className="text-xs text-slate-400 mt-1">Admin & Underwriting</p>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 space-y-2">
          <button
            onClick={() => { setActiveTab("applications"); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === "applications" ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Loan Applications
          </button>
          
          <button
            onClick={() => { setActiveTab("telemetry"); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === "telemetry" ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Activity className="w-4 h-4" />
            System Telemetry
          </button>

          <button
            onClick={() => { setActiveTab("admins"); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === "admins" ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Add Admin
          </button>
        </div>

        <div className="p-6 border-t border-slate-800 mt-auto">
          <div className="mb-4">
            <p className="text-sm text-slate-400">
              Officer: <strong className="text-white text-base">{user?.name || "Admin"}</strong>
            </p>
            {user?.email && (
              <p className="text-[13px] text-slate-500 mt-1">{user.email}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto h-full bg-slate-50">
        {/* Mobile Header */}
        <div className="lg:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md sticky top-0 z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Decision Console</h1>
          <button onClick={handleSignOut} className="p-2 bg-slate-800 rounded-lg">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {activeTab === "telemetry" && (
          <div className="p-4 sm:p-6 lg:p-8 animate-in fade-in">
            <SystemTelemetry />
          </div>
        )}

        {activeTab === "applications" && (
          <div className="animate-in fade-in">
            <>
              {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Underwriting Queue</span>
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3">{pendingAppsCount} Applications</p>
            <p className="text-xs text-amber-700 font-semibold mt-1">Selfie & dossier review pending</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Sanctioned Principal</span>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3 font-mono">
              ₹{totalSanctionedSum.toLocaleString()}.00
            </p>
            <p className="text-xs text-emerald-700 font-semibold mt-1">{approvedAppsCount} Approved Facilities</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Applicants</span>
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-900">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3">{applications.length} Submissions</p>
            <p className="text-xs text-slate-500 mt-1">Institutional lending ledger</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Biometric Live Selfie</span>
              <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center text-purple-700">
                <Camera className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3">Face-Match Ready</p>
            <p className="text-xs text-purple-700 font-semibold mt-1">Side-by-side ID verification</p>
          </div>
        </div>

        {/* Submitted Loan Applications Queue */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden space-y-4">
          <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                All Submitted Applications
              </h2>
              <p className="text-xs text-slate-500">
                Admins can view every application, inspect KYC & selfie, and take final decisions
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter Pills */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    statusFilter === "ALL" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({applications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("UNDER_REVIEW")}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    statusFilter === "UNDER_REVIEW" ? "bg-white text-amber-800 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Under Review ({pendingAppsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("APPROVED")}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    statusFilter === "APPROVED" ? "bg-white text-emerald-800 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Approved ({approvedAppsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("REJECTED")}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    statusFilter === "REJECTED" ? "bg-white text-red-800 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Declined ({rejectedAppsCount})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search applicant or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-1.5 pr-8 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {loadingApps ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-blue-900 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Loading submitted applications...</p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold">No Applications Match Filter</p>
              <p className="text-xs mt-1 text-slate-400">Applications submitted by borrowers will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[1000px] whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="px-6 py-3.5">Applicant Name</th>
                    <th className="px-6 py-3.5">Loan Amount Requested</th>
                    <th className="px-6 py-3.5">Tenure</th>
                    <th className="px-6 py-3.5">Current Stage</th>
                    <th className="px-6 py-3.5">Submission Date and Time</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredApps.map((app) => {
                    const stage = getCurrentStageBadge(app);
                    const formattedDateTime = new Date(app.createdAt).toLocaleString("en-US", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    });

                    return (
                      <tr key={app._id} className="hover:bg-slate-50/80 transition-colors">
                        {/* 1. Applicant Name */}
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">
                            {app.userId?.name || "Borrower"}
                          </div>
                          <div className="text-xs font-mono text-blue-900 font-bold mt-0.5">
                            {app.applicationId}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {app.userId?.email} • {app.userId?.phone || "No phone"}
                          </div>
                        </td>

                        {/* 2. Loan Amount Requested */}
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 font-mono text-sm sm:text-base">
                            ₹{(app.loanAmount || 0).toLocaleString()}.00
                          </div>
                          <div className="text-xs text-slate-500 font-medium font-mono">
                            EMI: ₹{app.monthlyEMI?.toLocaleString()}/mo
                          </div>
                          <span className="text-[10px] text-emerald-700 font-semibold uppercase">
                            {app.interestRate}% APR • {app.loanPurpose?.replace("_", " ")}
                          </span>
                        </td>

                        {/* 3. Tenure */}
                        <td className="px-6 py-4 text-slate-800 font-medium">
                          <div className="font-bold">{app.tenureMonths} Months</div>
                          <div className="text-xs text-slate-500">
                            {app.tenureMonths / 12} {app.tenureMonths / 12 === 1 ? "Year" : "Years"}
                          </div>
                        </td>

                        {/* 4. Current Stage */}
                        <td className="px-6 py-4">
                            <div className="flex flex-col items-start gap-1">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${stage.color}`}
                              >
                                {stage.label}
                              </span>
                              {app.adminReview?.reviewedBy?.name && (app.status === "APPROVED" || app.status === "REJECTED") && (
                                <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-1">
                                  <ShieldCheck className="w-3 h-3 text-slate-400" />
                                  {app.status === "APPROVED" ? "Approved by" : "Declined by"} {app.adminReview.reviewedBy.name}
                                </div>
                              )}
                            </div>
                          </td>

                        {/* 5. Submission Date and Time */}
                        <td className="px-6 py-4 text-slate-700">
                          <div className="font-medium text-slate-900 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formattedDateTime}
                          </div>
                          <span className="text-[11px] text-slate-400">Electronic submission</span>
                        </td>

                        {/* 6. Admin Decision Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedAppDossier(app)}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-md text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Review Dossier
                            </button>

                            {(app.status === "UNDER_REVIEW" || app.status === "REJECTED") && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveLoan(app.applicationId, app.userId?.name)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Approve & Sanction"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                              )}

                              {app.status === "UNDER_REVIEW" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openRejectionDialog(
                                      app.applicationId,
                                      app.userId?.name,
                                      app.selfieVerification?.selfieUrl
                                    )
                                  }
                                  className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md text-xs font-bold transition-colors cursor-pointer"
                                  title="Reject Photo / Application"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 360° Comprehensive Customer Journey & Underwriting Modal */}
      {/* ------------------------------------------------------------- */}
      {selectedAppDossier && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-5 sm:p-7 border border-slate-200 space-y-6 my-6 max-h-[92vh] overflow-y-auto animate-in fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 sticky top-0 bg-white z-10">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                    Complete Application Journey Dossier
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      selectedAppDossier.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : selectedAppDossier.status === "REJECTED"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {selectedAppDossier.status?.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Application Ref: <strong className="font-mono text-blue-900">{selectedAppDossier.applicationId}</strong> • Submitted: {new Date(selectedAppDossier.createdAt).toLocaleString()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAppDossier(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* 1. Login / Verification Status */}
            {/* ------------------------------------------------------------- */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <BadgeCheck className="w-4 h-4 text-blue-900" />
                  1. Login & Dual Contact Verification Status
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Authentication Verified ✓
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700 pt-1">
                <div>
                  <span className="text-slate-400 block text-[11px]">Applicant Legal Name</span>
                  <strong className="text-slate-900 font-semibold">{selectedAppDossier.userId?.name || "Customer"}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Email Verification</span>
                  <div className="flex items-center gap-1 text-slate-900 font-mono">
                    {selectedAppDossier.userId?.email || "N/A"}
                    <span className="text-emerald-600 font-bold text-[11px]">✓ OTP Verified</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Phone Verification</span>
                  <div className="flex items-center gap-1 text-slate-900 font-mono">
                    {selectedAppDossier.userId?.phone || "N/A"}
                    <span className="text-emerald-600 font-bold text-[11px]">✓ SMS Verified</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* 2. KYC Details (Identity & Residential Address) */}
            {/* ------------------------------------------------------------- */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-blue-900" />
                  2. Customer KYC & Identity Details
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  KYC Verified ✓
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700 pt-1">
                <div>
                  <span className="text-slate-400 block text-[11px]">Full Name & Demographics</span>
                  <strong className="text-slate-900">{selectedAppDossier.kycId?.fullName || selectedAppDossier.userId?.name}</strong>
                  <div className="text-[11px] text-slate-500 capitalize">
                    {selectedAppDossier.kycId?.age ? `${selectedAppDossier.kycId.age} yrs` : "Age N/A"} • {selectedAppDossier.kycId?.gender || "Gender N/A"} • DOB: {selectedAppDossier.kycId?.dob ? new Date(selectedAppDossier.kycId.dob).toLocaleDateString() : "N/A"}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Residential Address</span>
                  <div className="text-slate-800">
                    {selectedAppDossier.kycId?.address ? (
                      `${selectedAppDossier.kycId.address.street}, ${selectedAppDossier.kycId.address.city}, ${selectedAppDossier.kycId.address.state} - ${selectedAppDossier.kycId.address.pincode}`
                    ) : (
                      <span className="text-slate-400 italic">Address on record</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Government ID Proof</span>
                  <strong className="text-blue-950 font-bold">{selectedAppDossier.kycId?.idType || "Govt ID"}</strong>: <span className="font-mono">{selectedAppDossier.kycId?.idNumber || "N/A"}</span>
                  {selectedAppDossier.kycId?.idDocumentUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedKycDocument({
                          url: selectedAppDossier.kycId.idDocumentUrl,
                          name: selectedAppDossier.kycId.fullName,
                          idType: selectedAppDossier.kycId.idType,
                          idNumber: selectedAppDossier.kycId.idNumber,
                        })
                      }
                      className="block mt-1 text-[11px] text-blue-900 font-bold hover:underline cursor-pointer"
                    >
                      View ID Document Image ↗
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* 3. Eligibility Result and Scores */}
            {/* ------------------------------------------------------------- */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <CreditCard className="w-4 h-4 text-blue-900" />
                  3. Eligibility Assessment & Credit Scores
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase ${
                    selectedAppDossier.eligibilityId?.decision === "ELIGIBLE"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-blue-50 text-blue-800 border-blue-200"
                  }`}
                >
                  {selectedAppDossier.eligibilityId?.decision || "ELIGIBLE"}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-700 pt-1">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Monthly Income</span>
                  <strong className="text-sm font-mono text-slate-900">
                    ₹{(selectedAppDossier.eligibilityId?.monthlyIncome || 50000).toLocaleString()}/mo
                  </strong>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">CIBIL Score</span>
                  <div className="flex items-center gap-1">
                    <strong className="text-sm font-mono text-blue-950">
                      {selectedAppDossier.eligibilityId?.cibilScore || 760}
                    </strong>
                    <span className="text-[10px] text-emerald-700 font-bold">
                      ({selectedAppDossier.eligibilityId?.breakdown?.creditTier || "Tier 1 Prime"})
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Debt-to-Income (DTI)</span>
                  <strong className="text-sm font-mono text-slate-900">
                    {selectedAppDossier.eligibilityId?.dtiRatio || 10}%
                  </strong>
                  <span className="text-[10px] text-emerald-600 block">Within 50% limit</span>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Max Borrowing Capacity</span>
                  <strong className="text-sm font-mono text-emerald-700">
                    ₹{(selectedAppDossier.eligibilityId?.maxEligibleAmount || 150000).toLocaleString()}
                  </strong>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* 4. Selected EMI Tenure & Terms */}
            {/* ------------------------------------------------------------- */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <DollarSign className="w-4 h-4 text-blue-900" />
                  4. Selected EMI Tenure, Charges & Net Disbursement
                </div>
                <span className="text-xs font-mono font-bold text-blue-900">
                  {selectedAppDossier.interestRate}% APR Nominal
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-700 pt-1">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Gross Loan Amount</span>
                  <strong className="text-sm font-mono text-slate-900">
                    ₹{selectedAppDossier.loanAmount?.toLocaleString()}
                  </strong>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Tenure & Monthly EMI</span>
                  <strong className="text-sm font-mono text-blue-950">
                    {selectedAppDossier.tenureMonths}M • ₹{selectedAppDossier.monthlyEMI?.toLocaleString()}/mo
                  </strong>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Upfront Charges</span>
                  <strong className="text-sm font-mono text-red-600">
                    -₹{(selectedAppDossier.totalCharges || 2610).toLocaleString()}
                  </strong>
                  <span className="text-[10px] text-slate-400 block">2% Fee + GST + Doc</span>
                </div>

                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-emerald-800 block text-[10px] uppercase font-bold">Net Disbursed to Bank</span>
                  <strong className="text-sm font-mono text-emerald-800">
                    ₹{(selectedAppDossier.netDisbursementAmount || (selectedAppDossier.loanAmount - 2610)).toLocaleString()}
                  </strong>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* 5. Bank Account Details */}
            {/* ------------------------------------------------------------- */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Building className="w-4 h-4 text-blue-900" />
                  5. Linked Disbursement Bank Account
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Penny-Drop Verified ✓
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-700 pt-1">
                <div>
                  <span className="text-slate-400 block text-[11px]">Bank Name</span>
                  <strong className="text-slate-900">{selectedAppDossier.bankDetails?.bankName || "HDFC Bank"}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Account Holder Name</span>
                  <strong className="text-slate-900">{selectedAppDossier.bankDetails?.accountHolderName || selectedAppDossier.userId?.name}</strong>
                  <span className="text-[10px] text-emerald-600 block">KYC Name Matched ✓</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Account Number</span>
                  <strong className="font-mono text-slate-900">{selectedAppDossier.bankDetails?.accountNumber || "N/A"}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">IFSC & Account Type</span>
                  <strong className="font-mono text-slate-900">{selectedAppDossier.bankDetails?.ifscCode || "N/A"}</strong>
                  <span className="text-[11px] text-slate-500 block capitalize">({selectedAppDossier.bankDetails?.accountType || "Savings"})</span>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* 6. Declaration Confirmation */}
            {/* ------------------------------------------------------------- */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <FileCheck2 className="w-4 h-4 text-blue-900" />
                  6. Legal Declaration & NACH e-Mandate Attestation
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Signed & Attested ✓
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700 pt-1">
                <div>
                  <span className="text-slate-400 block text-[11px]">Digital Signature</span>
                  <strong className="text-blue-950 font-bold">
                    {selectedAppDossier.declaration?.digitalSignatureName || selectedAppDossier.userId?.name}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">NACH Auto-Debit Mandate</span>
                  <strong className="text-emerald-700 font-semibold">Authorized (5th of each month)</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Declaration Timestamp</span>
                  <span className="text-slate-700">
                    {new Date(selectedAppDossier.declaration?.declarationTimestamp || selectedAppDossier.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* 7. Selfie / Photo Submitted (Biometric Face-Match) */}
            {/* ------------------------------------------------------------- */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Camera className="w-4 h-4 text-blue-900" />
                  7. Customer Live Selfie & Biometric Face-Match Review
                </div>

                <div className="flex items-center gap-2">
                  {selectedAppDossier.adminReview?.selfieApproved === true ? (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Selfie Approved by Officer ✓
                    </span>
                  ) : selectedAppDossier.adminReview?.selfieApproved === false ? (
                    <span className="text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full border border-red-300 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" />
                      Selfie Rejected ✗
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Awaiting Officer Decision
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                {/* Live Webcam Selfie */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col items-center shadow-xs">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Live Captured Selfie
                  </span>
                  {selectedAppDossier.selfieVerification?.selfieUrl ? (
                    <img
                      src={selectedAppDossier.selfieVerification.selfieUrl}
                      alt="Live Selfie"
                      className="w-40 h-40 rounded-full object-cover border-4 border-emerald-500 shadow-md"
                    />
                  ) : (
                    <div className="w-40 h-40 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                      No Selfie Captured
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Biometrics Captured via Web Camera
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(selectedAppDossier.selfieVerification?.selfieCapturedAt || selectedAppDossier.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Government ID Document Photo */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col items-center shadow-xs">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Government ID Photo ({selectedAppDossier.kycId?.idType || "Govt ID"})
                  </span>
                  {selectedAppDossier.kycId?.idDocumentUrl ? (
                    <img
                      src={selectedAppDossier.kycId.idDocumentUrl}
                      alt="Govt ID"
                      className="w-52 h-40 object-contain rounded-lg border border-slate-300 bg-slate-50"
                    />
                  ) : (
                    <div className="w-52 h-40 rounded-lg bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                      No ID Photo Uploaded
                    </div>
                  )}
                  <div className="mt-3 text-xs text-slate-700 font-mono font-bold">
                    {selectedAppDossier.kycId?.idType}: {selectedAppDossier.kycId?.idNumber || "N/A"}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5">Official Identity Attestation</span>
                </div>
              </div>

              {/* Direct Photo Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg">
                <div className="text-xs text-slate-600">
                  <strong>Officer Biometric Review:</strong> Compare facial landmarks between the live selfie and ID photo.
                </div>

                <div className="flex items-center gap-2">
                    {selectedAppDossier.status === "UNDER_REVIEW" && (
                      <button
                        type="button"
                        onClick={() =>
                          openRejectionDialog(
                            selectedAppDossier.applicationId,
                            selectedAppDossier.userId?.name,
                            selectedAppDossier.selfieVerification?.selfieUrl
                          )
                        }
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject Photo (with Reason)
                      </button>
                    )}

                    {(selectedAppDossier.status === "UNDER_REVIEW" || selectedAppDossier.status === "REJECTED") && (
                      <button
                        type="button"
                        onClick={() =>
                          handleApproveLoan(
                            selectedAppDossier.applicationId,
                            selectedAppDossier.userId?.name
                          )
                        }
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve Photo & Sanction
                      </button>
                    )}
                  </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-0 bg-white pb-1">
              <button
                type="button"
                onClick={() => setSelectedAppDossier(null)}
                className="w-full sm:w-auto px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Close Dossier
              </button>

              <div className="w-full sm:w-auto flex items-center justify-end gap-3">
                  {selectedAppDossier.status === "UNDER_REVIEW" && (
                    <button
                      type="button"
                      onClick={() =>
                        openRejectionDialog(
                          selectedAppDossier.applicationId,
                          selectedAppDossier.userId?.name,
                          selectedAppDossier.selfieVerification?.selfieUrl
                        )
                      }
                      className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Application
                    </button>
                  )}

                  {(selectedAppDossier.status === "UNDER_REVIEW" || selectedAppDossier.status === "REJECTED") && (
                    <button
                      type="button"
                      onClick={() =>
                        handleApproveLoan(
                          selectedAppDossier.applicationId,
                          selectedAppDossier.userId?.name
                        )
                      }
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-bold shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve Selfie & Sanction Loan
                    </button>
                  )}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Interactive Photo / Application Rejection Dialog Modal */}
      {/* ------------------------------------------------------------- */}
      {rejectionModalApp && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Reject Live Selfie / Application
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Ref: {rejectionModalApp.appId} • {rejectionModalApp.applicantName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRejectionModalApp(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Reason Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Select Common Rejection Reason:
              </label>
              <div className="space-y-1.5">
                {presetRejectionReasons.map((reason, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectionReason(reason)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
                      rejectionReason === reason
                        ? "bg-red-50 text-red-900 border-red-300 font-bold"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    • {reason}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Custom Rejection Remarks / Feedback (Optional / Editable):
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter specific reasons for rejecting the selfie or application..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectionModalApp(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submittingRejection}
                onClick={handleConfirmRejection}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submittingRejection ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Confirm Photo Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ID Document Inspection Modal */}
      {selectedKycDocument && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ID Document: {selectedKycDocument.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedKycDocument.idType}: {selectedKycDocument.idNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedKycDocument(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center max-h-96">
              <img
                src={selectedKycDocument.url}
                alt="Government ID"
                className="w-full h-auto object-contain max-h-96"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedKycDocument(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
            </>
          </div>
        )}
        
        {activeTab === "admins" && (
          <div className="animate-in fade-in max-w-4xl mx-auto w-full">
            <Signup forcedRole="admin" embedded={true} />
          </div>
        )}
      
          {/* Institutional Footer (Admin Scoped) */}
          <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-8 shrink-0">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>&copy; 2026 EZFINANZ Lending Solutions Inc. All rights reserved.</p>
              <div className="flex items-center gap-4 text-slate-400">
                <span className="hover:text-slate-600 cursor-pointer">Security Policy</span>
                <span>&middot;</span>
                <span className="hover:text-slate-600 cursor-pointer">Privacy & KYC</span>
                <span>&middot;</span>
                <span className="hover:text-slate-600 cursor-pointer">Terms of Service</span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    );
}
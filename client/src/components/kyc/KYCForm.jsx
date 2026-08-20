import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  User,
  Calendar,
  MapPin,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  Loader2,
  X,
  FileCheck,
  Eye,
} from "lucide-react";
import { submitKYC, getKYCStatus } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function KYCForm() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [existingKYC, setExistingKYC] = useState(null);

  // Form Fields
  const [fullName, setFullName] = useState(user?.name || "");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("male");
  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  });
  const [idType, setIdType] = useState("PAN");
  const [idNumber, setIdNumber] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [documentFileName, setDocumentFileName] = useState("");

  // Calculate live age from DOB
  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return null;
    const diff = Date.now() - birthDate.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const calculatedAge = calculateAge(dob);

  // Load existing KYC on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await getKYCStatus(user?.id, user?.email);
        if (res.kyc) {
          setExistingKYC(res.kyc);
          setFullName(res.kyc.fullName || user?.name || "");
          if (res.kyc.dob) {
            const formattedDob = new Date(res.kyc.dob).toISOString().split("T")[0];
            setDob(formattedDob);
          }
          setGender(res.kyc.gender || "male");
          if (res.kyc.address) {
            setAddress({
              street: res.kyc.address.street || "",
              city: res.kyc.address.city || "",
              state: res.kyc.address.state || "",
              pincode: res.kyc.address.pincode || "",
              country: res.kyc.address.country || "India",
            });
          }
          setIdType(res.kyc.idType || "PAN");
          if (res.kyc.idNumber) {
            setIdNumber(res.kyc.idNumber);
          } else {
            setIdNumber("");
          }
          if (res.kyc.idDocumentUrl) {
            setDocumentPreview(res.kyc.idDocumentUrl);
            setDocumentFileName(res.kyc.idDocumentFileName || "Uploaded_ID_Document");
          }
        }
      } catch (err) {
        console.error("Error fetching KYC status:", err);
      } finally {
        setFetching(false);
      }
    };

    if (user) {
      fetchStatus();
    } else {
      setFetching(false);
    }
  }, [user]);

  // Handle Document Upload & Base64 conversion
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit. Please upload a smaller image.");
      return;
    }

    setDocumentFileName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      setDocumentPreview(reader.result);
      setDocumentFile(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setDocumentFile(null);
    setDocumentPreview(null);
    setDocumentFileName("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Please enter your full legal name.");
      return;
    }

    if (!dob) {
      toast.error("Please provide your Date of Birth.");
      return;
    }

    if (calculatedAge < 18) {
      toast.error("Applicant must be at least 18 years of age for loan eligibility.");
      return;
    }

    if (!address.street || !address.city || !address.state || !address.pincode) {
      toast.error("Please fill in your complete residential address.");
      return;
    }

    if (!idNumber.trim()) {
      toast.error("Please enter your Government ID number.");
      return;
    }

    // Format Validations
    const cleanId = idNumber.trim().toUpperCase();
    const isMasked = cleanId.includes("X");
    if (!isMasked) {
      if (idType === "PAN" && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanId)) {
      toast.error("Invalid PAN format. Standard format: ABCDE1234F");
      return;
    }

    if (idType === "Aadhaar" && !/^\d{12}$/.test(cleanId.replace(/\s+/g, ""))) {
      toast.error("Invalid Aadhaar number. Must be exactly 12 numerical digits.");
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        userId: user?.id,
        email: user?.email,
        fullName: fullName.trim(),
        dob,
        gender,
        address,
        idType,
        idNumber: cleanId,
        idDocumentUrl: documentPreview,
        idDocumentFileName: documentFileName,
      };

      const res = await submitKYC(payload);
      setExistingKYC(res.kyc);
      toast.success("KYC verified! Proceeding to Step 2: Loan Eligibility Evaluation...");
      setTimeout(() => {
        navigate("/customer/eligibility");
      }, 1000);
    } catch (err) {
      toast.error(err.message || "Failed to verify KYC details.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-900 animate-spin mb-2" />
        <p className="text-xs text-slate-500 font-medium">Loading KYC verification records...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto my-6 sm:my-10 px-4 sm:px-6">
      {/* Top Header / Back Button */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/customer/dashboard"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-200">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
          Regulatory Compliance KYC
        </div>
      </div>

      {/* KYC Status Banner if exists */}
      {existingKYC && (
        <div
          className={`mb-6 p-4 sm:p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            existingKYC.status === "VERIFIED"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : existingKYC.status === "REJECTED"
              ? "bg-red-50 border-red-200 text-red-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              {existingKYC.status === "VERIFIED" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : existingKYC.status === "REJECTED" ? (
                <AlertCircle className="w-5 h-5 text-red-600" />
              ) : (
                <Clock className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold">
                {existingKYC.status === "VERIFIED"
                  ? "KYC Identity Verified ✓"
                  : existingKYC.status === "REJECTED"
                  ? "KYC Verification Rejected"
                  : "KYC Underwriting Review in Progress"}
              </h3>
              <p className="text-xs mt-0.5 opacity-90">
                {existingKYC.status === "VERIFIED"
                  ? "Your identity and address are fully verified. All loan disbursements are unlocked."
                  : existingKYC.status === "REJECTED"
                  ? `Reason: ${existingKYC.rejectionReason || "Please update your details and resubmit."}`
                  : "Your application is queued for underwriter verification. You may update your details below if needed."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                existingKYC.status === "VERIFIED"
                  ? "bg-emerald-100 text-emerald-800"
                  : existingKYC.status === "REJECTED"
                  ? "bg-red-100 text-red-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {existingKYC.status}
            </span>

            {existingKYC.status === "VERIFIED" && (
              <Link
                to="/customer/eligibility"
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
              >
                Proceed to Step 2: Eligibility
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Main KYC Form Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white p-6 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Customer KYC Registration
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Provide your legal identity and address details to qualify for institutional loan facilities.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 sm:space-y-8">
          {/* Section 1: Basic Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-blue-900" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                1. Personal Identity
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Legal Name (as per ID) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alexander Hamilton"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  {calculatedAge !== null && (
                    <span className={`text-[11px] font-bold ${calculatedAge >= 18 ? "text-emerald-700" : "text-red-600"}`}>
                      Age: {calculatedAge} yrs ({calculatedAge >= 18 ? "Eligible" : "Must be 18+"})
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  value={dob}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other / Non-binary</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Residential Address */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <MapPin className="w-4 h-4 text-blue-900" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                2. Residential Address
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Street Address / House No. / Society <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  placeholder="e.g. Flat 402, Royal Palms, MG Road"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  City / Town <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  placeholder="e.g. Mumbai"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  State / Province <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  placeholder="e.g. Maharashtra"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Postal / PIN Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={address.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, "") })}
                  placeholder="e.g. 400001"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  value={address.country}
                  onChange={(e) => setAddress({ ...address, country: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Government ID Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <FileText className="w-4 h-4 text-blue-900" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                3. Government Identification
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select ID Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={idType}
                  onChange={(e) => {
                    setIdType(e.target.value);
                    setIdNumber("");
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                >
                  <option value="PAN">PAN Card (Permanent Account Number)</option>
                  <option value="Aadhaar">Aadhaar Card (12-Digit UID)</option>
                  <option value="Passport">Passport</option>
                  <option value="Voter_ID">Voter ID Card</option>
                  <option value="Driving_License">Driving License</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {idType} Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value.toUpperCase())}
                  placeholder={
                    idType === "PAN"
                      ? "e.g. ABCDE1234F"
                      : idType === "Aadhaar"
                      ? "e.g. 1234 5678 9012"
                      : "Enter document number"
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {idType === "PAN" && "Format: 5 uppercase letters, 4 digits, 1 letter."}
                  {idType === "Aadhaar" && "Format: 12 numerical digits."}
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Document Photo Upload */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Upload className="w-4 h-4 text-blue-900" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                4. ID Document Photo (Optional)
              </h2>
            </div>

            {!documentPreview ? (
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-800 rounded-xl p-6 text-center transition-colors bg-slate-50">
                <input
                  type="file"
                  id="id-file-upload"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="id-file-upload"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-900 flex items-center justify-center mb-2">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-800">
                    Upload ID Photo / Scan
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    Supports PNG, JPG, JPEG (Max 5MB)
                  </span>
                </label>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={documentPreview}
                    alt="ID Document"
                    className="w-16 h-12 object-cover rounded border border-slate-300"
                  />
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-xs">
                      {documentFileName}
                    </p>
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ready for Underwriting Inspection
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Submission CTA */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              By submitting, you certify that all identity information matches your official government records.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-blue-900 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting KYC...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  {existingKYC ? "Update & Resubmit KYC" : "Submit KYC for Verification"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

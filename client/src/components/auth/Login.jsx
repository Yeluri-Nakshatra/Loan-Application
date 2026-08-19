import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Loader2,
  CheckCircle2,
  UserCheck,
  Shield,
} from "lucide-react";
import {
  login,
  sendPhoneLoginOTP,
  loginWithPhoneOTP,
  getGoogleAuthURL,
} from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const toast = useToast();
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const [loginMode, setLoginMode] = useState("password"); // 'password' | 'phone'
  const [selectedRole, setSelectedRole] = useState("customer"); // 'customer' | 'admin'

  // Email + Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [phoneOTP, setPhoneOTP] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Loading state
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await login(email.trim(), password, selectedRole);
      loginUser(res.user);
      toast.success(`Welcome back, ${res.user.name}!`);

      if (res.user.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/customer/dashboard");
      }
    } catch (err) {
      if (err.message && (err.message.toLowerCase().includes("signup") || err.message.toLowerCase().includes("registration") || err.message.toLowerCase().includes("incomplete"))) {
        toast.error(err.message);
        navigate(`/signup?email=${encodeURIComponent(email.trim())}&resume=true`);
        return;
      }
      toast.error(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneOTP = async (e) => {
    e.preventDefault();
    if (!phone) {
      toast.error("Please enter your registered phone number.");
      return;
    }

    setLoading(true);

    try {
      const res = await sendPhoneLoginOTP(phone.trim());
      setOtpSent(true);
      toast.success(res.message || "OTP sent to your registered phone number.");
    } catch (err) {
      toast.error(err.message || "Failed to send phone OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneLogin = async (e) => {
    e.preventDefault();
    if (!phoneOTP || phoneOTP.length !== 6) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const res = await loginWithPhoneOTP(phone.trim(), phoneOTP.trim(), selectedRole);
      loginUser(res.user);
      toast.success(`Welcome back, ${res.user.name}!`);

      if (res.user.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/customer/dashboard");
      }
    } catch (err) {
      toast.error(err.message || "Invalid or expired phone OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      localStorage.setItem("oauth_selected_role", selectedRole);
      localStorage.setItem("oauth_mode", "login");
      const res = await getGoogleAuthURL(selectedRole, "login");
      if (res.url) {
        window.location.href = res.url;
      } else {
        toast.error("Unable to load Google OAuth endpoint.");
        setGoogleLoading(false);
      }
    } catch (err) {
      toast.error(err.message || "Failed to start Google OAuth login.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md md:max-w-lg mx-auto my-6 sm:my-8 px-4 sm:px-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-950 border border-blue-200 mb-2.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-800" />
          Secure Portal Authentication
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Sign In to EZFINANZ
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Select your portal role and authenticate with your verified credentials.
        </p>
      </div>

      {/* Role Selector Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 mb-5 shadow-sm">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Select Login Portal Role
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSelectedRole("customer")}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
              selectedRole === "customer"
                ? "bg-blue-900 text-white border-blue-900 shadow-sm"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <UserCheck className={`w-4 h-4 ${selectedRole === "customer" ? "text-blue-200" : "text-slate-500"}`} />
              <span className={`text-[10px] font-bold uppercase ${selectedRole === "customer" ? "text-blue-200" : "text-slate-400"}`}>
                Borrower
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold">Customer</div>
            <div className={`text-[11px] mt-0.5 ${selectedRole === "customer" ? "text-blue-100" : "text-slate-500"}`}>
              Loan Portfolio & Apply
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole("admin")}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
              selectedRole === "admin"
                ? "bg-blue-900 text-white border-blue-900 shadow-sm"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <Shield className={`w-4 h-4 ${selectedRole === "admin" ? "text-blue-200" : "text-slate-500"}`} />
              <span className={`text-[10px] font-bold uppercase ${selectedRole === "admin" ? "text-blue-200" : "text-slate-400"}`}>
                Institutional
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold">Loan Officer / Admin</div>
            <div className={`text-[11px] mt-0.5 ${selectedRole === "admin" ? "text-blue-100" : "text-slate-500"}`}>
              Underwriting & Sanction
            </div>
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8 space-y-5">
        {/* Third-Party Google OAuth Button */}
        <div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full py-2.5 sm:py-3 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs sm:text-sm font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
          >
            {googleLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                Connecting to Google...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Continue with Google ({selectedRole === "admin" ? "Admin" : "Customer"})
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2.5 text-slate-400 font-semibold">Or use credentials</span>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="bg-slate-100 p-1 rounded-lg flex gap-1 border border-slate-200 text-xs sm:text-sm font-bold">
          <button
            type="button"
            onClick={() => {
              setLoginMode("password");
            }}
            className={`flex-1 py-2 rounded-md transition-colors cursor-pointer ${
              loginMode === "password"
                ? "bg-white text-blue-950 shadow-sm border border-slate-200 font-bold"
                : "text-slate-600 hover:text-slate-900 font-semibold"
            }`}
          >
            Email & Password
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode("phone");
            }}
            className={`flex-1 py-2 rounded-md transition-colors cursor-pointer ${
              loginMode === "phone"
                ? "bg-white text-blue-950 shadow-sm border border-slate-200 font-bold"
                : "text-slate-600 hover:text-slate-900 font-semibold"
            }`}
          >
            Mobile OTP Login
          </button>
        </div>

        {loginMode === "password" ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 sm:py-3 bg-white border border-slate-300 rounded-lg text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3 px-4 bg-blue-900 hover:bg-blue-800 text-white text-sm sm:text-base font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In as {selectedRole === "admin" ? "Officer / Admin" : "Customer"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {!otpSent ? (
              <form onSubmit={handleSendPhoneOTP} className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                    Registered Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3.5 py-2.5 sm:py-3 bg-white border border-slate-300 rounded-lg text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full py-3 px-4 bg-blue-900 hover:bg-blue-800 text-white text-sm sm:text-base font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    "Send Login OTP"
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyPhoneLogin} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700">
                      Enter Mobile OTP
                    </label>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-xs text-blue-900 font-bold hover:underline cursor-pointer"
                    >
                      Change Number ({phone})
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={phoneOTP}
                    onChange={(e) => setPhoneOTP(e.target.value.replace(/\D/g, ""))}
                    placeholder="• • • • • •"
                    className="w-full px-3.5 py-2.5 sm:py-3 bg-white border border-slate-300 rounded-lg text-center text-lg sm:text-xl font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || phoneOTP.length !== 6 || googleLoading}
                  className="w-full py-3 px-4 bg-blue-900 hover:bg-blue-800 text-white text-sm sm:text-base font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    `Verify & Enter as ${selectedRole === "admin" ? "Officer" : "Customer"}`
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Switch to Signup Link */}
      <div className="text-center mt-6">
        <p className="text-xs sm:text-sm text-slate-600">
          New to EZFINANZ Lending?{" "}
          <Link
            to="/signup"
            className="font-bold text-blue-900 hover:text-blue-800 hover:underline cursor-pointer"
          >
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}

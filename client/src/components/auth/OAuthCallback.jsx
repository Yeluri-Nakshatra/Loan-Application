import React, { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { loginWithGoogleCallback } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const toast = useToast();
  const executedRef = useRef(false);

  useEffect(() => {
    if (executedRef.current) return;
    executedRef.current = true;

    const handleCallback = async () => {
      const code = searchParams.get("code");
      const stateParam = searchParams.get("state");
      const errorParam = searchParams.get("error");

      if (errorParam) {
        toast.error("Google authentication cancelled or denied.");
        navigate("/login");
        return;
      }

      if (!code) {
        toast.error("No authorization code returned from Google.");
        navigate("/login");
        return;
      }

      let role = "customer";
      let mode = "login";
      try {
        if (stateParam) {
          const parsed = JSON.parse(stateParam);
          if (parsed.role) role = parsed.role;
          if (parsed.mode) mode = parsed.mode;
        }
      } catch {
        role = localStorage.getItem("oauth_selected_role") || "customer";
        mode = localStorage.getItem("oauth_mode") || "login";
      }

      try {
        const res = await loginWithGoogleCallback(code, role, mode);
        loginUser(res.user);
        toast.success(`Welcome back, ${res.user.name}! Authenticated with Google.`);

        if (res.user.role === "admin") {
          navigate("/admin/dashboard");
        } else {
          navigate("/customer/dashboard");
        }
      } catch (err) {
        toast.error(err.message || "Failed to authenticate with Google.");
        if (err.message && err.message.toLowerCase().includes("sign up first")) {
          navigate("/signup");
        } else {
          navigate("/login");
        }
      }
    };

    handleCallback();
  }, [searchParams, navigate, loginUser, toast]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center mb-4">
        <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Completing Google Authentication</h2>
      <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-sm">
        Verifying OAuth security tokens and synchronizing your institutional lending account...
      </p>
    </div>
  );
}

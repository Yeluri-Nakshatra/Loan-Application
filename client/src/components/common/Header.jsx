import React from "react";
import { Link } from "react-router-dom";
import { Landmark, ShieldCheck, PhoneCall } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Header() {
  const { isAuthenticated, user } = useAuth();

  const brandDestination = !isAuthenticated
    ? "/login"
    : user?.role === "admin"
    ? "/admin/dashboard"
    : "/customer/dashboard";

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <Link to={brandDestination} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-blue-700 flex items-center justify-center shadow-sm group-hover:bg-blue-600 transition-colors">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">
                  EZFINANZ
                </span>
                <span className="bg-blue-900/60 text-blue-300 border border-blue-700/50 text-[10px] uppercase font-semibold px-2 py-0.5 rounded tracking-wider">
                  Banking Portal
                </span>
              </div>
              <p className="text-xs text-slate-400 font-normal">
                Commercial & Retail Lending
              </p>
            </div>
          </Link>

          {/* Right Trust & Support Signals */}
          <div className="hidden sm:flex items-center gap-6 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-md">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-medium">256-Bit SSL Secured</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
              <span>Assistance: 1800-EZ-FINANZ</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

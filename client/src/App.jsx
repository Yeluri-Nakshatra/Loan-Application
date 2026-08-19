import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/common/Header";
import Signup from "./components/auth/Signup";
import Login from "./components/auth/Login";
import OAuthCallback from "./components/auth/OAuthCallback";
import CustomerDashboard from "./components/dashboard/CustomerDashboard";
import AdminDashboard from "./components/dashboard/AdminDashboard";
import KYCForm from "./components/kyc/KYCForm";
import LoanEligibility from "./components/eligibility/LoanEligibility";
import LoanJourney from "./components/loan/LoanJourney";
import ProtectedRoute from "./components/common/ProtectedRoute";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={user?.role === "admin" ? "/admin/dashboard" : "/customer/dashboard"} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
            {/* Institutional Top Navbar */}
            <Header />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col justify-center">
              <Routes>
                {/* Root Redirect */}
                <Route path="/" element={<RootRedirect />} />

                {/* Authentication Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/auth/callback/google" element={<OAuthCallback />} />

                {/* Role Protected Customer Dashboard & KYC */}
                <Route
                  path="/customer/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["customer"]}>
                      <CustomerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customer/kyc"
                  element={
                    <ProtectedRoute allowedRoles={["customer"]}>
                      <KYCForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customer/eligibility"
                  element={
                    <ProtectedRoute allowedRoles={["customer"]}>
                      <LoanEligibility />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customer/apply"
                  element={
                    <ProtectedRoute allowedRoles={["customer"]}>
                      <LoanJourney />
                    </ProtectedRoute>
                  }
                />

                {/* Role Protected Admin / Underwriting Dashboard */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback Catch-all Route */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </main>

            {/* Institutional Footer */}
            <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
              <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p>© 2026 EZFINANZ Lending Solutions Inc. All rights reserved. Banking license & regulatory compliance ID #84920.</p>
                <div className="flex items-center gap-4 text-slate-400">
                  <span className="hover:text-slate-600 cursor-pointer">Security Policy</span>
                  <span>•</span>
                  <span className="hover:text-slate-600 cursor-pointer">Privacy & KYC</span>
                  <span>•</span>
                  <span className="hover:text-slate-600 cursor-pointer">Terms of Service</span>
                </div>
              </div>
            </footer>
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
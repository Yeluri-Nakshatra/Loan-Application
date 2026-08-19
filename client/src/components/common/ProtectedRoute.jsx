import React, { useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const hasNotifiedRef = useRef(false);

  const rolesKey = allowedRoles ? allowedRoles.join(",") : "";
  const isRoleAllowed = !allowedRoles || (user?.role && allowedRoles.includes(user.role));

  useEffect(() => {
    if (isAuthenticated && !isRoleAllowed && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true;
      toast.error(
        `Access Restricted: You are signed in as ${user?.role === "admin" ? "an Admin / Loan Officer" : "a Customer"}. Redirecting to your portal.`
      );
    }
  }, [isAuthenticated, isRoleAllowed, user?.role, rolesKey]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isRoleAllowed) {
    return <Navigate to={user?.role === "admin" ? "/admin/dashboard" : "/customer/dashboard"} replace />;
  }

  return children;
}

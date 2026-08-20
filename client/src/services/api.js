const API_BASE_URL = "http://localhost:5000/api";

/**
 * Generic request helper with robust error handling
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data?.message || `Request failed with status ${res.status}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      throw new Error("Unable to connect to banking server. Please check if server is running on port 5000.");
    }
    throw error;
  }
}

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------

export const sendSignupEmailOTP = (name, email) =>
  request("/auth/signup/send-email-otp", {
    method: "POST",
    body: JSON.stringify({ name, email }),
  });

export const verifySignupEmailOTP = (userId, otp) =>
  request("/auth/signup/verify-email-otp", {
    method: "POST",
    body: JSON.stringify({ userId, otp }),
  });

export const sendSignupPhoneOTP = (userId, phone) =>
  request("/auth/signup/send-phone-otp", {
    method: "POST",
    body: JSON.stringify({ userId, phone }),
  });

export const verifySignupPhoneOTP = (userId, otp) =>
  request("/auth/signup/verify-phone-otp", {
    method: "POST",
    body: JSON.stringify({ userId, otp }),
  });

export const resendEmailOTP = (userId) =>
  request("/auth/resend-email-otp", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });

export const resendPhoneOTP = (userId) =>
  request("/auth/resend-phone-otp", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });

export const completeSignup = (userId, password, role) =>
  request("/auth/complete-signup", {
    method: "POST",
    body: JSON.stringify({ userId, password, role }),
  });

export const login = (email, password, role) =>
  request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, role }),
  });

export const sendPhoneLoginOTP = (phone) =>
  request("/auth/phone-login/send-otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });

export const loginWithPhoneOTP = (phone, otp, role) =>
  request("/auth/phone-login/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, otp, role }),
  });

export const getGoogleAuthURL = (role = "customer", mode = "login") =>
  request(`/auth/google/url?role=${encodeURIComponent(role)}&mode=${encodeURIComponent(mode)}`, {
    method: "GET",
  });

export const loginWithGoogleCallback = (code, role = "customer", mode = "login") =>
  request("/auth/google/callback", {
    method: "POST",
    body: JSON.stringify({ code, role, mode }),
  });

// -------------------------------------------------------------
// KYC (Know Your Customer) Endpoints
// -------------------------------------------------------------

export const submitKYC = (kycData) =>
  request("/kyc/submit", {
    method: "POST",
    body: JSON.stringify(kycData),
  });

export const getKYCStatus = (userId, email) => {
  const query = userId ? `userId=${encodeURIComponent(userId)}` : `email=${encodeURIComponent(email || "")}`;
  return request(`/kyc/status?${query}`, {
    method: "GET",
  });
};

export const getAllKYCSubmissions = (status = "all") =>
  request(`/kyc/admin/all?status=${encodeURIComponent(status)}`, {
    method: "GET",
  });

export const reviewKYCSubmission = (kycId, status, rejectionReason, reviewerId) =>
  request("/kyc/admin/review", {
    method: "POST",
    body: JSON.stringify({ kycId, status, rejectionReason, reviewerId }),
  });

// -------------------------------------------------------------
// Loan Eligibility Assessment Endpoints
// -------------------------------------------------------------

export const checkLoanEligibility = (payload) =>
  request("/eligibility/check", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getLatestEligibility = (userId, email) => {
  const query = userId ? `userId=${encodeURIComponent(userId)}` : `email=${encodeURIComponent(email || "")}`;
  return request(`/eligibility/latest?${query}`, {
    method: "GET",
  });
};

// -------------------------------------------------------------
// End-to-End Loan Application Lifecycle (Steps 5 to 9)
// -------------------------------------------------------------

export const saveEMITerm = (payload) =>
  request("/application/emi-term", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const saveBankAccount = (payload) =>
  request("/application/bank-account", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const saveDeclaration = (payload) =>
  request("/application/declaration", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const submitSelfie = (payload) =>
  request("/application/selfie", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getApplicationStatus = (userId, email, applicationId) => {
  const params = new URLSearchParams();
  if (userId) params.append("userId", userId);
  if (email) params.append("email", email);
  if (applicationId) params.append("applicationId", applicationId);
  return request(`/application/status?${params.toString()}`, {
    method: "GET",
  });
};

export const getAllApplicationsAdmin = (status = "all") =>
  request(`/application/admin/all?status=${encodeURIComponent(status)}`, {
    method: "GET",
  });

export const reviewApplicationAdmin = (applicationId, decision, remarks, selfieApproved, reviewerId) =>
  request("/application/admin/review", {
    method: "POST",
    body: JSON.stringify({ applicationId, decision, remarks, selfieApproved, reviewerId }),
  });


// Admin Management
export const registerAdmin = (adminData) =>
  request("/auth/register-admin", {
    method: "POST",
    body: JSON.stringify(adminData),
  });

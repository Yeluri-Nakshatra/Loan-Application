# 💳 Enterprise Digital Lending & Automated Underwriting System

An end-to-end, banking-grade **Digital Loan Origination, KYC Verification, and Automated Underwriting Platform** built with **React, Node.js/Express, MongoDB Atlas, SuperTokens, and TailwindCSS**.

The platform implements strict sequential lending gating (Dual Verification $\rightarrow$ KYC $\rightarrow$ Financial Affordability $\rightarrow$ EMI Structuring $\rightarrow$ Legal NACH Mandate $\rightarrow$ Live Biometric Selfie $\rightarrow$ Loan Officer Sanction Desk) alongside **AES-256-GCM encryption at rest** and **UIDAI/RBI banking data masking**.

---

## 🏛️ High-Level System Architecture

![High-Level System Architecture](docs/architecture/system_architecture.jpg)



## 🔄 End-to-End 9-Step Lending Workflow

![9-Step Lending Workflow](docs/architecture/lending_workflow.jpg)

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Borrower
    participant Client as Frontend (React)
    participant Server as Backend API (Express)
    participant Auth as SuperTokens / Email
    participant DB as MongoDB Atlas
    actor Admin as Underwriting Officer

    Customer->>Client: 1. Signup / Dual-Contact Auth
    Client->>Server: Send Email & Mobile Details
    Server->>Auth: Dispatch OTPs (Email + SMS)
    Customer->>Client: Verify Dual OTPs
    Client->>Server: Complete Signup & Create Session

    Customer->>Client: 2. Submit KYC Identity & Address
    Client->>Server: Ingest Government ID & Document
    Server->>DB: Encrypt ID via AES-256-GCM & Persist KYC

    Customer->>Client: 3. Check Financial Capacity & Loan Eligibility
    Client->>Server: Query Active DB Debts & Income
    Server->>Server: Compute FOIR (50% Cap), DTI & CIBIL Tier
    Server-->>Client: Return Pre-Approved Ceiling & Rate

    Customer->>Client: 4. Configure Loan Principal & Tenure
    Client->>Client: Generate Reducing Balance Amortization Schedule

    Customer->>Client: 5. Link Bank Account for Disbursement
    Client->>Server: Submit Bank Details
    Server->>DB: Encrypt Account Number via AES-256-GCM

    Customer->>Client: 6. Accept Legal Declaration & NACH e-Mandate
    Customer->>Client: 7. Capture Live Biometric Camera Selfie
    Client->>Server: Submit Full Application Dossier (Step 8/9)
    Server->>DB: Set Status: UNDER_REVIEW

    Admin->>Client: 8. Open Admin Underwriting Desk
    Client->>Server: Fetch Pending Dossiers with Masked Data
    Admin->>Client: Inspect Live Selfie & KYC Documents
    Admin->>Server: Submit Underwriting Decision (Approve / Reject + Remarks)
    Server->>DB: Update Application State & Close/Sanction Loan

    Customer->>Client: 9. View Real-Time Tracking Console (Step 9)
    Client->>Server: Fetch Application Status by ID
    Server-->>Client: Return Sanction / Rejection Details & Remarks
```

---

## 🔒 AES-256-GCM Cryptographic & Data Masking Pipeline

![AES-256-GCM Security and Masking Pipeline](docs/architecture/security_pipeline.jpg)

```mermaid
flowchart LR
    subgraph Ingestion ["1. Data Ingestion"]
        Plain["Plaintext Sensitive Field\n(Aadhaar, PAN, Bank Account)"]
    end

    subgraph Cipher_Engine ["2. Cryptographic Engine"]
        IV["Generate 12-Byte Unique IV"]
        Key["256-Bit Master Cipher Key"]
        GCM["AES-256-GCM Encryptor"]
        Plain --> GCM
        IV --> GCM
        Key --> GCM
        GCM --> AuthTag["16-Byte Auth Tag"]
        GCM --> EncryptedText["Encrypted Ciphertext"]
    end

    subgraph Storage ["3. Database Storage"]
        DB_Doc["MongoDB Document\n(Ciphertext:IV:AuthTag)"]
        AuthTag --> DB_Doc
        EncryptedText --> DB_Doc
    end

    subgraph Egress ["4. Data Egress & Masking"]
        Mask["UIDAI / RBI Masking Engine\n(e.g., •••• •••• 4567, ABCDE****F)"]
        DB_Doc --> Mask
        Mask --> Client_Out["Sanitized Client View"]
    end
```

---

## 📊 Financial FOIR & Credit Decision Engine

The automated credit decisioning tree enforces institutional risk policies and the **50% FOIR (Fixed Obligation to Income Ratio)** rule:

```mermaid
flowchart TD
    Start["New Loan Application Request"] --> FetchScore["Evaluate CIBIL Credit Score"]
    
    FetchScore --> ScoreCheck{"CIBIL Score >= 550?"}
    ScoreCheck -- "No (< 550)" --> RejectScore["Decision: NOT_ELIGIBLE\n(Score below institutional threshold)"]
    
    ScoreCheck -- "Yes (>= 550)" --> FetchDebt["Auto-Detect Active Loan EMIs from Database"]
    FetchDebt --> CalcDTI["Calculate Total Debt & DTI Ratio\nTotal Debts = User Debts + Active System EMIs"]
    
    CalcDTI --> DTICheck{"DTI Ratio > 50% (FOIR Limit)?"}
    DTICheck -- "Yes (> 50%)" --> RejectDTI["Decision: NOT_ELIGIBLE\n(Existing commitments exceed 50% capacity)"]
    
    DTICheck -- "No (<= 50%)" --> CalcCap["Compute Remaining Available EMI:\nMax EMI = (Income * 50%) - Existing Debts\nMax Principal = calculateMaxPrincipal(Max EMI)"]
    
    CalcCap --> ReqCheck{"Requested Amount <= Max Principal?"}
    ReqCheck -- "Yes" --> ApproveFull["Decision: ELIGIBLE\n(Full requested facility pre-approved)"]
    ReqCheck -- "No" --> CounterOffer["Decision: PARTIALLY_ELIGIBLE\n(Counter-offer capped at safe Max Principal)"]
```

---

## 📐 Financial Mathematical Models

### 1. Reducing-Balance EMI Equation
$$\text{EMI} = \frac{P \times r \times (1 + r)^n}{(1 + r)^n - 1}$$

Where:
* **P** = Principal Loan Amount
* **r** = Monthly Interest Rate ($\text{Annual APR} / 12 / 100$)
* **n** = Loan Tenure in Months

### 2. Maximum Principal Capacity by FOIR Cap
$$\text{Max Allowed New EMI} = \max\left(0,\; (\text{Monthly Income} \times 0.50) - \text{Total Existing Debts}\right)$$

$$\text{Max Eligible Principal} = \frac{\text{Max Allowed EMI} \times \left((1 + r)^n - 1\right)}{r \times (1 + r)^n}$$

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend UI** | React 19, Vite, TailwindCSS v4, Lucide Icons, React Router v7 |
| **Backend API** | Node.js, Express.js (v5), SuperTokens Auth, Nodemailer, Axios |
| **Database** | MongoDB Atlas with Mongoose ODM |
| **Security** | Node `crypto` (AES-256-GCM authenticated encryption), bcryptjs |
| **Telephony / SMS** | Fast2SMS Gateway & Nodemailer Email Dual-Delivery |

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js** v18+ and **npm**
* **MongoDB Atlas** cluster or local MongoDB instance

---

### 1. Backend Setup

1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure `server/.env`:
   ```env
   PORT=5000
   MONGO_URI="your_mongodb_connection_string"
   JWT_SECRET="your_secure_jwt_secret"
   EMAIL_USER="your_email@gmail.com"
   EMAIL_PASSWORD="your_app_password"
   SUPERTOKENS_CONNECTION_URI="https://try.supertokens.io"
   FAST2SMS_API_KEY="your_fast2sms_key"
   GOOGLE_CLIENT_ID="your_google_client_id"
   GOOGLE_CLIENT_SECRET="your_google_client_secret"
   ```
4. Start the backend API:
   ```bash
   npm run dev
   ```

---

### 2. Frontend Setup

1. Navigate to the client folder:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 👥 Default Test Accounts & Roles

| Role | Email | Access Scope |
| :--- | :--- | :--- |
| **Customer / Borrower** | `customer@loanapp.com` | Accesses borrower dashboard, KYC form, loan calculator, and application journey |
| **Loan Officer / Admin** | `admin@loanapp.com` | Accesses credit review desk, inspects live biometrics, and sanctions/declines loans |

---

## 📜 License
This project is licensed under the **ISC License**.
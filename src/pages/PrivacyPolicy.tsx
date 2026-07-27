import React from "react";
import { Shield, Lock, Eye, RefreshCw, UserCheck } from "lucide-react";

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="page-container" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div className="page-header" style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ display: "inline-flex", padding: "12px", borderRadius: "50%", background: "rgba(59, 130, 246, 0.1)", marginBottom: "16px" }}>
          <Shield size={40} style={{ color: "var(--accent)" }} />
        </div>
        <h1 className="page-title">Privacy Policy & PHIPA Statement</h1>
        <p className="page-subtitle">Personal Health Information Protection Act (PHIPA) compliance documentation</p>
      </div>

      <div className="glass-panel" style={{ padding: "36px", lineHeight: "1.7" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
          <UserCheck size={20} style={{ color: "var(--accent)" }} />
          1. Scope & Responsibility
        </h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
          The Smart Healthcare Management System (SHMS) functions as a Health Information Custodian (HIC) under Ontario's 
          <strong> Personal Health Information Protection Act, 2004 (PHIPA)</strong>. We collect, store, and process Personal 
          Health Information (PHI) exclusively for providing direct patient care, scheduling appointments, and managing clinical operations.
        </p>

        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
          <Lock size={20} style={{ color: "var(--accent)" }} />
          2. Safeguards & Information Security
        </h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "14px" }}>
          To prevent unauthorized access, theft, loss, modification, or disclosure of patient health files, the following technical safeguards are built-in:
        </p>
        <ul style={{ paddingLeft: "20px", color: "var(--text-secondary)", marginBottom: "24px" }}>
          <li><strong>Role-Based Access (RBAC):</strong> Nurses, Receptionists, and Doctors only see files directly required to fulfill their professional roles.</li>
          <li><strong>Automatic Session Locks:</strong> Active sessions terminate automatically after 15 minutes of inactivity to protect screens left unattended.</li>
          <li><strong>Encryption:</strong> Data is secured in transit via HTTPS/TLS 1.3.</li>
        </ul>

        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
          <Eye size={20} style={{ color: "var(--accent)" }} />
          3. Security Auditing & Logs
        </h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
          Under PHIPA regulatory standards, a tamper-resistant security audit log is maintained. We record every instance of log-in, 
          failed credentials, read accesses to medical records, and changes made to billing or care instructions, along with the 
          user's role and IP address.
        </p>

        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
          <RefreshCw size={20} style={{ color: "var(--accent)" }} />
          4. Access Rights & Contact
        </h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "14px" }}>
          Patients have the right to request access to their clinical records, withdraw consent, or correct inaccuracies.
        </p>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "20px" }}>
          For inquiries or complaints regarding privacy compliance under Ontario standards, contact the Information and Privacy Commissioner of Ontario (IPC) or the clinic's designated Privacy Officer.
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserSession } from "../context/AuthContext";
import MfaModal from "../components/MfaModal";
import { HeartPulse, KeyRound, User, Mail, ShieldAlert } from "lucide-react";

export const Login: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("Patient");

  // Dynamic Patient fields
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [gender, setGender] = useState("Male");
  const [dateOfBirth, setDateOfBirth] = useState("1995-01-01");

  // Dynamic Doctor fields
  const [specialization, setSpecialization] = useState("General Physician");
  const [rosterSchedule, setRosterSchedule] = useState("Mon-Fri 9AM-5PM");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Note: backend port is 5051 (HTTPS)
      const response = await fetch("https://localhost:5051/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.Message || "Login failed");
      }

      if (data.requiresMfa || data.mfaRequired) {
        setVerificationToken(data.verificationToken ?? "");
        setShowMfaModal(true);
        return;
      }

      const session: UserSession = {
        username: data.username,
        fullName: data.fullName,
        role: data.role,
        userId: data.userId,
        profileId: data.profileId
      };

      login(data.token, session);

      // Redirect depending on user role
      if (session.role.toLowerCase() === "patient") {
        navigate("/patient-portal");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Invalid username or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSuccess = (token: string, session: UserSession) => {
    setShowMfaModal(false);
    login(token, session);
    if (session.role.toLowerCase() === "patient") {
      navigate("/patient-portal");
    } else {
      navigate("/dashboard");
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const payload: any = {
      username,
      email,
      password,
      fullName,
      role
    };

    if (role.toLowerCase() === "patient") {
      payload.bloodGroup = bloodGroup;
      payload.gender = gender;
      payload.dateOfBirth = new Date(dateOfBirth).toISOString();
    } else if (role.toLowerCase() === "doctor") {
      payload.specialization = specialization;
      payload.rosterSchedule = rosterSchedule;
    }

    try {
      const response = await fetch("http://localhost:5050/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Collect errors from Model State
        if (data.errors) {
          const errorsList = Object.values(data.errors).flat().join(", ");
          throw new Error(errorsList);
        }
        throw new Error(data.message || data.Message || "Registration failed");
      }

      setSuccess("Account created successfully! Please log in.");
      setIsRegistering(false);
      // Clear registration fields
      setPassword("");
    } catch (err: any) {
      setError(err.message || "Registration failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      padding: "24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(circle at top left, rgba(6, 182, 212, 0.14), transparent 28%), radial-gradient(circle at bottom right, rgba(139, 92, 246, 0.14), transparent 34%)"
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: "100%",
        maxWidth: "520px",
        padding: "36px 32px",
        position: "relative",
        borderRadius: "28px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div className="brand-logo-icon" style={{ width: "50px", height: "50px", borderRadius: "14px", marginBottom: "12px" }}>
              <HeartPulse size={28} />
            </div>
            <h2 style={{ fontSize: "1.7rem", marginBottom: "6px" }}>
              {isRegistering ? "Create SHMS Account" : "Sign In to SHMS"}
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", textAlign: "left", lineHeight: 1.5 }}>
              {isRegistering ? "Register your details to access healthcare services" : "Enter your hospital system credentials"}
            </p>
          </div>
          <span className="badge badge-info">Secure access</span>
        </div>

        {error && (
          <div className="badge-danger" style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "0.875rem"
          }}>
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="badge-success" style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "0.875rem"
          }}>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={isRegistering ? handleRegisterSubmit : handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {isRegistering && (
            <>
              <div>
                <label htmlFor="reg-name">Full Name</label>
                <div style={{ position: "relative" }}>
                  <User size={16} style={{ position: "absolute", left: "14px", top: "14px", color: "var(--text-muted)" }} />
                  <input
                    id="reg-name"
                    type="text"
                    placeholder="John Doe"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ paddingLeft: "42px" }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-email">Email Address</label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={{ position: "absolute", left: "14px", top: "14px", color: "var(--text-muted)" }} />
                  <input
                    id="reg-email"
                    type="email"
                    placeholder="john@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: "42px" }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-role">Role Group</label>
                <select
                  id="reg-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="Patient">Patient</option>
                  <option value="Doctor">Doctor</option>
                  <option value="Nurse">Nurse</option>
                </select>
              </div>

              {/* Patient Custom Registration Fields */}
              {role === "Patient" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", borderLeft: "2px solid var(--accent-secondary)", paddingLeft: "12px", margin: "4px 0" }}>
                  <div>
                    <label>Blood Group</label>
                    <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Gender</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <label>Date of Birth</label>
                    <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Doctor Custom Registration Fields */}
              {role === "Doctor" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderLeft: "2px solid var(--accent-purple)", paddingLeft: "12px", margin: "4px 0" }}>
                  <div>
                    <label>Specialization</label>
                    <input
                      type="text"
                      placeholder="e.g. Cardiologist"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Roster Working Hours</label>
                    <input
                      type="text"
                      placeholder="e.g. Mon-Fri 9AM-5PM"
                      value={rosterSchedule}
                      onChange={(e) => setRosterSchedule(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <label htmlFor="username">Username</label>
            <div style={{ position: "relative" }}>
              <User size={16} style={{ position: "absolute", left: "14px", top: "14px", color: "var(--text-muted)" }} />
              <input
                id="username"
                type="text"
                placeholder="Enter username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: "42px" }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password">Password</label>
            <div style={{ position: "relative" }}>
              <KeyRound size={16} style={{ position: "absolute", left: "14px", top: "14px", color: "var(--text-muted)" }} />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: "42px" }}
              />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ marginTop: "10px", height: "46px" }}>
            {isLoading ? "Processing..." : isRegistering ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <button 
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
              setSuccess(null);
            }} 
            className="btn btn-secondary"
            style={{
              background: "transparent",
              border: "1px solid var(--panel-border)",
              padding: "8px 14px",
              color: "var(--accent-secondary)",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600
            }}
          >
            {isRegistering ? "Already have an account? Sign In" : "Need an account? Register Here"}
          </button>
        </div>
      </div>

      {showMfaModal && (
        <MfaModal
          username={username}
          verificationToken={verificationToken}
          onVerifySuccess={handleMfaSuccess}
          onClose={() => setShowMfaModal(false)}
        />
      )}
    </div>
  );
};

export default Login;

import React, { useState, useEffect, useRef } from "react";
import { ShieldCheck, ArrowRight, RefreshCw, X } from "lucide-react";

interface MfaModalProps {
  username: string;
  verificationToken: string;
  onVerifySuccess: (token: string, sessionData: any) => void;
  onClose: () => void;
}

export const MfaModal: React.FC<MfaModalProps> = ({ username, verificationToken, onVerifySuccess, onClose }) => {
  const [codeDigits, setCodeDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes expiration
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input automatically
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleChange = (index: number, val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, "");
    if (!cleanVal) return;

    const newDigits = [...codeDigits];
    newDigits[index] = cleanVal.slice(-1);
    setCodeDigits(newDigits);

    // Auto-advance to next input
    if (index < 5 && cleanVal) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!codeDigits[index] && index > 0) {
        const newDigits = [...codeDigits];
        newDigits[index - 1] = "";
        setCodeDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...codeDigits];
        newDigits[index] = "";
        setCodeDigits(newDigits);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (pastedText.length === 6) {
      const newDigits = pastedText.split("");
      setCodeDigits(newDigits);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = codeDigits.join("");
    if (fullCode.length < 6) {
      setError("Please enter all 6 digits of the verification code.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("https://localhost:5051/api/auth/verify-mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationToken, code: fullCode }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.Message || "Verification failed");
      }

      const session = {
        username: data.username,
        fullName: data.fullName,
        role: data.role,
        userId: data.userId,
        profileId: data.profileId,
      };

      onVerifySuccess(data.token, session);
    } catch (err: any) {
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining.toString().padStart(2, "0")}`;
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10000,
      }}
    >
      <div
        className="glass-panel animate-scale-in"
        style={{
          padding: "36px 30px",
          width: "100%",
          maxWidth: "420px",
          textAlign: "center",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
          aria-label="Close Verification"
        >
          <X size={20} />
        </button>

        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "rgba(59, 130, 246, 0.1)",
            border: "2px solid rgba(59, 130, 246, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <ShieldCheck size={30} style={{ color: "var(--accent)" }} />
        </div>

        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "8px" }}>2-Step Verification</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: "24px" }}>
          Enter the 6-digit clinical security code generated for {username}.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "20px" }}>
            {codeDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={idx === 0 ? handlePaste : undefined}
                style={{
                  width: "46px",
                  height: "50px",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  textAlign: "center",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  background: "rgba(255, 255, 255, 0.03)",
                  color: "var(--text-primary)",
                }}
              />
            ))}
          </div>

          {error && (
            <p style={{ color: "var(--danger)", fontSize: "0.8rem", marginBottom: "16px", fontWeight: 500 }}>
              ⚠️ {error}
            </p>
          )}

          <div style={{ marginBottom: "20px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            Code expires in:{" "}
            <span
              style={{
                fontWeight: 700,
                color: timeLeft <= 30 ? "var(--danger)" : "var(--text-primary)",
                fontFamily: "monospace",
              }}
            >
              {formatTime(timeLeft)}
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading || timeLeft === 0}
            className="btn btn-primary"
            style={{
              width: "100%",
              height: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {isLoading ? (
              <RefreshCw size={16} className="spin" />
            ) : (
              <>
                Verify and Log In
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MfaModal;

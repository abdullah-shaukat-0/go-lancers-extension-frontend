import React from "react";
import { ShieldAlert, LogOut, RefreshCw } from "lucide-react";

interface SessionTimeoutModalProps {
  remainingSeconds: number;
  onExtend: () => void;
  onLogout: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  remainingSeconds,
  onExtend,
  onLogout,
}) => {
  // Use prop directly — AuthContext is the single source of truth for countdown
  const seconds = remainingSeconds;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formattedTime = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      aria-describedby="session-timeout-desc"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        className="glass-panel"
        style={{
          padding: "40px 36px",
          width: "100%",
          maxWidth: "440px",
          textAlign: "center",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          boxShadow: "0 0 40px rgba(239, 68, 68, 0.1)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Animated top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
          }}
        />

        {/* Icon */}
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.1)",
            border: "2px solid rgba(239, 68, 68, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <ShieldAlert size={34} style={{ color: "var(--danger)" }} />
        </div>

        {/* Title */}
        <h2
          id="session-timeout-title"
          style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            marginBottom: "10px",
            color: "var(--text-primary)",
          }}
        >
          Session Expiring Soon
        </h2>

        <p
          id="session-timeout-desc"
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
            lineHeight: 1.6,
            marginBottom: "28px",
          }}
        >
          For patient privacy and PHIPA compliance, your session will
          automatically end due to inactivity.
        </p>

        {/* Countdown */}
        <div
          style={{
            padding: "18px 24px",
            borderRadius: "12px",
            background: "rgba(239, 68, 68, 0.07)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-secondary)",
              marginBottom: "6px",
            }}
          >
            Session expires in
          </div>
          <div
            style={{
              fontSize: "2.8rem",
              fontWeight: 800,
              color: seconds <= 30 ? "var(--danger)" : seconds <= 60 ? "#f59e0b" : "var(--accent)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              fontFamily: "monospace",
              transition: "color 0.5s ease",
            }}
            aria-live="polite"
            aria-atomic="true"
          >
            {formattedTime}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            id="session-logout-btn"
            type="button"
            className="btn btn-secondary"
            onClick={onLogout}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <LogOut size={16} />
            Logout Now
          </button>
          <button
            id="session-extend-btn"
            type="button"
            className="btn btn-primary"
            onClick={onExtend}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
            autoFocus
          >
            <RefreshCw size={16} />
            Stay Logged In
          </button>
        </div>

        {/* PHIPA footnote */}
        <p
          style={{
            marginTop: "20px",
            fontSize: "0.72rem",
            color: "var(--text-secondary)",
            opacity: 0.65,
          }}
        >
          🔒 Protected under Ontario PHIPA — Patient Privacy Act
        </p>
      </div>
    </div>
  );
};

export default SessionTimeoutModal;

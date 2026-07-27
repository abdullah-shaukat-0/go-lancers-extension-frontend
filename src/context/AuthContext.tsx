import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

export interface UserSession {
  username: string;
  fullName: string;
  role: string;
  userId: string;
  profileId: number;
}

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  login: (token: string, user: UserSession) => void;
  logout: () => void;
  loading: boolean;
  // Session timeout state exposed to App so it can show the modal
  showTimeoutWarning: boolean;
  timeoutRemainingSeconds: number;
  extendSession: () => void;
}

// ─── Security Configuration ─────────────────────────────────────────────────
// Per PHIPA (Ontario Personal Health Information Protection Act):
// Unattended terminals must lock after a defined inactivity period.
const IDLE_TIMEOUT_MS = 1 * 60 * 1000;         // ⚠️ TESTING: 1 minute (restore to 15 * 60 * 1000)
const WARNING_BEFORE_MS = 20 * 1000;           // ⚠️ TESTING: 20 seconds warning (restore to 2 * 60 * 1000)
const WARNING_DURATION_SECS = 20;              // ⚠️ TESTING: 20s countdown (restore to 120)

// Activity events that reset the idle timer
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove", "mousedown", "keydown", "touchstart", "scroll", "click",
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [timeoutRemainingSeconds, setTimeoutRemainingSeconds] = useState(WARNING_DURATION_SECS);

  // Refs for timers so we can clear them without stale closures
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const showTimeoutWarningRef = useRef(false);

  // Sync ref with state
  useEffect(() => {
    showTimeoutWarningRef.current = showTimeoutWarning;
  }, [showTimeoutWarning]);

  // ── Rehydrate from localStorage on mount ─────────────────────────────────
  useEffect(() => {
    const savedToken = localStorage.getItem("shms_token");
    const savedUser = localStorage.getItem("shms_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // ── Clear all timeout timers ──────────────────────────────────────────────
  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    idleTimerRef.current = null;
    warningTimerRef.current = null;
    countdownIntervalRef.current = null;
  }, []);

  // ── Perform auto-logout ───────────────────────────────────────────────────
  const performLogout = useCallback(() => {
    clearAllTimers();
    setShowTimeoutWarning(false);
    setToken(null);
    setUser(null);
    localStorage.removeItem("shms_token");
    localStorage.removeItem("shms_user");
  }, [clearAllTimers]);

  // ── Show warning and start countdown to logout ────────────────────────────
  const triggerWarning = useCallback(() => {
    setShowTimeoutWarning(true);
    setTimeoutRemainingSeconds(WARNING_DURATION_SECS);

    // Start live countdown — when it hits 0, immediately logout
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      setTimeoutRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          countdownIntervalRef.current = null;
          // Countdown reached zero → force logout immediately
          performLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Backup safety logout (in case interval fires slightly late)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => {
      performLogout();
    }, WARNING_BEFORE_MS + 500);
  }, [performLogout]);

  // ── Extend session (user clicked "Stay Logged In") ────────────────────────
  const extendSession = useCallback(() => {
    clearAllTimers();
    setShowTimeoutWarning(false);
    setTimeoutRemainingSeconds(WARNING_DURATION_SECS);

    // Restart the idle timer fresh
    idleTimerRef.current = setTimeout(() => {
      triggerWarning();
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);
  }, [clearAllTimers, triggerWarning]);

  // ── Attach / detach activity listeners when user logs in/out ─────────────
  useEffect(() => {
    if (!user) {
      clearAllTimers();
      setShowTimeoutWarning(false);
      return;
    }

    // Start idle timer when user session is active
    const startTimer = () => {
      clearAllTimers();
      idleTimerRef.current = setTimeout(() => {
        triggerWarning();
      }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);
    };

    const handleActivity = () => {
      if (showTimeoutWarningRef.current) {
        // Any activity while warning is visible → dismiss modal and reset timer
        clearAllTimers();
        setShowTimeoutWarning(false);
        setTimeoutRemainingSeconds(WARNING_DURATION_SECS);
        startTimer();
        return;
      }
      clearAllTimers();
      startTimer();
    };

    startTimer();

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearAllTimers();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, clearAllTimers, triggerWarning]);
  // NOTE: showTimeoutWarning intentionally excluded — handleActivity reads from
  // showTimeoutWarningRef (a ref) so the effect never re-runs when modal appears.
  // Re-running on showTimeoutWarning would kill the countdown interval via cleanup.

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = (newToken: string, newUser: UserSession) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("shms_token", newToken);
    localStorage.setItem("shms_user", JSON.stringify(newUser));
    setShowTimeoutWarning(false);
  };

  // ── Logout (manual) ───────────────────────────────────────────────────────
  const logout = () => {
    performLogout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        loading,
        showTimeoutWarning,
        timeoutRemainingSeconds,
        extendSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

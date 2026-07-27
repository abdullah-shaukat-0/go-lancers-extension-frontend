import React, { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { LogOut, Bell, MoonStar, SunMedium, X, Clock, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { request } from "../services/api";

interface NavbarProps {
  title: string;
}

interface NotifSummaryItem {
  id: number;
  patientName?: string;
  subject?: string;
  notificationType?: string;
  sentAt?: string;
  scheduledFor?: string | null;
  isEmailSent?: boolean;
  // patient fields
  senderName?: string;
  senderRole?: string;
  message?: string;
  isRead?: boolean;
}

interface NotifState {
  count: number;
  items: NotifSummaryItem[];
}

const TYPE_COLORS: Record<string, string> = {
  Precaution: "#f97316",
  Checkup: "#6366f1",
  Recovery: "#22c55e",
  General: "#06b6d4",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const Navbar: React.FC<NavbarProps> = ({ title }) => {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [notifState, setNotifState] = useState<NotifState>({ count: 0, items: [] });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const role = user?.role?.toLowerCase() ?? "";
  const isPatient = role === "patient";
  const isDoctor = role === "doctor";
  const isNurse = role === "nurse";

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      if (isPatient && user.profileId) {
        // Fetch patient's unread inbox count + top items
        const [countData, items] = await Promise.all([
          request(`/notifications/unread/${user.profileId}`),
          request(`/notifications/patient/${user.profileId}`),
        ]);
        const unread = countData.unreadCount ?? 0;
        const unreadItems = (items as NotifSummaryItem[])
          .filter((n) => !n.isRead)
          .slice(0, 5);
        setNotifState({ count: unread, items: unreadItems });
      } else if ((isDoctor || isNurse) && user.userId) {
        // Fetch staff's sent-notification summary (last 48h)
        const data = await request(`/notifications/staff-summary?senderId=${user.userId}`);
        setNotifState({
          count: data.recentCount ?? 0,
          items: data.recent ?? [],
        });
      }
    } catch {
      // silently fail
    }
  }, [user, isPatient, isDoctor, isNurse]);

  // Poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleBellClick = () => {
    setDropdownOpen((prev) => !prev);
    // Refresh on open
    if (!dropdownOpen) fetchNotifications();
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navigateToNotifications = () => {
    setDropdownOpen(false);
    if (isPatient) navigate("/patient-portal");
    else navigate("/notifications");
  };

  return (
    <header className="top-navbar">
      <h2 className="page-title">{title}</h2>

      <div className="navbar-actions">
        <button
          type="button"
          className="btn btn-secondary theme-toggle-button"
          onClick={toggleTheme}
        >
          {theme === "dark" ? <SunMedium size={16} /> : <MoonStar size={16} />}
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>

        {/* Notification Bell — all roles */}
        {user && (
          <div
            ref={bellRef}
            style={{ position: "relative" }}
          >
            <button
              id="notif-bell-btn"
              aria-label={`Notifications${notifState.count > 0 ? `, ${notifState.count} new` : ""}`}
              title={isPatient
                ? `${notifState.count} unread notification(s)`
                : `${notifState.count} notification(s) not yet read by patients`}
              onClick={handleBellClick}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "8px",
                borderRadius: "10px",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: notifState.count > 0 ? "var(--accent-purple)" : "var(--text-secondary)",
                transition: "color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <Bell size={20} style={{ transition: "transform 0.2s" }} />
              {notifState.count > 0 && (
                <span
                  className="notification-badge"
                  style={{ animation: "pulse 1.5s ease infinite" }}
                >
                  {notifState.count > 99 ? "99+" : notifState.count}
                </span>
              )}
            </button>

            {/* Dropdown Panel */}
            {dropdownOpen && (
              <div
                id="notif-dropdown"
                style={{
                  position: "absolute",
                  top: "calc(100% + 10px)",
                  right: 0,
                  width: 340,
                  background: "var(--panel-bg)",
                  border: "1px solid var(--panel-border)",
                  borderRadius: 14,
                  boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
                  zIndex: 9999,
                  overflow: "hidden",
                  backdropFilter: "blur(12px)",
                  animation: "slideDown 0.2s ease",
                }}
              >
                {/* Header */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 16px",
                  borderBottom: "1px solid var(--panel-border)",
                  background: "rgba(255,255,255,0.02)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Bell size={16} style={{ color: "var(--accent-purple)" }} />
                    <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                      {isPatient ? "My Notifications" : "Recent Activity"}
                    </span>
                    {notifState.count > 0 && (
                      <span style={{
                        background: "var(--accent-purple)",
                        color: "#fff",
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: 20,
                      }}>
                        {notifState.count} {isPatient ? "unread" : "unread by patients"}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setDropdownOpen(false)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6 }}
                    aria-label="Close notifications"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Notification Items */}
                <div style={{ maxHeight: 340, overflowY: "auto", padding: "8px 0" }}>
                  {notifState.items.length === 0 ? (
                    <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--text-muted)" }}>
                      <Bell size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <p style={{ fontSize: "0.85rem" }}>
                        {isPatient ? "No unread notifications" : "No notifications sent yet"}
                      </p>
                    </div>
                  ) : (
                    notifState.items.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: "11px 16px",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          cursor: "pointer",
                          transition: "background 0.15s",
                          background: isPatient && !item.isRead ? "rgba(99,102,241,0.06)" : "transparent",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = isPatient && !item.isRead ? "rgba(99,102,241,0.06)" : "transparent")}
                        onClick={navigateToNotifications}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              marginBottom: 3,
                            }}>
                              {item.subject ?? "(no subject)"}
                            </p>
                            <p style={{ fontSize: "0.73rem", color: "var(--text-secondary)" }}>
                              {isPatient
                                ? `From: ${item.senderName ?? "Staff"} · ${item.senderRole ?? ""}`
                                : `To: ${item.patientName ?? "Patient"}`}
                            </p>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                            <span style={{
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              color: TYPE_COLORS[item.notificationType ?? "General"] ?? "#fff",
                              background: `${TYPE_COLORS[item.notificationType ?? "General"] ?? "#fff"}22`,
                              padding: "2px 6px",
                              borderRadius: 8,
                            }}>
                              {item.notificationType ?? "General"}
                            </span>
                            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                              {item.scheduledFor && !item.isEmailSent
                                ? <><Clock size={9} /> Scheduled</>
                                : <><CheckCircle size={9} /> Sent</>}
                            </span>
                          </div>
                        </div>
                        <p style={{ fontSize: "0.67rem", color: "var(--text-muted)", marginTop: 4 }}>
                          {item.sentAt ? timeAgo(item.sentAt) : ""}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div style={{
                  padding: "10px 16px",
                  borderTop: "1px solid var(--panel-border)",
                  background: "rgba(255,255,255,0.02)",
                }}>
                  <button
                    onClick={navigateToNotifications}
                    style={{
                      width: "100%",
                      padding: "8px",
                      background: "rgba(99,102,241,0.12)",
                      border: "1px solid rgba(99,102,241,0.25)",
                      borderRadius: 8,
                      color: "var(--accent-purple)",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.12)")}
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleLogout}
          className="btn btn-secondary"
          style={{ padding: "8px 14px", fontSize: "0.875rem", display: "flex", gap: "6px", alignItems: "center" }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;

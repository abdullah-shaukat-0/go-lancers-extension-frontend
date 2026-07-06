import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { LogOut, Bell, MoonStar, SunMedium } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { request } from "../services/api";

interface NavbarProps {
  title: string;
  notificationsCount?: number;
  onNotificationsClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ title, notificationsCount = 0, onNotificationsClick }) => {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [patientUnread, setPatientUnread] = useState(0);

  const isPatient = user?.role?.toLowerCase() === "patient";

  // Poll unread count for patients every 30 seconds
  useEffect(() => {
    if (!isPatient || !user?.profileId) return;

    const fetchUnread = async () => {
      try {
        const data = await request(`/notifications/unread/${user.profileId}`);
        setPatientUnread(data.unreadCount ?? 0);
      } catch {
        // silently fail
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isPatient, user?.profileId]);

  const handleLogout = () => {
    logout();
    navigate("/login");
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

        {/* Bell for Staff (existing behaviour) */}
        {!isPatient && (
          <div className="notification-bell" onClick={onNotificationsClick} style={{ padding: "8px" }}>
            <Bell size={20} />
            {notificationsCount > 0 && (
              <span className="notification-badge">{notificationsCount}</span>
            )}
          </div>
        )}

        {/* Bell for Patients — navigates to their portal inbox */}
        {isPatient && (
          <div
            className="notification-bell"
            onClick={() => navigate("/patient-portal")}
            style={{ padding: "8px", cursor: "pointer", position: "relative" }}
            title={`${patientUnread} unread notification${patientUnread !== 1 ? "s" : ""}`}
          >
            <Bell size={20} style={{ color: patientUnread > 0 ? "var(--accent-purple)" : undefined }} />
            {patientUnread > 0 && (
              <span className="notification-badge" style={{ animation: "pulse 1.5s ease infinite" }}>
                {patientUnread}
              </span>
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

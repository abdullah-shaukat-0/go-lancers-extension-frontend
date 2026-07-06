import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  BedDouble,
  Package,
  Calendar,
  Receipt,
  HeartPulse,
  UserSquare2,
  ClipboardList,
  Bell,
  Search,
  UserCog,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

  const role = user.role.toLowerCase();
  const isPatient = role === "patient";
  const isAdmin = role === "admin";
  const isDoctor = role === "doctor";
  const isNurse = role === "nurse";

  return (
    <aside className="sidebar">
      <div className="brand-section">
        <div className="brand-logo-icon">
          <HeartPulse size={20} />
        </div>
        <span className="brand-name">SHMS Portal</span>
      </div>

      <nav style={{ flex: 1 }}>
        <ul className="nav-links">
          {!isPatient && (
            <li className="nav-link-item">
              <NavLink to="/dashboard" className={({ isActive }) => isActive ? "active" : ""} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </NavLink>
            </li>
          )}

          {isPatient && (
            <li className="nav-link-item">
              <NavLink to="/patient-portal" className={({ isActive }) => isActive ? "active" : ""} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <UserSquare2 size={18} />
                <span>My Patient Portal</span>
              </NavLink>
            </li>
          )}

          <li className="nav-link-item">
            <NavLink to="/appointments" className={({ isActive }) => isActive ? "active" : ""} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Calendar size={18} />
              <span>Appointments</span>
            </NavLink>
          </li>

          {!isPatient && (
            <li className="nav-link-item">
              <NavLink to="/beds" className={({ isActive }) => isActive ? "active" : ""} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <BedDouble size={18} />
                <span>Bed Allocation</span>
              </NavLink>
            </li>
          )}

          {isDoctor && (
            <li className="nav-link-item">
              <NavLink to="/patient-lookup" className={({ isActive }) => isActive ? "active" : ""} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Search size={18} />
                <span>Patient Lookup</span>
              </NavLink>
            </li>
          )}

          {(isDoctor || isNurse) && (
            <li className="nav-link-item">
              <NavLink to="/care-instructions" className={({ isActive }) => isActive ? "active" : ""} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <ClipboardList size={18} />
                <span>{isNurse ? "My Care Tasks" : "Care Instructions"}</span>
              </NavLink>
            </li>
          )}

          {(isDoctor || isNurse) && (
            <li className="nav-link-item">
              <NavLink to="/notifications" className={({ isActive }) => isActive ? "active" : ""} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Bell size={18} />
                <span>Patient Notifications</span>
              </NavLink>
            </li>
          )}

          {isAdmin && (
            <li className="nav-link-item">
              <NavLink to="/users" className={({ isActive }) => isActive ? "active" : ""} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <UserCog size={18} />
                <span>User Management</span>
              </NavLink>
            </li>
          )}

          {(isAdmin || isNurse) && (
            <li className="nav-link-item">
              <NavLink to="/inventory" className={({ isActive }) => isActive ? "active" : ""} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Package size={18} />
                <span>Pharmacy Stock</span>
              </NavLink>
            </li>
          )}

          {(isAdmin || isNurse || isPatient) && (
            <li className="nav-link-item">
              <NavLink to="/billing" className={({ isActive }) => isActive ? "active" : ""} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Receipt size={18} />
                <span>Billing & Invoices</span>
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      <div className="user-badge">
        <div className="user-avatar">{getInitials(user.fullName || user.username)}</div>
        <div className="user-info-text">
          <span className="user-name" title={user.fullName}>{user.fullName}</span>
          <span className="user-role-label">{user.role}</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

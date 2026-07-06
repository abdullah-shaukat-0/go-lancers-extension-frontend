import React, { useState, useEffect, useCallback } from "react";
import { request } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  User,
  Clipboard,
  HeartPulse,
  Edit2,
  Check,
  Bell,
  AlertTriangle,
  Calendar,
  Heart,
  FileText,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface PatientNotification {
  id: number;
  senderId: string;
  senderName: string;
  senderRole: string;
  subject: string;
  message: string;
  notificationType: string;
  isRead: boolean;
  sentAt: string;
  scheduledFor?: string;
  isEmailSent: boolean;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; label: string }> = {
  Precaution: { icon: <AlertTriangle size={14} />, color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.25)", label: "💊 Precaution" },
  Checkup:    { icon: <Calendar size={14} />, color: "#6366f1", bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.25)", label: "📅 Checkup Reminder" },
  Recovery:   { icon: <Heart size={14} />, color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)", label: "💚 Recovery Update" },
  General:    { icon: <FileText size={14} />, color: "#06b6d4", bg: "rgba(6,182,212,0.1)", border: "rgba(6,182,212,0.25)", label: "📋 General" },
};

export const PatientPortal: React.FC = () => {
  const { user } = useAuth();

  const [patient, setPatient] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedNotifId, setExpandedNotifId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"records" | "inbox">("inbox");

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [bloodGroup, setBloodGroup] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const profile = await request(`/patients/${user?.profileId}`);
      setPatient(profile);
      setBloodGroup(profile.bloodGroup || "O+");
      setGender(profile.gender || "Male");
      if (profile.dateOfBirth) {
        setDateOfBirth(new Date(profile.dateOfBirth).toISOString().substring(0, 10));
      }
      setMedicalHistory(profile.medicalHistory || "");

      const appointments = await request(`/appointments?patientId=${user?.profileId}`);
      setPrescriptions(appointments.filter((app: any) => (app.status || app.Status).toLowerCase() === "completed"));

      // Fetch notifications
      const notifs = await request(`/notifications/patient/${user?.profileId}`);
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n: PatientNotification) => !n.isRead).length);

    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch patient records.");
    } finally {
      setIsLoading(false);
    }
  }, [user?.profileId]);

  useEffect(() => {
    if (user?.profileId) {
      fetchData();
    }
  }, [user, fetchData]);

  const handleMarkRead = async (id: number) => {
    try {
      await request(`/notifications/${id}/read`, { method: "PUT" });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleNotifClick = async (notif: PatientNotification) => {
    setExpandedNotifId(expandedNotifId === notif.id ? null : notif.id);
    if (!notif.isRead) {
      await handleMarkRead(notif.id);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      await request(`/patients/${user?.profileId}`, {
        method: "PUT",
        body: JSON.stringify({ bloodGroup, gender, dateOfBirth: new Date(dateOfBirth).toISOString(), medicalHistory }),
      });
      setSuccess("Profile settings updated successfully.");
      setIsEditing(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to update profile settings.");
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <span className="badge badge-info">Fetching health records...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Messages */}
      {error && <div className="badge-danger" style={{ padding: "12px", borderRadius: "8px" }}>{error}</div>}
      {success && <div className="badge-success" style={{ padding: "12px", borderRadius: "8px" }}>{success}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "30px", alignItems: "start" }}>

        {/* LEFT: Demographics Profile */}
        <div className="glass-panel" style={{ padding: "30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <User style={{ color: "var(--accent-secondary)" }} />
              <span>Health ID Card</span>
            </h3>
            {!isEditing && (
              <button className="btn btn-secondary" style={{ padding: "6px 10px" }} onClick={() => setIsEditing(true)}>
                <Edit2 size={14} />
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
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
              <div>
                <label>Date of Birth</label>
                <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </div>
              <div>
                <label>Medical History Summary</label>
                <textarea rows={3} value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} placeholder="e.g. Hypertension, Diabetes..." />
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" className="btn btn-secondary" style={{ padding: "6px 12px" }} onClick={() => setIsEditing(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: "6px 12px", display: "flex", gap: "4px" }}>
                  <Check size={14} /><span>Save</span>
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ paddingBottom: "12px", borderBottom: "1px solid var(--panel-border)" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Patient Name</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "2px" }}>{patient?.user?.fullName || user?.fullName}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Blood Group</span>
                  <div style={{ fontSize: "1rem", fontWeight: 600, marginTop: "2px" }}>{patient?.bloodGroup}</div>
                </div>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Gender</span>
                  <div style={{ fontSize: "1rem", fontWeight: 600, marginTop: "2px" }}>{patient?.gender}</div>
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Date of Birth</span>
                <div style={{ fontSize: "1rem", fontWeight: 600, marginTop: "2px" }}>
                  {patient?.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : "N/A"}
                </div>
              </div>
              <div style={{ background: "rgba(0,0,0,0.15)", padding: "15px", borderRadius: "10px", borderLeft: "3px solid var(--accent-secondary)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>Registered Medical History</span>
                <p style={{ fontSize: "0.85rem", marginTop: "6px", lineHeight: "1.4" }}>{patient?.medicalHistory || "No chronic records."}</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Tabbed — Notifications Inbox + Medical Records */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {/* Tab bar */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "0" }}>
            <button onClick={() => setActiveTab("inbox")} style={{
              padding: "12px 24px", fontSize: "0.9rem", fontWeight: 600, border: "none", cursor: "pointer",
              background: "transparent",
              color: activeTab === "inbox" ? "var(--accent-secondary)" : "var(--text-secondary)",
              borderBottom: activeTab === "inbox" ? "2px solid var(--accent-secondary)" : "2px solid transparent",
              display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s", position: "relative"
            }}>
              <Bell size={16} />
              Notifications Inbox
              {unreadCount > 0 && (
                <span style={{
                  background: "var(--danger)", color: "#fff", borderRadius: "10px", padding: "1px 7px",
                  fontSize: "0.68rem", fontWeight: 700
                }}>{unreadCount}</span>
              )}
            </button>
            <button onClick={() => setActiveTab("records")} style={{
              padding: "12px 24px", fontSize: "0.9rem", fontWeight: 600, border: "none", cursor: "pointer",
              background: "transparent",
              color: activeTab === "records" ? "var(--accent-purple)" : "var(--text-secondary)",
              borderBottom: activeTab === "records" ? "2px solid var(--accent-purple)" : "2px solid transparent",
              display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s"
            }}>
              <Clipboard size={16} />
              Medical Records
            </button>
          </div>

          {/* Notifications Inbox */}
          {activeTab === "inbox" && (
            <div className="glass-panel" style={{ padding: "24px", borderTopLeftRadius: 0 }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: "center", padding: "50px 0" }}>
                  <Bell size={40} style={{ color: "var(--text-muted)", marginBottom: "12px" }} />
                  <p style={{ color: "var(--text-muted)" }}>No notifications yet. Your care team will send you updates here.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {notifications.map((notif) => {
                    const cfg = TYPE_CONFIG[notif.notificationType] || TYPE_CONFIG.General;
                    const isExpanded = expandedNotifId === notif.id;
                    const isScheduledFuture = notif.scheduledFor && new Date(notif.scheduledFor) > new Date();

                    return (
                      <div key={notif.id} style={{
                        borderRadius: "12px", overflow: "hidden",
                        border: `1px solid ${notif.isRead ? "rgba(255,255,255,0.05)" : cfg.border}`,
                        background: notif.isRead ? "rgba(255,255,255,0.02)" : cfg.bg,
                        transition: "all 0.25s",
                        cursor: "pointer"
                      }} onClick={() => handleNotifClick(notif)}>
                        <div style={{ padding: "14px 18px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                          <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: cfg.bg, border: `1px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: cfg.color, flexShrink: 0 }}>
                            {cfg.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              {!notif.isRead && (
                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
                              )}
                              <span style={{ fontWeight: notif.isRead ? 500 : 700, fontSize: "0.9rem" }}>{notif.subject}</span>
                              <span style={{ padding: "1px 8px", borderRadius: "10px", fontSize: "0.68rem", fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                                {cfg.label}
                              </span>
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "3px", display: "flex", alignItems: "center", gap: "8px" }}>
                              <span>From: {notif.senderName} ({notif.senderRole})</span>
                              <span>·</span>
                              <span>{new Date(notif.sentAt).toLocaleString()}</span>
                              {isScheduledFuture && (
                                <span style={{ color: "#6366f1", display: "flex", alignItems: "center", gap: "3px" }}>
                                  <Clock size={10} />
                                  Scheduled: {new Date(notif.scheduledFor!).toLocaleDateString()}
                                </span>
                              )}
                              {notif.isRead && (
                                <span style={{ color: "var(--success)", display: "flex", alignItems: "center", gap: "3px" }}>
                                  <CheckCircle2 size={11} /> Read
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={{ padding: "0 18px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            <div style={{ paddingTop: "14px", whiteSpace: "pre-wrap", fontSize: "0.875rem", lineHeight: 1.7, color: "var(--text-primary)" }}>
                              {notif.message}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Medical Records */}
          {activeTab === "records" && (
            <div className="glass-panel" style={{ padding: "24px", borderTopLeftRadius: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {prescriptions.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px 0" }}>No prescription records found.</p>
                ) : (
                  prescriptions.map((app) => (
                    <div key={app.id || app.Id} style={{
                      padding: "20px", borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)",
                      display: "flex", flexDirection: "column", gap: "10px"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Consultation with Dr. {app.doctor?.user?.fullName || "Doctor"}</h4>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            Specialty: {app.doctor?.specialization} • Date: {new Date(app.appointmentDate || app.AppointmentDate).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="badge badge-success" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                          <HeartPulse size={12} /><span>Signed</span>
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "8px", fontSize: "0.85rem" }}>
                        <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(0,0,0,0.15)" }}>
                          <strong style={{ color: "var(--accent-secondary)", display: "block", marginBottom: "4px" }}>Diagnosis</strong>
                          <span>{app.diagnosis || app.Diagnosis}</span>
                        </div>
                        <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(0,0,0,0.15)" }}>
                          <strong style={{ color: "var(--accent-purple)", display: "block", marginBottom: "4px" }}>Prescription Rx</strong>
                          <span style={{ fontFamily: "monospace", fontSize: "0.8rem", whiteSpace: "pre-line" }}>{app.prescription || app.Prescription}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientPortal;

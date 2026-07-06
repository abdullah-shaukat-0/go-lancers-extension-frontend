import React, { useState, useEffect, useCallback } from "react";
import { request } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Bell,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  Mail,
  AlertTriangle,
  Heart,
  FileText,
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";

interface Patient {
  id: number;
  fullName: string;
  email: string;
}

interface SentNotification {
  id: number;
  patientId: number;
  patientName: string;
  subject: string;
  message: string;
  notificationType: string;
  isRead: boolean;
  sentAt: string;
  scheduledFor?: string;
  isEmailSent: boolean;
  senderName: string;
  senderRole: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; label: string }> = {
  Precaution: { icon: <AlertTriangle size={14} />, color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.25)", label: "💊 Precaution" },
  Checkup:    { icon: <Calendar size={14} />, color: "#6366f1", bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.25)", label: "📅 Checkup Reminder" },
  Recovery:   { icon: <Heart size={14} />, color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)", label: "💚 Recovery Update" },
  General:    { icon: <FileText size={14} />, color: "#06b6d4", bg: "rgba(6,182,212,0.1)", border: "rgba(6,182,212,0.25)", label: "📋 General" },
};

const PatientNotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sentHistory, setSentHistory] = useState<SentNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [filterType, setFilterType] = useState("All");

  const [form, setForm] = useState({
    patientId: "",
    notificationType: "General",
    subject: "",
    message: "",
    scheduledFor: "",
  });
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pats, sent] = await Promise.all([
        request("/notifications/patients"),
        request(`/notifications/sent?senderId=${user?.userId}`),
      ]);
      setPatients(pats);
      setSentHistory(sent);
    } catch (err) {
      console.error("Error fetching notification data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.subject.trim() || !form.message.trim()) {
      setFormError("Patient, Subject, and Message are required.");
      return;
    }
    if (isScheduled && !form.scheduledFor) {
      setFormError("Please select a scheduled date and time.");
      return;
    }
    setFormSubmitting(true);
    setFormError("");

    try {
      const payload = {
        patientId: Number(form.patientId),
        senderId: user?.userId,
        senderName: user?.fullName,
        senderRole: user?.role,
        subject: form.subject,
        message: form.message,
        notificationType: form.notificationType,
        ...(isScheduled ? { scheduledFor: new Date(form.scheduledFor).toISOString() } : {}),
      };

      await request(isScheduled ? "/notifications/schedule" : "/notifications/send", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccessMsg(isScheduled ? "✓ Notification scheduled successfully!" : "✓ Notification sent to patient!");
      setForm({ patientId: "", notificationType: "General", subject: "", message: "", scheduledFor: "" });
      setShowForm(false);
      setTimeout(() => setSuccessMsg(""), 4000);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || "Failed to send notification.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await request(`/notifications/${id}`, { method: "DELETE" });
      setSentHistory((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const filtered = filterType === "All" ? sentHistory : sentHistory.filter((n) => n.notificationType === filterType);

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <span className="badge badge-info">Loading notifications...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
            <Bell size={24} style={{ color: "var(--accent-purple)" }} />
            Patient Notifications
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px" }}>
            Send precautions, checkup reminders, and recovery updates directly to patients
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Plus size={16} />
          Compose Notification
        </button>
      </div>

      {successMsg && (
        <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "10px", padding: "14px 18px", color: "var(--success)", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckCircle2 size={16} />
          {successMsg}
        </div>
      )}

      {/* Compose Form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: "28px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Mail size={18} style={{ color: "var(--accent-purple)" }} />
            Compose Patient Notification
          </h3>

          {/* Immediate vs Scheduled toggle */}
          <div style={{ display: "flex", gap: "0", marginBottom: "20px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", overflow: "hidden", width: "fit-content" }}>
            <button onClick={() => setIsScheduled(false)} style={{
              padding: "8px 20px", fontSize: "0.82rem", fontWeight: 600, border: "none", cursor: "pointer",
              background: !isScheduled ? "var(--accent-purple)" : "transparent",
              color: !isScheduled ? "#fff" : "var(--text-secondary)"
            }}>
              <Send size={12} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} />
              Send Now
            </button>
            <button onClick={() => setIsScheduled(true)} style={{
              padding: "8px 20px", fontSize: "0.82rem", fontWeight: 600, border: "none", cursor: "pointer",
              background: isScheduled ? "var(--accent-purple)" : "transparent",
              color: isScheduled ? "#fff" : "var(--text-secondary)"
            }}>
              <Clock size={12} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} />
              Schedule
            </button>
          </div>

          <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Recipient Patient *</label>
                <select className="form-control" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} required>
                  <option value="">Select Patient</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Notification Type</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                    <button key={key} type="button"
                      onClick={() => setForm({ ...form, notificationType: key })}
                      style={{
                        padding: "5px 12px", borderRadius: "18px", fontSize: "0.75rem", fontWeight: 600,
                        border: `1px solid ${form.notificationType === key ? cfg.color : "rgba(255,255,255,0.1)"}`,
                        background: form.notificationType === key ? cfg.bg : "transparent",
                        color: form.notificationType === key ? cfg.color : "var(--text-secondary)",
                        cursor: "pointer"
                      }}>{cfg.label}</button>
                  ))}
                </div>
              </div>
            </div>

            {isScheduled && (
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                  <Clock size={12} style={{ display: "inline", marginRight: "4px", verticalAlign: "middle" }} />
                  Scheduled Date & Time *
                </label>
                <input type="datetime-local" className="form-control" value={form.scheduledFor}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })}
                  style={{ maxWidth: "280px" }} />
              </div>
            )}

            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Subject *</label>
              <input className="form-control" type="text" placeholder="e.g. Post-Visit Precautions — Cardiac Care" value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Message *</label>
              <textarea className="form-control" rows={7}
                placeholder="Dear [Patient Name],&#10;&#10;Write your notification here. Be specific about precautions, timelines, and any actions needed from the patient..."
                value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required style={{ resize: "vertical" }} />
            </div>

            {formError && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{formError}</p>}

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <button type="submit" className="btn btn-primary" disabled={formSubmitting} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {isScheduled ? <Clock size={15} /> : <Send size={15} />}
                {formSubmitting ? "Sending..." : isScheduled ? "Schedule Notification" : "Send Now"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginLeft: "auto" }}>
                📧 Notification delivered to patient's portal inbox
              </span>
            </div>
          </form>
        </div>
      )}

      {/* Sent History */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Sent History ({sentHistory.length})</h3>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {["All", ...Object.keys(TYPE_CONFIG)].map((t) => {
              const cfg = TYPE_CONFIG[t];
              return (
                <button key={t} onClick={() => setFilterType(t)} style={{
                  padding: "4px 12px", borderRadius: "14px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${filterType === t ? (cfg?.color || "var(--accent-secondary)") : "rgba(255,255,255,0.1)"}`,
                  background: filterType === t ? (cfg?.bg || "rgba(6,182,212,0.1)") : "transparent",
                  color: filterType === t ? (cfg?.color || "var(--accent-secondary)") : "var(--text-secondary)"
                }}>
                  {t === "All" ? "All" : cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="glass-panel" style={{ padding: "50px", textAlign: "center" }}>
            <Bell size={36} style={{ color: "var(--text-muted)", marginBottom: "12px" }} />
            <p style={{ color: "var(--text-muted)" }}>No notifications sent yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filtered.map((notif) => {
              const cfg = TYPE_CONFIG[notif.notificationType] || TYPE_CONFIG.General;
              const isExpanded = expandedId === notif.id;
              const isScheduledItem = notif.scheduledFor && !notif.isEmailSent;

              return (
                <div key={notif.id} className="glass-panel" style={{ padding: "0", overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", display: "flex", gap: "14px", cursor: "pointer", alignItems: "flex-start" }}
                    onClick={() => setExpandedId(isExpanded ? null : notif.id)}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", color: cfg.color, flexShrink: 0 }}>
                      {cfg.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{notif.subject}</span>
                        <span style={{ padding: "2px 9px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                          {cfg.label}
                        </span>
                        {isScheduledItem && (
                          <span style={{ padding: "2px 9px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 700, background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.25)" }}>
                            🕐 Scheduled: {new Date(notif.scheduledFor!).toLocaleString()}
                          </span>
                        )}
                        {notif.isRead && <span style={{ fontSize: "0.7rem", color: "var(--success)" }}>✓ Read</span>}
                      </div>
                      <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "3px" }}>
                        To: {notif.patientName} · {new Date(notif.sentAt).toLocaleString()}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(notif.id); }}
                        style={{ padding: "5px", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", transition: "color 0.2s" }}
                        title="Delete">
                        <Trash2 size={14} />
                      </button>
                      {isExpanded ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: "0 20px 18px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ paddingTop: "14px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", padding: "14px", whiteSpace: "pre-wrap", fontSize: "0.875rem", lineHeight: 1.6 }}>
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
    </div>
  );
};

export default PatientNotificationsPage;

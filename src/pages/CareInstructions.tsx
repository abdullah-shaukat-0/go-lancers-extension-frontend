import React, { useState, useEffect, useCallback } from "react";
import { request } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  ClipboardList,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  XCircle,
  Stethoscope,
  User,
  RefreshCw,
} from "lucide-react";

interface CareInstruction {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  nurseId: number;
  nurseName: string;
  nurseDepartment: string;
  instructions: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  nurseNotes: string;
}

interface Nurse {
  id: number;
  fullName: string;
  department: string;
  shift: string;
}

interface Patient {
  id: number;
  fullName: string;
}

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  Critical: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", label: "🚨 Critical" },
  High:     { color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)", label: "🔴 High" },
  Medium:   { color: "#eab308", bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.3)", label: "🟡 Medium" },
  Low:      { color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.3)", label: "🟢 Low" },
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  Pending:    { icon: <Clock size={14} />, color: "#eab308", label: "Pending" },
  InProgress: { icon: <RefreshCw size={14} />, color: "#06b6d4", label: "In Progress" },
  Completed:  { icon: <CheckCircle2 size={14} />, color: "#22c55e", label: "Completed" },
  Cancelled:  { icon: <XCircle size={14} />, color: "#6b7280", label: "Cancelled" },
};

const CareInstructions: React.FC = () => {
  const { user } = useAuth();
  const isDoctor = user?.role?.toLowerCase() === "doctor";
  const isNurse = user?.role?.toLowerCase() === "nurse";

  const [instructions, setInstructions] = useState<CareInstruction[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState("All");

  // Nurse update modal
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [nurseNotes, setNurseNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");

  // Doctor create form
  const [form, setForm] = useState({ patientId: "", nurseId: "", instructions: "", priority: "Medium" });
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchInstructions = useCallback(async () => {
    setIsLoading(true);
    try {
      let data: CareInstruction[] = [];
      if (isDoctor && user?.profileId) {
        data = await request(`/careinstructions/doctor/${user.profileId}`);
      } else if (isNurse && user?.profileId) {
        data = await request(`/careinstructions/nurse/${user.profileId}`);
      } else {
        data = await request("/careinstructions");
      }
      setInstructions(data);
    } catch (err) {
      console.error("Error fetching care instructions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isDoctor, isNurse, user]);

  useEffect(() => {
    fetchInstructions();
    if (isDoctor) {
      request("/careinstructions/nurses").then(setNurses).catch(console.error);
      request("/notifications/patients").then((data: any[]) =>
        setPatients(data.map((p) => ({ id: p.id, fullName: p.fullName })))
      ).catch(console.error);
    }
  }, [fetchInstructions, isDoctor]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.nurseId || !form.instructions.trim()) {
      setFormError("Please fill all required fields.");
      return;
    }
    setFormSubmitting(true);
    setFormError("");
    try {
      await request("/careinstructions", {
        method: "POST",
        body: JSON.stringify({
          patientId: Number(form.patientId),
          doctorId: user?.profileId,
          nurseId: Number(form.nurseId),
          instructions: form.instructions,
          priority: form.priority,
        }),
      });
      setForm({ patientId: "", nurseId: "", instructions: "", priority: "Medium" });
      setShowForm(false);
      fetchInstructions();
    } catch (err: any) {
      setFormError(err.message || "Failed to create instruction.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleNurseUpdate = async (id: number) => {
    try {
      await request(`/careinstructions/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus, nurseNotes }),
      });
      setUpdatingId(null);
      setNurseNotes("");
      setNewStatus("");
      fetchInstructions();
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const filtered = filterStatus === "All" ? instructions : instructions.filter((i) => i.status === filterStatus);

  const priorityOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const sorted = [...filtered].sort((a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4));

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <span className="badge badge-info">Loading care instructions...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
            <ClipboardList size={24} style={{ color: "var(--accent-secondary)" }} />
            {isNurse ? "My Care Tasks" : "Care Instructions"}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px" }}>
            {isDoctor ? "Issue and track care instructions for your patients" : "Your assigned patient care tasks from doctors"}
          </p>
        </div>
        {isDoctor && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Plus size={16} />
            New Instruction
          </button>
        )}
      </div>

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
        {["Pending", "InProgress", "Completed"].map((s) => {
          const count = instructions.filter((i) => i.status === s).length;
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} className="glass-panel" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", border: filterStatus === s ? `1px solid ${cfg.color}` : undefined }}
              onClick={() => setFilterStatus(filterStatus === s ? "All" : s)}>
              <span style={{ color: cfg.color }}>{cfg.icon}</span>
              <div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{count}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{cfg.label}</div>
              </div>
            </div>
          );
        })}
        <div className="glass-panel" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", border: filterStatus === "All" ? "1px solid var(--accent-secondary)" : undefined }}
          onClick={() => setFilterStatus("All")}>
          <span style={{ color: "var(--accent-secondary)" }}><ClipboardList size={16} /></span>
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{instructions.length}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>All Tasks</div>
          </div>
        </div>
      </div>

      {/* Doctor: Create Form */}
      {isDoctor && showForm && (
        <div className="glass-panel" style={{ padding: "28px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Stethoscope size={18} style={{ color: "var(--accent-primary)" }} />
            Issue New Care Instruction
          </h3>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Patient *</label>
                <select className="form-control" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} required>
                  <option value="">Select Patient</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Assign Nurse *</label>
                <select className="form-control" value={form.nurseId} onChange={(e) => setForm({ ...form, nurseId: e.target.value })} required>
                  <option value="">Select Nurse</option>
                  {nurses.map((n) => <option key={n.id} value={n.id}>{n.fullName} ({n.department} – {n.shift} shift)</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Priority</label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                  <button key={key} type="button"
                    onClick={() => setForm({ ...form, priority: key })}
                    style={{
                      padding: "6px 16px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600,
                      border: `1px solid ${form.priority === key ? cfg.color : "rgba(255,255,255,0.1)"}`,
                      background: form.priority === key ? cfg.bg : "transparent",
                      color: form.priority === key ? cfg.color : "var(--text-secondary)",
                      cursor: "pointer", transition: "all 0.2s"
                    }}>
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Care Instructions *</label>
              <textarea className="form-control" rows={5} placeholder="Describe exactly what the nurse should do for this patient — medications, monitoring intervals, restrictions, alerts..." value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })} required style={{ resize: "vertical" }} />
            </div>
            {formError && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{formError}</p>}
            <div style={{ display: "flex", gap: "12px" }}>
              <button type="submit" className="btn btn-primary" disabled={formSubmitting} style={{ minWidth: "140px" }}>
                {formSubmitting ? "Submitting..." : "Submit Instruction"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Instructions List */}
      {sorted.length === 0 ? (
        <div className="glass-panel" style={{ padding: "60px", textAlign: "center" }}>
          <ClipboardList size={40} style={{ color: "var(--text-muted)", marginBottom: "12px" }} />
          <p style={{ color: "var(--text-muted)" }}>No care instructions found{filterStatus !== "All" ? ` with status "${filterStatus}"` : ""}.</p>
          {isDoctor && <button className="btn btn-primary" style={{ marginTop: "16px" }} onClick={() => setShowForm(true)}>Create Your First Instruction</button>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {sorted.map((ci) => {
            const pCfg = PRIORITY_CONFIG[ci.priority] || PRIORITY_CONFIG.Medium;
            const sCfg = STATUS_CONFIG[ci.status] || STATUS_CONFIG.Pending;
            const isExpanded = expandedId === ci.id;
            const isUpdating = updatingId === ci.id;

            return (
              <div key={ci.id} className="glass-panel" style={{
                padding: "0", overflow: "hidden",
                border: ci.priority === "Critical" ? `1px solid ${pCfg.border}` : undefined,
                boxShadow: ci.priority === "Critical" ? `0 0 12px ${pCfg.bg}` : undefined
              }}>
                {/* Priority top bar */}
                <div style={{ height: "3px", background: pCfg.color, width: "100%" }} />

                {/* Card header */}
                <div style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: "16px", cursor: "pointer" }}
                  onClick={() => setExpandedId(isExpanded ? null : ci.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                        <User size={14} style={{ display: "inline", marginRight: "5px", verticalAlign: "middle" }} />
                        {ci.patientName}
                      </span>
                      <span style={{
                        padding: "2px 10px", borderRadius: "12px", fontSize: "0.72rem", fontWeight: 700,
                        background: pCfg.bg, color: pCfg.color, border: `1px solid ${pCfg.border}`
                      }}>{pCfg.label}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.78rem", color: sCfg.color }}>
                        {sCfg.icon} {sCfg.label}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                      {isDoctor ? `Assigned to: ${ci.nurseName} (${ci.nurseDepartment})` : `Issued by: ${ci.doctorName}`}
                      {" · "}
                      {new Date(ci.createdAt).toLocaleString()}
                    </p>
                    <p style={{ fontSize: "0.85rem", marginTop: "8px", color: "var(--text-primary)", display: "-webkit-box", WebkitLineClamp: isExpanded ? undefined : 2, WebkitBoxOrient: "vertical", overflow: isExpanded ? "visible" : "hidden" }}>
                      {ci.instructions}
                    </p>
                  </div>
                  <div style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {/* Expanded section */}
                {isExpanded && (
                  <div style={{ padding: "0 22px 20px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ paddingTop: "16px" }}>
                      {ci.nurseNotes && (
                        <div style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
                          <h5 style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--accent-secondary)", marginBottom: "6px" }}>📝 Nurse Notes</h5>
                          <p style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>{ci.nurseNotes}</p>
                          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "6px" }}>Last updated: {new Date(ci.updatedAt).toLocaleString()}</p>
                        </div>
                      )}

                      {/* Nurse actions */}
                      {isNurse && ci.status !== "Completed" && ci.status !== "Cancelled" && (
                        <div>
                          {!isUpdating ? (
                            <button className="btn btn-primary" style={{ fontSize: "0.82rem" }} onClick={() => { setUpdatingId(ci.id); setNewStatus(ci.status === "Pending" ? "InProgress" : "Completed"); setNurseNotes(ci.nurseNotes || ""); }}>
                              {ci.status === "Pending" ? "▶ Start Task" : "✓ Mark Completed"}
                            </button>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                              <div>
                                <label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "5px" }}>Update Status</label>
                                <select className="form-control" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} style={{ width: "200px" }}>
                                  <option value="Pending">Pending</option>
                                  <option value="InProgress">In Progress</option>
                                  <option value="Completed">Completed</option>
                                </select>
                              </div>
                              <div>
                                <label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "5px" }}>Nurse Notes / Observations</label>
                                <textarea className="form-control" rows={3} placeholder="Add your observations, readings, or completion notes..." value={nurseNotes} onChange={(e) => setNurseNotes(e.target.value)} style={{ resize: "vertical" }} />
                              </div>
                              <div style={{ display: "flex", gap: "10px" }}>
                                <button className="btn btn-primary" onClick={() => handleNurseUpdate(ci.id)} style={{ fontSize: "0.82rem" }}>Save Update</button>
                                <button className="btn btn-secondary" onClick={() => setUpdatingId(null)} style={{ fontSize: "0.82rem" }}>Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {ci.status === "Completed" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--success)", fontSize: "0.85rem", fontWeight: 600 }}>
                          <CheckCircle2 size={16} />
                          Task completed
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Critical pulse animation style */}
      <style>{`
        @keyframes criticalPulse {
          0%, 100% { box-shadow: 0 0 8px rgba(239,68,68,0.3); }
          50% { box-shadow: 0 0 18px rgba(239,68,68,0.6); }
        }
      `}</style>
    </div>
  );
};

export default CareInstructions;

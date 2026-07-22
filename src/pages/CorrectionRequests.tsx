import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, FileText, RefreshCw, User, XCircle } from "lucide-react";
import { request } from "../services/api";

interface CorrectionRequest {
  id: number;
  patientId: number;
  patientName?: string;
  fieldName: string;
  currentValue?: string;
  requestedValue: string;
  reason?: string;
  status: "Pending" | "Approved" | "Rejected" | string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedByName?: string;
  reviewNote?: string;
}

const FIELD_LABELS: Record<string, string> = {
  BloodGroup: "Blood Group",
  Gender: "Gender",
  DateOfBirth: "Date of Birth",
  MedicalHistory: "Medical History",
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; className: string; color: string }> = {
  Pending: { icon: <Clock size={13} />, className: "badge-warning", color: "#eab308" },
  Approved: { icon: <CheckCircle2 size={13} />, className: "badge-success", color: "#22c55e" },
  Rejected: { icon: <XCircle size={13} />, className: "badge-danger", color: "#ef4444" },
};

const CorrectionRequests: React.FC = () => {
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState("Pending");
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await request("/correctionrequests");
      setRequests(data);
    } catch (err: any) {
      setError(err.message || "Failed to load correction requests.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const counts = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((item) => item.status === "Pending").length,
    approved: requests.filter((item) => item.status === "Approved").length,
    rejected: requests.filter((item) => item.status === "Rejected").length,
  }), [requests]);

  const visibleRequests = useMemo(() => (
    filterStatus === "All" ? requests : requests.filter((item) => item.status === filterStatus)
  ), [filterStatus, requests]);

  const handleApprove = async (id: number) => {
    try {
      setActionId(id);
      setError(null);
      setSuccess(null);
      await request(`/correctionrequests/${id}/approve`, {
        method: "PUT",
        body: JSON.stringify({ reviewNote: reviewNotes[id] || "Approved." }),
      });
      setSuccess("Correction request approved.");
      setReviewNotes((current) => ({ ...current, [id]: "" }));
      fetchRequests();
    } catch (err: any) {
      setError(err.message || "Failed to approve correction request.");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: number) => {
    const note = reviewNotes[id]?.trim();
    if (!note) {
      setError("A review note is required when rejecting a request.");
      return;
    }

    try {
      setActionId(id);
      setError(null);
      setSuccess(null);
      await request(`/correctionrequests/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reviewNote: note }),
      });
      setSuccess("Correction request rejected.");
      setReviewNotes((current) => ({ ...current, [id]: "" }));
      fetchRequests();
    } catch (err: any) {
      setError(err.message || "Failed to reject correction request.");
    } finally {
      setActionId(null);
    }
  };

  const setNote = (id: number, value: string) => {
    setReviewNotes((current) => ({ ...current, [id]: value }));
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh" }}>
        <span className="badge badge-info">Loading correction requests...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText size={24} style={{ color: "var(--accent-secondary)" }} />
            Patient Correction Requests
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px" }}>
            Review patient-submitted updates before they change the official record.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchRequests} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {(error || success) && (
        <div className={error ? "badge-danger" : "badge-success"} style={{ padding: "12px", borderRadius: "8px" }}>
          {error || success}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
        {[
          { key: "Pending", label: "Pending", count: counts.pending },
          { key: "Approved", label: "Approved", count: counts.approved },
          { key: "Rejected", label: "Rejected", count: counts.rejected },
          { key: "All", label: "All", count: counts.total },
        ].map((item) => {
          const statusConfig = STATUS_CONFIG[item.key] || { icon: <FileText size={13} />, className: "badge-info", color: "var(--accent-secondary)" };
          return (
            <button
              key={item.key}
              type="button"
              className="glass-panel"
              onClick={() => setFilterStatus(item.key)}
              style={{
                padding: "16px",
                textAlign: "left",
                cursor: "pointer",
                border: filterStatus === item.key ? `1px solid ${statusConfig.color}` : undefined,
              }}
            >
              <span className={`badge ${statusConfig.className}`} style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                {statusConfig.icon}
                {item.label}
              </span>
              <strong style={{ display: "block", fontSize: "1.55rem", marginTop: "8px" }}>{item.count}</strong>
            </button>
          );
        })}
      </div>

      {visibleRequests.length === 0 ? (
        <div className="glass-panel" style={{ padding: "54px", textAlign: "center" }}>
          <FileText size={38} style={{ color: "var(--text-muted)", marginBottom: "12px" }} />
          <p style={{ color: "var(--text-muted)" }}>No correction requests found.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {visibleRequests.map((item) => {
            const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.Pending;
            const isPending = item.status === "Pending";

            return (
              <div key={item.id} className="glass-panel" style={{ padding: "22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "8px" }}>
                      <User size={18} style={{ color: "var(--accent-purple)" }} />
                      {item.patientName || `Patient #${item.patientId}`}
                    </h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "4px" }}>
                      Requested {new Date(item.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`badge ${statusConfig.className}`} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    {statusConfig.icon}
                    {item.status}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "minmax(160px, 220px) 1fr 1fr", gap: "14px", marginTop: "18px" }}>
                  <div style={{ padding: "14px", borderRadius: "8px", background: "var(--surface-soft)", border: "1px solid var(--panel-border)" }}>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.76rem" }}>Field</span>
                    <strong style={{ display: "block", marginTop: "6px" }}>{FIELD_LABELS[item.fieldName] || item.fieldName}</strong>
                  </div>
                  <div style={{ padding: "14px", borderRadius: "8px", background: "var(--surface-soft)", border: "1px solid var(--panel-border)" }}>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.76rem" }}>Current Value</span>
                    <p style={{ marginTop: "6px", whiteSpace: "pre-wrap" }}>{item.currentValue || "Not recorded"}</p>
                  </div>
                  <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.2)" }}>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.76rem" }}>Requested Value</span>
                    <p style={{ marginTop: "6px", whiteSpace: "pre-wrap" }}>{item.requestedValue}</p>
                  </div>
                </div>

                {item.reason && (
                  <div style={{ marginTop: "14px", padding: "14px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--panel-border)" }}>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.76rem" }}>Patient Reason</span>
                    <p style={{ marginTop: "6px", whiteSpace: "pre-wrap" }}>{item.reason}</p>
                  </div>
                )}

                {isPending ? (
                  <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                      <label>Review note</label>
                      <textarea
                        rows={3}
                        value={reviewNotes[item.id] || ""}
                        onChange={(event) => setNote(item.id, event.target.value)}
                        placeholder="Add a note for the patient. Required when rejecting."
                      />
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <button className="btn btn-primary" disabled={actionId === item.id} onClick={() => handleApprove(item.id)}>
                        <CheckCircle2 size={15} />
                        Approve
                      </button>
                      <button className="btn btn-danger" disabled={actionId === item.id} onClick={() => handleReject(item.id)}>
                        <XCircle size={15} />
                        Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: "14px", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                    Reviewed {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : "recently"}
                    {item.reviewedByName ? ` by ${item.reviewedByName}` : ""}
                    {item.reviewNote ? `: ${item.reviewNote}` : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CorrectionRequests;

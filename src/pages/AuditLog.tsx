import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ShieldAlert, Download, RefreshCw, Filter } from "lucide-react";

interface AuditLogEntry {
  id: number;
  timestamp: string;
  userId: string;
  username: string;
  role: string;
  ipAddress: string;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  outcome: string;
}

export const AuditLog: React.FC = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter states
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [outcomeFilter, setOutcomeFilter] = useState("ALL");

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("https://localhost:5051/api/auditlogs", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to load audit logs. Verify permissions.");
      }
      const data = await response.json();
      setLogs(data);
      setFilteredLogs(data);
    } catch (err: any) {
      setError(err.message || "An error occurred fetching logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  useEffect(() => {
    let result = logs;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.username.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          l.resource?.toLowerCase().includes(q)
      );
    }

    if (actionFilter !== "ALL") {
      result = result.filter((l) => l.action === actionFilter);
    }

    if (outcomeFilter !== "ALL") {
      result = result.filter((l) => l.outcome === outcomeFilter);
    }

    setFilteredLogs(result);
  }, [search, actionFilter, outcomeFilter, logs]);

  const downloadCSV = () => {
    const headers = "ID,Timestamp,User,Role,IP,Action,Resource,RecordID,Details,Outcome\n";
    const rows = filteredLogs
      .map(
        (l) =>
          `"${l.id}","${l.timestamp}","${l.username}","${l.role}","${l.ipAddress}","${l.action}","${l.resource}","${l.resourceId ?? ""}","${l.details.replace(/"/g, '""')}","${l.outcome}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `shms_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    a.click();
  };

  // Color classes for action outcomes / types
  const getRowStyle = (log: AuditLogEntry) => {
    if (log.outcome === "Failure") {
      return { borderLeft: "4px solid var(--danger)", background: "rgba(239, 68, 68, 0.03)" };
    }
    if (log.action.includes("WRITE") || log.action.includes("UPDATE")) {
      return { borderLeft: "4px solid #f59e0b", background: "rgba(245, 158, 11, 0.02)" };
    }
    if (log.action.includes("READ")) {
      return { borderLeft: "4px solid var(--accent)", background: "rgba(59, 130, 246, 0.02)" };
    }
    return { borderLeft: "4px solid var(--text-secondary)" };
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldAlert size={28} style={{ color: "var(--danger)" }} />
            PHIPA Security Audit Logs
          </h1>
          <p className="page-subtitle">Real-time access logs and security event records for digital compliance</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn btn-secondary" onClick={fetchLogs} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={downloadCSV} disabled={filteredLogs.length === 0} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel" style={{ padding: "20px", marginBottom: "24px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          <Filter size={16} />
          <span>Filters:</span>
        </div>
        <input
          type="text"
          placeholder="Search by User, Resource, Details..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input"
          style={{ flex: 1, minWidth: "200px" }}
        />
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="form-input" style={{ width: "180px" }}>
          <option value="ALL">All Actions</option>
          <option value="LOGIN_SUCCESS">Login Success</option>
          <option value="LOGIN_FAILURE">Login Failure</option>
          <option value="REGISTRATION_ATTEMPT">Registration Attempt</option>
          <option value="PHI_READ">PHI Read Access</option>
          <option value="PHI_WRITE">PHI Write / Modify</option>
        </select>
        <select value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value)} className="form-input" style={{ width: "160px" }}>
          <option value="ALL">All Outcomes</option>
          <option value="Success">Success</option>
          <option value="Failure">Failure</option>
        </select>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: "24px" }}>⚠️ {error}</div>}

      {/* Audit Logs Table */}
      <div className="glass-panel" style={{ padding: "0px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: "12px" }} />
            <p>Retrieving secure audit records...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
            No logs found matching your filters.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <th style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>Timestamp (UTC)</th>
                  <th style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>User</th>
                  <th style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>Role</th>
                  <th style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>IP</th>
                  <th style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>Action</th>
                  <th style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>Resource</th>
                  <th style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>Details</th>
                  <th style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    style={{
                      ...getRowStyle(log),
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      transition: "background 0.2s ease"
                    }}
                    className="audit-row"
                  >
                    <td style={{ padding: "14px 18px", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                      {new Date(log.timestamp).toISOString().replace("T", " ").slice(0, 19)}
                    </td>
                    <td style={{ padding: "14px 18px", fontWeight: 600 }}>{log.username}</td>
                    <td style={{ padding: "14px 18px" }}>
                      <span className={`role-badge ${log.role?.toLowerCase()}`} style={{ fontSize: "0.75rem" }}>
                        {log.role}
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px", fontFamily: "monospace", opacity: 0.8 }}>{log.ipAddress}</td>
                    <td style={{ padding: "14px 18px" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          letterSpacing: "0.02em",
                          color: log.action.includes("WRITE") ? "#f59e0b" : log.action.includes("READ") ? "var(--accent)" : "inherit"
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px", fontWeight: 500 }}>
                      {log.resource}
                      {log.resourceId && <span style={{ opacity: 0.6, fontSize: "0.75rem", marginLeft: "4px" }}>({log.resourceId})</span>}
                    </td>
                    <td style={{ padding: "14px 18px", color: "var(--text-secondary)", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.details}>
                      {log.details}
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          background: log.outcome === "Success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                          color: log.outcome === "Success" ? "#10b981" : "var(--danger)",
                          border: `1px solid ${log.outcome === "Success" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`
                        }}
                      >
                        {log.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;

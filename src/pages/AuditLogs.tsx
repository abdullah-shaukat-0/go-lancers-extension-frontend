import React, { useState, useEffect, useCallback } from "react";
import { request } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Shield, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";

interface AuditLog {
  id: number;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  patientId: number | null;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  ipAddress: string;
  wasSuccessful: boolean;
}

interface AuditLogsResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  logs: AuditLog[];
}

const ACTION_OPTIONS = [
  "ALL",
  "LOGIN",
  "LOGIN_FAILED",
  "REGISTER",
  "VIEW_PATIENT_LIST",
  "VIEW_PATIENT_PROFILE",
  "UPDATE_PATIENT_PROFILE",
  "VIEW_APPOINTMENTS",
  "BOOK_APPOINTMENT",
  "RESCHEDULE_APPOINTMENT",
  "COMPLETE_APPOINTMENT",
  "CANCEL_APPOINTMENT",
  "VIEW_BILLING",
  "CREATE_INVOICE",
  "PAY_INVOICE",
  "VIEW_BED_LIST",
  "ALLOCATE_BED",
  "RELEASE_BED",
  "VIEW_CARE_INSTRUCTIONS",
  "CREATE_CARE_INSTRUCTION",
  "UPDATE_CARE_INSTRUCTION",
  "VIEW_NOTIFICATIONS",
  "SEND_NOTIFICATION",
  "SCHEDULE_NOTIFICATION",
  "UNAUTHORIZED_ACCESS_ATTEMPT",
];

const ROLE_OPTIONS = ["ALL", "Admin", "Doctor", "Nurse", "Patient"];

export const AuditLogs: React.FC = () => {
  const { user } = useAuth();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("ALL");
  const [role, setRole] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("userId", search);
      if (action !== "ALL") params.set("action", action);
      if (role !== "ALL") params.set("role", role);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("page", page.toString());
      params.set("pageSize", PAGE_SIZE.toString());

      const data: AuditLogsResponse = await request(`/auditlogs?${params.toString()}`);
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err.message || "Failed to fetch audit logs.");
    } finally {
      setIsLoading(false);
    }
  }, [search, action, role, from, to, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const resetFilters = () => {
    setSearch("");
    setAction("ALL");
    setRole("ALL");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString();
  };

  if (user?.role?.toLowerCase() !== "admin") {
    return (
      <div className="p-6 text-center text-red-600 font-semibold">
        Access denied. Admin role required.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-7 h-7 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Audit Logs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            PHIPA-informed access and activity audit trail — read-only
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 space-y-3">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
          <Filter className="w-4 h-4" /> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Search by username */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Username / User ID"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 pr-3 py-2 text-sm w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
            />
          </div>

          {/* Action */}
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="py-2 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
          >
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>{a === "ALL" ? "All Actions" : a}</option>
            ))}
          </select>

          {/* Role */}
          <select
            value={role}
            onChange={(e) => { setRole(e.target.value); setPage(1); }}
            className="py-2 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r === "ALL" ? "All Roles" : r}</option>
            ))}
          </select>

          {/* Date From */}
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="py-2 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
          />

          {/* Date To */}
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="py-2 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
          />
        </div>

        <button
          onClick={resetFilters}
          className="text-sm text-indigo-600 hover:underline"
        >
          Reset filters
        </button>
      </div>

      {/* Summary */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {isLoading ? "Loading..." : `Showing ${logs.length} of ${total} records`}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Timestamp</th>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Resource</th>
              <th className="px-4 py-3 text-left">Patient ID</th>
              <th className="px-4 py-3 text-left">IP</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500">Loading audit logs...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500">No audit logs found.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    !log.wasSuccessful ? "bg-red-50 dark:bg-red-900/20" : ""
                  }`}
                >
                  <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="px-4 py-2 text-gray-800 dark:text-white font-medium">
                    {log.userName || log.userId || "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      log.userRole === "Admin" ? "bg-purple-100 text-purple-700" :
                      log.userRole === "Doctor" ? "bg-blue-100 text-blue-700" :
                      log.userRole === "Nurse" ? "bg-teal-100 text-teal-700" :
                      log.userRole === "Patient" ? "bg-green-100 text-green-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {log.userRole || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-indigo-700 dark:text-indigo-300">
                    {log.action}
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400 text-xs">
                    {log.resourceType}/{log.resourceId}
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                    {log.patientId ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-500 text-xs">
                    {log.ipAddress || "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      log.wasSuccessful
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {log.wasSuccessful ? "Success" : "Failed"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

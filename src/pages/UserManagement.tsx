import React, { useEffect, useMemo, useState } from "react";
import { Check, Plus, Search, Shield, Trash2, UserCog } from "lucide-react";
import { request } from "../services/api";

interface ManagedUser {
  id: string | number;
  fullName: string;
  username?: string;
  email?: string;
  role: string;
  profileId?: number;
  status?: string;
}

const normalizeUser = (user: any, roleHint?: string): ManagedUser => ({
  id: user.userId || user.UserId || user.id || user.Id,
  fullName: user.fullName || user.FullName || user.user?.fullName || user.User?.FullName || "Unnamed User",
  username: user.username || user.Username || user.user?.username || user.User?.Username,
  email: user.email || user.Email || user.user?.email || user.User?.Email,
  role: user.role || user.Role || roleHint || "User",
  profileId: user.profileId || user.ProfileId || user.id || user.Id,
  status: user.status || user.Status || "Active",
});

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    role: "Patient",
    bloodGroup: "O+",
    gender: "Male",
    dateOfBirth: "1995-01-01",
    specialization: "General Physician",
    rosterSchedule: "Mon-Fri 9AM-5PM",
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      try {
        const data = await request("/users");
        setUsers(data.map((item: any) => normalizeUser(item)));
      } catch {
        const [patients, doctors] = await Promise.all([
          request("/patients").catch(() => []),
          request("/doctors").catch(() => []),
        ]);
        setUsers([
          ...patients.map((patient: any) => normalizeUser(patient, "Patient")),
          ...doctors.map((doctor: any) => normalizeUser(doctor, "Doctor")),
        ]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = roleFilter === "All" || user.role.toLowerCase() === roleFilter.toLowerCase();
      const matchesQuery = !term || [user.fullName, user.username, user.email, user.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
      return matchesRole && matchesQuery;
    });
  }, [users, query, roleFilter]);

  const roleCounts = users.reduce<Record<string, number>>((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const payload: any = {
      username: form.username,
      email: form.email,
      password: form.password,
      fullName: form.fullName,
      role: form.role,
    };

    if (form.role.toLowerCase() === "patient") {
      payload.bloodGroup = form.bloodGroup;
      payload.gender = form.gender;
      payload.dateOfBirth = new Date(form.dateOfBirth).toISOString();
    }

    if (form.role.toLowerCase() === "doctor") {
      payload.specialization = form.specialization;
      payload.rosterSchedule = form.rosterSchedule;
    }

    try {
      await request("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSuccess("User account created successfully.");
      setShowCreateForm(false);
      setForm((current) => ({ ...current, username: "", email: "", password: "", fullName: "" }));
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "Failed to create user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: ManagedUser) => {
    setError(null);
    setSuccess(null);
    try {
      await request(`/users/${user.id}`, { method: "DELETE" });
      setSuccess(`${user.fullName} was removed.`);
      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (err: any) {
      setError(err.message || "Delete is not available for this account yet.");
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh" }}>
        <span className="badge badge-info">Loading user directory...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", display: "flex", alignItems: "center", gap: "10px" }}>
            <UserCog size={24} style={{ color: "var(--accent-secondary)" }} />
            User Management
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "4px" }}>
            Review hospital accounts and create new patient, doctor, nurse, or admin users.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateForm((current) => !current)}>
          <Plus size={18} />
          Add User
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "14px" }}>
        {["Patient", "Doctor", "Nurse", "Admin"].map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setRoleFilter(roleFilter === role ? "All" : role)}
            className="glass-panel"
            style={{
              padding: "16px", border: roleFilter === role ? "1px solid var(--accent-secondary)" : undefined,
              cursor: "pointer", textAlign: "left", color: "var(--text-primary)"
            }}
          >
            <span style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>{role}s</span>
            <strong style={{ display: "block", fontSize: "1.55rem", marginTop: "4px" }}>{roleCounts[role] || 0}</strong>
          </button>
        ))}
      </div>

      {(error || success) && (
        <div className={error ? "badge-danger" : "badge-success"} style={{ padding: "12px", borderRadius: "8px" }}>
          {error || success}
        </div>
      )}

      {showCreateForm && (
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <Shield size={18} style={{ color: "var(--accent-purple)" }} />
            Create User Account
          </h3>
          <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              <div>
                <label>Full Name</label>
                <input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
              </div>
              <div>
                <label>Username</label>
                <input required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
              </div>
              <div>
                <label>Email</label>
                <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </div>
              <div>
                <label>Password</label>
                <input required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
              </div>
              <div>
                <label>Role</label>
                <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                  <option value="Patient">Patient</option>
                  <option value="Doctor">Doctor</option>
                  <option value="Nurse">Nurse</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              {form.role === "Patient" && (
                <>
                  <div>
                    <label>Blood Group</label>
                    <select value={form.bloodGroup} onChange={(event) => setForm({ ...form, bloodGroup: event.target.value })}>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => <option key={group} value={group}>{group}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Gender</label>
                    <select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label>Date of Birth</label>
                    <input type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} />
                  </div>
                </>
              )}
              {form.role === "Doctor" && (
                <>
                  <div>
                    <label>Specialization</label>
                    <input value={form.specialization} onChange={(event) => setForm({ ...form, specialization: event.target.value })} />
                  </div>
                  <div>
                    <label>Roster Schedule</label>
                    <input value={form.rosterSchedule} onChange={(event) => setForm({ ...form, rosterSchedule: event.target.value })} />
                  </div>
                </>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                <Check size={16} />
                {isSubmitting ? "Creating..." : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel" style={{ padding: "0", overflowX: "auto" }}>
        <div style={{ padding: "18px", display: "flex", justifyContent: "space-between", gap: "14px", flexWrap: "wrap", borderBottom: "1px solid var(--panel-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "260px", flex: 1 }}>
            <Search size={16} style={{ color: "var(--text-secondary)" }} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users..." />
          </div>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} style={{ width: "180px" }}>
            <option value="All">All roles</option>
            <option value="Patient">Patients</option>
            <option value="Doctor">Doctors</option>
            <option value="Nurse">Nurses</option>
            <option value="Admin">Admins</option>
          </select>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--panel-border)" }}>
              <th style={{ padding: "16px 20px" }}>User</th>
              <th style={{ padding: "16px 20px" }}>Role</th>
              <th style={{ padding: "16px 20px" }}>Status</th>
              <th style={{ padding: "16px 20px" }}>Profile ID</th>
              <th style={{ padding: "16px 20px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)" }}>
                  No users match the current filters.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={`${user.role}-${user.id}`} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.03)" }}>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div className="user-avatar" style={{ width: "34px", height: "34px", fontSize: "0.78rem" }}>
                        {user.fullName.split(" ").map((part) => part[0]).join("").substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <strong>{user.fullName}</strong>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>{user.email || user.username || "No login detail"}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px" }}><span className="badge badge-info">{user.role}</span></td>
                  <td style={{ padding: "16px 20px" }}><span className="badge badge-success">{user.status || "Active"}</span></td>
                  <td style={{ padding: "16px 20px", color: "var(--text-secondary)" }}>{user.profileId || "N/A"}</td>
                  <td style={{ padding: "16px 20px", textAlign: "right" }}>
                    <button className="btn btn-secondary" style={{ padding: "7px 10px" }} onClick={() => handleDeleteUser(user)} title="Delete user">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;

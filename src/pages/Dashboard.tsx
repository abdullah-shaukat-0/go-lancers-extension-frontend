import React, { useState, useEffect } from "react";
import { request } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Users,
  Bed,
  AlertTriangle,
  DollarSign,
  FileText,
  Heart,
  ShieldAlert,
  Stethoscope,
  ClipboardList,
  Bell,
  Clock,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase() ?? "";
  const isAdmin = role === "admin";
  const isDoctor = role === "doctor";
  const isNurse = role === "nurse";

  const [patientCount, setPatientCount] = useState(0);
  const [doctorCount, setDoctorCount] = useState(0);
  const [bedStats, setBedStats] = useState({ total: 0, occupied: 0 });
  const [lowStockCount, setLowStockCount] = useState(0);
  const [financeStats, setFinanceStats] = useState({ totalRevenue: 0, pendingAmount: 0 });
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);

  // Doctor/Nurse specific
  const [myInstructions, setMyInstructions] = useState<any[]>([]);
  const [myAppointmentsToday, setMyAppointmentsToday] = useState<any[]>([]);
  const [recentNotificationsSent, setRecentNotificationsSent] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const chartData = [
    { name: "Mon", consultations: 12, revenue: 1200 },
    { name: "Tue", consultations: 19, revenue: 1900 },
    { name: "Wed", consultations: 15, revenue: 1500 },
    { name: "Thu", consultations: 22, revenue: 2200 },
    { name: "Fri", consultations: 30, revenue: 3000 },
    { name: "Sat", consultations: 8, revenue: 800 },
    { name: "Sun", consultations: 5, revenue: 500 },
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        const patients = await request("/patients");
        setPatientCount(patients.length);

        const beds = await request("/beds");
        const occupiedBeds = beds.filter((b: any) => b.isOccupied || b.IsOccupied).length;
        setBedStats({ total: beds.length, occupied: occupiedBeds });

        if (isAdmin || isNurse) {
          const inventory = await request("/inventory");
          const lowStock = inventory.filter((item: any) => item.quantity <= item.thresholdValue);
          setLowStockCount(lowStock.length);
          setInventoryAlerts(lowStock.slice(0, 3));
        }

        if (isAdmin) {
          const doctors = await request("/doctors");
          setDoctorCount(doctors.length);
          const billing = await request("/billing/stats");
          setFinanceStats({
            totalRevenue: billing.totalRevenue || billing.TotalRevenue || 0,
            pendingAmount: billing.pendingAmount || billing.PendingAmount || 0,
          });
          const appointments = await request("/appointments");
          setRecentAppointments(appointments.slice(0, 4));
        }

        if (isDoctor && user?.profileId) {
          const appointments = await request("/appointments");
          const doctors = await request("/doctors");
          setDoctorCount(doctors.length);
          const today = new Date().toDateString();
          const myAppts = appointments.filter((a: any) => {
            const apptDate = new Date(a.appointmentDate || a.AppointmentDate);
            return a.doctorId === user.profileId && apptDate.toDateString() === today;
          });
          setMyAppointmentsToday(myAppts);
          const instructions = await request(`/careinstructions/doctor/${user.profileId}`);
          setMyInstructions(instructions.filter((i: any) => i.status !== "Completed" && i.status !== "Cancelled"));
          const sent = await request(`/notifications/sent?senderId=${user.userId}`);
          setRecentNotificationsSent(sent.slice(0, 3));
        }

        if (isNurse && user?.profileId) {
          const instructions = await request(`/careinstructions/nurse/${user.profileId}`);
          setMyInstructions(instructions.filter((i: any) => i.status !== "Completed" && i.status !== "Cancelled"));
          const sent = await request(`/notifications/sent?senderId=${user.userId}`);
          setRecentNotificationsSent(sent.slice(0, 3));
        }

      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAdmin, isDoctor, isNurse, user]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <span className="badge badge-info">Fetching statistics...</span>
      </div>
    );
  }

  const bedOccupancyRate = bedStats.total > 0 ? Math.round((bedStats.occupied / bedStats.total) * 100) : 0;

  const PRIORITY_COLOR: Record<string, string> = {
    Critical: "#ef4444", High: "#f97316", Medium: "#eab308", Low: "#22c55e"
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "30px" }}>

      {/* ─── Stat Cards Grid ─────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "20px" }}>

        {/* Total Patients — All roles */}
        <div className="glass-panel" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ width: 50, height: 50, borderRadius: 12, background: "rgba(99,102,241,0.1)", color: "var(--accent-purple)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={24} />
          </div>
          <div>
            <h4 style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 500 }}>Total Patients</h4>
            <span style={{ fontSize: "1.75rem", fontWeight: 700 }}>{patientCount}</span>
          </div>
        </div>

        {/* Active Doctors — Admin and Doctor */}
        {(isAdmin || isDoctor) && (
          <div className="glass-panel" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ width: 50, height: 50, borderRadius: 12, background: "rgba(13,148,136,0.1)", color: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Stethoscope size={24} />
            </div>
            <div>
              <h4 style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 500 }}>Active Doctors</h4>
              <span style={{ fontSize: "1.75rem", fontWeight: 700 }}>{doctorCount}</span>
            </div>
          </div>
        )}

        {/* Bed Allocation — All staff */}
        <div className="glass-panel" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ width: 50, height: 50, borderRadius: 12, background: "rgba(6,182,212,0.1)", color: "var(--accent-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bed size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 500 }}>Bed Allocation</h4>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: "1.75rem", fontWeight: 700 }}>{bedStats.occupied}/{bedStats.total}</span>
              <span className="badge badge-info">{bedOccupancyRate}% Occupied</span>
            </div>
          </div>
        </div>

        {/* Low Pharmacy Stock — Admin & Nurse only */}
        {(isAdmin || isNurse) && (
          <div className="glass-panel" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ width: 50, height: 50, borderRadius: 12, background: lowStockCount > 0 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", color: lowStockCount > 0 ? "var(--danger)" : "var(--success)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h4 style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 500 }}>Low Pharmacy Stock</h4>
              <span style={{ fontSize: "1.75rem", fontWeight: 700 }}>{lowStockCount}</span>
            </div>
          </div>
        )}

        {/* Net Revenue — Admin only */}
        {isAdmin && (
          <div className="glass-panel" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ width: 50, height: 50, borderRadius: 12, background: "rgba(16,185,129,0.1)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <DollarSign size={24} />
            </div>
            <div>
              <h4 style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 500 }}>Net Revenue (Paid)</h4>
              <span style={{ fontSize: "1.75rem", fontWeight: 700 }}>${financeStats.totalRevenue.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Doctor: Appointments Today */}
        {isDoctor && (
          <div className="glass-panel" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ width: 50, height: 50, borderRadius: 12, background: "rgba(99,102,241,0.1)", color: "var(--accent-purple)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calendar size={24} />
            </div>
            <div>
              <h4 style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 500 }}>My Appointments Today</h4>
              <span style={{ fontSize: "1.75rem", fontWeight: 700 }}>{myAppointmentsToday.length}</span>
            </div>
          </div>
        )}

        {/* Doctor/Nurse: Active Care Tasks */}
        {(isDoctor || isNurse) && (
          <div className="glass-panel" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ width: 50, height: 50, borderRadius: 12, background: "rgba(249,115,22,0.1)", color: "#f97316", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ClipboardList size={24} />
            </div>
            <div>
              <h4 style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 500 }}>
                {isDoctor ? "Pending Instructions" : "My Care Tasks"}
              </h4>
              <span style={{ fontSize: "1.75rem", fontWeight: 700 }}>{myInstructions.length}</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Charts (Admin only) ─────────────────────────────── */}
      {isAdmin && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "25px" }}>
          <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Heart size={18} style={{ color: "var(--accent-secondary)" }} />
              Consultation Activity Tracker
            </h3>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorConsultations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-secondary)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--accent-secondary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ background: "rgba(13,20,38,0.95)", border: "1px solid var(--panel-border)" }} />
                  <Area type="monotone" dataKey="consultations" stroke="var(--accent-secondary)" strokeWidth={2} fillOpacity={1} fill="url(#colorConsultations)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <DollarSign size={18} style={{ color: "var(--success)" }} />
              Daily Hospital Billing Yield ($)
            </h3>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ background: "rgba(13,20,38,0.95)", border: "1px solid var(--panel-border)" }} />
                  <Bar dataKey="revenue" fill="var(--success)" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bottom Panels ────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "25px" }}>

        {/* Admin: Recent Appointments Queue */}
        {isAdmin && (
          <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <FileText size={18} style={{ color: "var(--accent-purple)" }} />
              Recent Appointments Queue
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {recentAppointments.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No recent appointments found.</p>
              ) : (
                recentAppointments.map((app) => (
                  <div key={app.id || app.Id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px" }}>
                    <div>
                      <h5 style={{ fontSize: "0.875rem", fontWeight: 600 }}>{app.patient?.user?.fullName || "Patient"}</h5>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        with {app.doctor?.user?.fullName || "Doctor"} · {new Date(app.appointmentDate || app.AppointmentDate).toLocaleDateString()}
                      </span>
                    </div>
                    <span className={`badge ${app.status?.toLowerCase() === "completed" ? "badge-success" : app.status?.toLowerCase() === "cancelled" ? "badge-danger" : "badge-warning"}`}>
                      {app.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Admin & Nurse: Pharmacy Stock Alerts */}
        {(isAdmin || isNurse) && (
          <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldAlert size={18} style={{ color: "var(--danger)" }} />
              Critical Inventory Depletions
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {inventoryAlerts.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--success)" }}>
                  <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>All item stock levels adequate.</p>
                </div>
              ) : (
                inventoryAlerts.map((item) => (
                  <div key={item.id || item.Id} style={{ padding: "12px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h5 style={{ fontSize: "0.875rem", fontWeight: 600 }}>{item.name || item.Name}</h5>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Category: {item.category || item.Category}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--danger)" }}>{item.quantity || item.Quantity} Left</div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Threshold: {item.thresholdValue || item.ThresholdValue}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Doctor/Nurse: Active Care Instructions */}
        {(isDoctor || isNurse) && (
          <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <ClipboardList size={18} style={{ color: "#f97316" }} />
              {isDoctor ? "My Pending Instructions" : "My Active Care Tasks"}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {myInstructions.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No active care instructions.</p>
              ) : (
                myInstructions.slice(0, 4).map((ci) => (
                  <div key={ci.id} style={{ padding: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0, marginRight: "10px" }}>
                      <h5 style={{ fontSize: "0.875rem", fontWeight: 600 }}>{ci.patientName}</h5>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {isDoctor ? `→ ${ci.nurseName}` : `From: ${ci.doctorName}`}
                      </p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                      <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "0.68rem", fontWeight: 700, background: `rgba(${ci.priority === "Critical" ? "239,68,68" : ci.priority === "High" ? "249,115,22" : ci.priority === "Medium" ? "234,179,8" : "34,197,94"},0.15)`, color: PRIORITY_COLOR[ci.priority] || "#fff" }}>
                        {ci.priority}
                      </span>
                      <span style={{ fontSize: "0.68rem", color: ci.status === "InProgress" ? "var(--accent-secondary)" : "var(--text-muted)" }}>
                        {ci.status === "InProgress" ? "🔄 In Progress" : "⏳ Pending"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Doctor/Nurse: Recent Notifications Sent */}
        {(isDoctor || isNurse) && (
          <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Bell size={18} style={{ color: "var(--accent-purple)" }} />
              Recent Notifications Sent
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {recentNotificationsSent.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No notifications sent yet.</p>
              ) : (
                recentNotificationsSent.map((n) => {
                  const typeColors: Record<string, string> = { Precaution: "#f97316", Checkup: "#6366f1", Recovery: "#22c55e", General: "#06b6d4" };
                  return (
                    <div key={n.id} style={{ padding: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h5 style={{ fontSize: "0.875rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>{n.subject}</h5>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: typeColors[n.notificationType] || "#fff" }}>{n.notificationType}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>To: {n.patientName}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {n.scheduledFor && !n.isEmailSent ? <><Clock size={10} /> Scheduled</> : <><Bell size={10} /> Sent</>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Doctor: Appointments Today */}
        {isDoctor && myAppointmentsToday.length > 0 && (
          <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Calendar size={18} style={{ color: "var(--accent-purple)" }} />
              Today's Appointment Schedule
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {myAppointmentsToday.map((app) => (
                <div key={app.id} style={{ padding: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h5 style={{ fontSize: "0.875rem", fontWeight: 600 }}>{app.patientName || app.patient?.user?.fullName || "Patient"}</h5>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      <Clock size={10} style={{ display: "inline", marginRight: "3px", verticalAlign: "middle" }} />
                      {new Date(app.appointmentDate || app.AppointmentDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <span className={`badge ${app.status === "Completed" ? "badge-success" : "badge-warning"}`}>{app.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

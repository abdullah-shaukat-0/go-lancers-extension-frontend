import React, { useState, useEffect } from "react";
import { request } from "../services/api";
import { BedDouble } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const BedsTracker: React.FC = () => {
  const [beds, setBeds] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedBed, setSelectedBed] = useState<any | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [releasingBed, setReleasingBed] = useState<any | null>(null);
  
  const { user } = useAuth();
  const canManage = user?.role.toLowerCase() === "admin" || user?.role.toLowerCase() === "nurse" || user?.role.toLowerCase() === "doctor";

  const fetchBedsAndPatients = async () => {
    try {
      setIsLoading(true);
      const bedsData = await request("/beds");
      setBeds(bedsData);

      if (canManage) {
        const patientsData = await request("/patients");
        setPatients(patientsData);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch beds data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBedsAndPatients();
  }, []);

  const handleOpenAllocateModal = (bed: any) => {
    if (!canManage) return;
    setSelectedBed(bed);
    setSelectedPatientId("");
    setIsModalOpen(true);
  };

  const handleAllocateBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBed || !selectedPatientId) return;

    try {
      await request(`/beds/${selectedBed.id || selectedBed.Id}/occupy`, {
        method: "PUT",
        body: JSON.stringify({ patientId: parseInt(selectedPatientId) })
      });
      setIsModalOpen(false);
      fetchBedsAndPatients();
    } catch (err: any) {
      setError(err.message || "Failed to occupy bed.");
    }
  };

  const handleReleaseBed = (bed: any) => {
    if (!canManage) return;
    setReleasingBed(bed);
  };

  const executeReleaseBed = async (bed: any) => {
    try {
      setError(null);
      await request(`/beds/${bed.id || bed.Id}/release`, {
        method: "PUT"
      });
      fetchBedsAndPatients();
    } catch (err: any) {
      setError(err.message || "Failed to discharge patient.");
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <span className="badge badge-info">Loading bed layout...</span>
      </div>
    );
  }

  // Group beds by Ward Type, sorted by room number ascending within each ward
  const wards = beds.reduce((acc: { [key: string]: any[] }, bed) => {
    const ward = bed.wardType || bed.WardType || "General";
    if (!acc[ward]) acc[ward] = [];
    acc[ward].push(bed);
    return acc;
  }, {});

  const totalBeds = beds.length;
  const occupiedBeds = beds.filter((bed) => bed.isOccupied || bed.IsOccupied).length;
  const availableBeds = totalBeds - occupiedBeds;

  return (
    <div className="animate-fade-in page-shell">
      <div className="glass-panel" style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "4px" }}>Bed Operations Overview</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Coordinate ward occupancy and admissions from a single modern view.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <span className="badge badge-info">{totalBeds} total</span>
          <span className="badge badge-success">{availableBeds} available</span>
          <span className="badge badge-warning">{occupiedBeds} occupied</span>
        </div>
      </div>
      
      {error && (
        <div className="badge-danger" style={{ padding: "12px", borderRadius: "8px" }}>
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Hospital ward map overview. Click on a bed to manage admission & discharge assignments.
        </p>
        <div style={{ display: "flex", gap: "15px", fontSize: "0.8rem" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid var(--success)" }}></span>
            <span>Available</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid var(--danger)" }}></span>
            <span>Occupied</span>
          </span>
        </div>
      </div>

      {/* Ward Lists */}
      {Object.keys(wards).map((wardName) => (
        <div key={wardName} className="glass-panel" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "1.2rem", marginBottom: "20px", borderBottom: "1px solid var(--panel-border)", paddingBottom: "10px", textTransform: "capitalize" }}>
            {wardName} Ward
          </h3>

          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", 
            gap: "20px" 
          }}>
            {wards[wardName].map((bed) => {
              const occupied = bed.isOccupied || bed.IsOccupied;
              const patientName = bed.patient?.user?.fullName || bed.patient?.User?.FullName || "Occupied";
              
              return (
                <div 
                  key={bed.id || bed.Id}
                  onClick={() => !occupied ? handleOpenAllocateModal(bed) : handleReleaseBed(bed)}
                  style={{
                    padding: "20px 15px",
                    borderRadius: "18px",
                    background: occupied ? "linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(239, 68, 68, 0.05))" : "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.05))",
                    border: `1px solid ${occupied ? "rgba(239, 68, 68, 0.25)" : "rgba(16, 185, 129, 0.25)"}`,
                    cursor: canManage ? "pointer" : "default",
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "10px",
                    boxShadow: occupied ? "0 10px 24px rgba(239, 68, 68, 0.08)" : "0 10px 24px rgba(16, 185, 129, 0.08)"
                  }}
                  className="bed-card"
                >
                  <BedDouble size={28} style={{ color: occupied ? "var(--danger)" : "var(--success)" }} />
                  
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>Bed {bed.roomNumber || bed.RoomNumber}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {occupied ? patientName : "Empty"}
                    </div>
                  </div>

                  {canManage && (
                    <span style={{ fontSize: "0.7rem", marginTop: "4px" }} className={`badge ${occupied ? "badge-danger" : "badge-success"}`}>
                      {occupied ? "Discharge Patient" : "Assign Patient"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Allocation Modal Popup */}
      {isModalOpen && selectedBed && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 200
        }}>
          <div className="glass-panel" style={{ padding: "30px", width: "100%", maxWidth: "420px" }}>
            <h3 style={{ marginBottom: "20px" }}>Admit Patient to Bed {selectedBed.roomNumber}</h3>
            
            <form onSubmit={handleAllocateBed} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label>Select Patient to Admit</label>
                <select 
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id || p.Id} value={p.id || p.Id}>
                      {p.user?.fullName || p.User?.FullName} (ID: {p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!selectedPatientId}
                >
                  Admit Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Release Bed Confirmation Modal */}
      {releasingBed && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 200
        }}>
          <div className="glass-panel" style={{ padding: "30px", width: "100%", maxWidth: "420px", textAlign: "center" }}>
            <h3 style={{ marginBottom: "15px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--danger)" }}>
              <BedDouble size={22} style={{ color: "var(--danger)" }} />
              <span>Confirm Discharge</span>
            </h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "25px", fontSize: "0.95rem", lineHeight: "1.5" }}>
              Are you sure you want to discharge the patient from <strong>Bed Room {releasingBed.roomNumber}</strong>?
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button 
                type="button"
                className="btn btn-secondary" 
                style={{ padding: "8px 16px" }}
                onClick={() => setReleasingBed(null)}
              >
                No, Keep Admitted
              </button>
              <button 
                type="button"
                className="btn btn-danger" 
                style={{ padding: "8px 16px" }}
                onClick={() => {
                  executeReleaseBed(releasingBed);
                  setReleasingBed(null);
                }}
              >
                Yes, Discharge Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BedsTracker;

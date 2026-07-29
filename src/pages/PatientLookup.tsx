import React, { useEffect, useMemo, useState } from "react";
import { Search, UserRound, ClipboardList, Pill, CalendarClock } from "lucide-react";
import { request } from "../services/api";
import { useAuth } from "../context/AuthContext";

interface PatientSummary {
  id: number;
  fullName: string;
  email?: string;
  bloodGroup?: string;
  gender?: string;
  dateOfBirth?: string;
  medicalHistory?: string;
}

const normalizePatient = (patient: any): PatientSummary => ({
  id: patient.id || patient.Id,
  fullName: patient.fullName || patient.FullName || patient.user?.fullName || patient.User?.FullName || "Unnamed Patient",
  email: patient.email || patient.Email || patient.user?.email || patient.User?.Email,
  bloodGroup: patient.bloodGroup || patient.BloodGroup,
  gender: patient.gender || patient.Gender,
  dateOfBirth: patient.dateOfBirth || patient.DateOfBirth,
  medicalHistory: patient.medicalHistory || patient.MedicalHistory,
});

const PatientLookup: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLookupData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [patientData, appointmentData] = await Promise.all([
          request("/patients"),
          request(user?.role.toLowerCase() === "doctor" ? `/appointments?doctorId=${user.profileId}` : "/appointments"),
        ]);
        const normalized = patientData.map(normalizePatient);
        setPatients(normalized);
        setAppointments(appointmentData);
        setSelectedPatientId(normalized[0]?.id ?? null);
      } catch (err: any) {
        setError(err.message || "Failed to load patient lookup data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLookupData();
  }, [user]);

  const filteredPatients = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter((patient) =>
      [patient.fullName, patient.email, patient.bloodGroup, patient.medicalHistory]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [patients, query]);

  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) || filteredPatients[0];
  const selectedAppointments = selectedPatient
    ? appointments.filter((app) => (app.patientId || app.PatientId || app.patient?.id || app.Patient?.Id) === selectedPatient.id)
    : [];

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh" }}>
        <span className="badge badge-info">Loading patient directory...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) 1fr", gap: "24px", alignItems: "start" }}>
      <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "10px" }}>
            <Search size={22} style={{ color: "var(--accent-secondary)" }} />
            Patient Lookup
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "6px" }}>
            Search patient demographics, history, and consultation records.
          </p>
        </div>

        <div>
          <label>Search patients</label>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, blood group, history..." />
        </div>

        {error && <div className="badge-danger" style={{ padding: "12px", borderRadius: "8px" }}>{error}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "58vh", overflow: "auto", paddingRight: "4px" }}>
          {filteredPatients.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "24px 0" }}>No patients match your search.</p>
          ) : (
            filteredPatients.map((patient) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => setSelectedPatientId(patient.id)}
                className="btn btn-secondary"
                style={{
                  justifyContent: "flex-start",
                  padding: "14px",
                  borderColor: selectedPatient?.id === patient.id ? "var(--accent-secondary)" : undefined,
                  background: selectedPatient?.id === patient.id ? "rgba(6, 182, 212, 0.08)" : undefined,
                }}
              >
                <UserRound size={18} />
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 }}>
                  <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "240px" }}>{patient.fullName}</span>
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>Patient ID #{patient.id}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {selectedPatient ? (
          <>
            <div className="glass-panel" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: "1.35rem", display: "flex", alignItems: "center", gap: "10px" }}>
                    <UserRound size={22} style={{ color: "var(--accent-purple)" }} />
                    {selectedPatient.fullName}
                  </h3>
                  <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>{selectedPatient.email || "No email on file"}</p>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <span className="badge badge-info">Blood: {selectedPatient.bloodGroup || "N/A"}</span>
                  <span className="badge badge-info">{selectedPatient.gender || "Gender N/A"}</span>
                  <span className="badge badge-info">
                    DOB: {selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: "22px", padding: "16px", borderRadius: "10px", background: "var(--surface-soft)", border: "1px solid var(--panel-border)" }}>
                <h4 style={{ fontSize: "0.9rem", color: "var(--accent-secondary)", marginBottom: "8px" }}>Medical History</h4>
                <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {selectedPatient.medicalHistory || "No medical history has been recorded for this patient."}
                </p>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "24px" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
                <ClipboardList size={20} style={{ color: "var(--accent-secondary)" }} />
                Consultation Timeline
              </h3>
              {selectedAppointments.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "34px 0" }}>No consultations found for this patient.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {selectedAppointments.map((app) => (
                    <div key={app.id || app.Id} style={{ padding: "16px", borderRadius: "10px", background: "var(--surface-soft)", border: "1px solid var(--panel-border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                        <strong style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <CalendarClock size={16} />
                          {new Date(app.appointmentDate || app.AppointmentDate).toLocaleString()}
                        </strong>
                        <span className={`badge ${(app.status || app.Status) === "Completed" ? "badge-success" : "badge-warning"}`}>
                          {app.status || app.Status}
                        </span>
                      </div>
                      {(app.diagnosis || app.Diagnosis || app.prescription || app.Prescription) && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
                          <div>
                            <span style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>Diagnosis</span>
                            <p>{app.diagnosis || app.Diagnosis || "Not recorded"}</p>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-secondary)", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "5px" }}>
                              <Pill size={13} /> Prescription
                            </span>
                            <p>{app.prescription || app.Prescription || "Not recorded"}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
            Select a patient to view their clinical summary.
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientLookup;

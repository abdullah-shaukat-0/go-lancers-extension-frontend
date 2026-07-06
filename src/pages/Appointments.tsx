import React, { useEffect, useRef, useState } from "react";
import { request } from "../services/api";
import { Calendar, Check, Ban, Plus, Clock, ClipboardList } from "lucide-react";
import { useAuth } from "../context/AuthContext";



export const Appointments: React.FC = () => {
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const bookingSectionRef = useRef<HTMLDivElement | null>(null);
  
  // Patient booking form states
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [selectedSpec, setSelectedSpec] = useState("All");

  // Doctor completing consultations states
  const [completingAppId, setCompletingAppId] = useState<number | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState("");
  const [cancellingAppId, setCancellingAppId] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isPatient = user?.role.toLowerCase() === "patient";
  const isDoctor = user?.role.toLowerCase() === "doctor";
  const isStaff = user?.role.toLowerCase() === "admin" || user?.role.toLowerCase() === "nurse";



  const fetchAppointmentsAndDoctors = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Query params depending on user role
      let queryStr = "";
      if (isPatient) {
        queryStr = `?patientId=${user.profileId}`;
      } else if (isDoctor) {
        queryStr = `?doctorId=${user.profileId}`;
      }

      const appsData = await request(`/appointments${queryStr}`);
      setAppointments(appsData);

      const docsData = await request("/doctors");
      setDoctors(docsData);

      // Group specializations
      const specs: string[] = Array.from(new Set(docsData.map((d: any) => d.specialization || d.Specialization)));
      setSpecializations(specs);

    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch appointments or doctor listings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointmentsAndDoctors();
  }, []);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !appointmentDate || !symptoms) return;

    try {
      setError(null);
      setSuccess(null);
      await request("/appointments", {
        method: "POST",
        body: JSON.stringify({
          patientId: user?.profileId,
          doctorId: parseInt(selectedDoctorId),
          appointmentDate: new Date(appointmentDate).toISOString(),
          symptoms
        })
      });

      setSuccess("Appointment booked successfully! Flat consultation billing invoice generated.");
      // Reset form
      setSelectedDoctorId("");
      setAppointmentDate("");
      setSymptoms("");
      fetchAppointmentsAndDoctors();
    } catch (err: any) {
      setError(err.message || "Failed to book appointment.");
    }
  };

  const handleCompleteConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingAppId || !diagnosis || !prescription) return;

    try {
      await request(`/appointments/${completingAppId}/complete`, {
        method: "PUT",
        body: JSON.stringify({ diagnosis, prescription })
      });

      setSuccess("Consultation record updated and closed.");
      setCompletingAppId(null);
      setDiagnosis("");
      setPrescription("");
      fetchAppointmentsAndDoctors();
    } catch (err: any) {
      setError(err.message || "Failed to complete appointment consultation.");
    }
  };

  const handleCancelAppointment = async (appId: number) => {
    try {
      setError(null);
      setSuccess(null);
      await request(`/appointments/${appId}/cancel`, {
        method: "PUT"
      });
      setSuccess("Appointment cancelled successfully.");
      fetchAppointmentsAndDoctors();
    } catch (err: any) {
      setError(err.message || "Failed to cancel appointment.");
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <span className="badge badge-info">Syncing appointments queue...</span>
      </div>
    );
  }

  // Filter doctors based on specialization dropdown
  const filteredDoctors = selectedSpec === "All" 
    ? doctors 
    : doctors.filter(d => (d.specialization || d.Specialization) === selectedSpec);

  return (
    <div className="animate-fade-in" style={{ display: "grid", gap: "30px" }}>



      <div style={{ display: "grid", gridTemplateColumns: isPatient ? "1fr 1fr" : "1fr", gap: "30px" }}>
      
      {/* Messages */}
      <div style={{ gridColumn: isPatient ? "span 2" : "span 1" }}>
        {error && (
          <div className="badge-danger" style={{ padding: "12px", borderRadius: "8px", marginBottom: "10px" }}>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="badge-success" style={{ padding: "12px", borderRadius: "8px", marginBottom: "10px" }}>
            <span>{success}</span>
          </div>
        )}
      </div>

      {/* LEFT COL: Booking Form (Only Patient) */}
      {isPatient && (
        <div ref={bookingSectionRef} className="glass-panel" style={{ padding: "30px", height: "fit-content" }}>
          <h3 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <Calendar style={{ color: "var(--accent-secondary)" }} />
            <span>Book New Appointment</span>
          </h3>

          <form onSubmit={handleBookAppointment} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label>Filter By Specialization</label>
              <select value={selectedSpec} onChange={(e) => setSelectedSpec(e.target.value)}>
                <option value="All">All Specialties</option>
                {specializations.map((spec) => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Select Doctor</label>
              <select 
                required
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
              >
                <option value="">-- Choose Doctor --</option>
                {filteredDoctors.map((doc) => (
                  <option key={doc.id || doc.Id} value={doc.id || doc.Id}>
                    {doc.user?.fullName || doc.User?.FullName} ({doc.specialization})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Select Appointment Date & Time</label>
              <input 
                type="datetime-local" 
                required
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
              />
            </div>

            <div>
              <label>Describe Symptoms / Reasons for Visit</label>
              <textarea 
                rows={4} 
                required
                placeholder="Describe your current medical concern..." 
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: "10px" }}>
              <Plus size={18} />
              <span>Confirm Appointment</span>
            </button>
          </form>
        </div>
      )}

      {/* RIGHT COL / MAIN: Appointments List */}
      <div className="glass-panel" style={{ padding: "30px" }}>
        <h3 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <ClipboardList style={{ color: "var(--accent-purple)" }} />
          <span>
            {isPatient ? "My Bookings" : isDoctor ? "Today's Patient Consultations" : "Hospital Master Appointments Queue"}
          </span>
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {appointments.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px 0" }}>
              No appointments found in the queue.
            </p>
          ) : (
            appointments.map((app) => {
              const appDate = new Date(app.appointmentDate || app.AppointmentDate).toLocaleString();
              const status = app.status || app.Status;
              const appId = app.id || app.Id;

              return (
                <div 
                  key={appId} 
                  style={{
                    padding: "20px",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h4 style={{ fontSize: "1.05rem", fontWeight: 600 }}>
                        {isPatient 
                          ? `Dr. ${app.doctor?.user?.fullName || "Doctor"}` 
                          : `Patient: ${app.patient?.user?.fullName || "Patient"}`}
                      </h4>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Clock size={12} />
                        <span>{appDate}</span>
                      </div>
                    </div>
                    <span className={`badge ${
                      status.toLowerCase() === "completed" ? "badge-success" :
                      status.toLowerCase() === "cancelled" ? "badge-danger" : "badge-warning"
                    }`}>
                      {status}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.85rem", background: "rgba(0, 0, 0, 0.2)", padding: "10px", borderRadius: "8px" }}>
                    <strong>Symptoms: </strong> {app.symptoms || app.Symptoms || "N/A"}
                  </div>

                  {/* Diagnoses/Prescriptions Details if completed */}
                  {status.toLowerCase() === "completed" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.85rem", borderLeft: "2px solid var(--success)", paddingLeft: "10px" }}>
                      <div><strong>Diagnosis:</strong> {app.diagnosis || app.Diagnosis}</div>
                      <div><strong>Prescription:</strong> {app.prescription || app.Prescription}</div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {status.toLowerCase() === "scheduled" && (
                    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                      {/* Doctor Complete Consult button */}
                      {isDoctor && (
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: "8px 14px", fontSize: "0.8rem" }}
                          onClick={() => {
                            setCompletingAppId(appId);
                            setDiagnosis("");
                            setPrescription("");
                          }}
                        >
                          <Check size={14} />
                          <span>Close Consultation</span>
                        </button>
                      )}

                      {/* Cancel Appointment button */}
                      {(isPatient || isStaff || isDoctor) && (
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: "8px 14px", fontSize: "0.8rem", display: "flex", gap: "4px" }}
                          onClick={() => setCancellingAppId(appId)}
                        >
                          <Ban size={14} />
                          <span>Cancel Appointment</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Doctor Consultation Modal */}
      {completingAppId && (
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
          <div className="glass-panel" style={{ padding: "30px", width: "100%", maxWidth: "480px" }}>
            <h3 style={{ marginBottom: "20px" }}>Complete Patient Consultation</h3>
            
            <form onSubmit={handleCompleteConsultation} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label>Medical Diagnosis</label>
                <textarea 
                  rows={3} 
                  required 
                  placeholder="Enter medical assessment findings..." 
                  value={diagnosis} 
                  onChange={(e) => setDiagnosis(e.target.value)} 
                />
              </div>

              <div>
                <label>Prescribed Medications & Dosage Instructions</label>
                <textarea 
                  rows={3} 
                  required 
                  placeholder="e.g. Paracetamol 500mg - Twice daily after meals" 
                  value={prescription} 
                  onChange={(e) => setPrescription(e.target.value)} 
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setCompletingAppId(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  Finalize Consultation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Appointment Confirmation Modal */}
      {cancellingAppId && (
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
              <Ban size={22} style={{ color: "var(--danger)" }} />
              <span>Confirm Cancellation</span>
            </h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "25px", fontSize: "0.95rem", lineHeight: "1.5" }}>
              Are you sure you want to cancel this appointment? The associated billing invoice will be voided.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button 
                type="button"
                className="btn btn-secondary" 
                style={{ padding: "8px 16px" }}
                onClick={() => setCancellingAppId(null)}
              >
                No, Keep It
              </button>
              <button 
                type="button"
                className="btn btn-danger" 
                style={{ padding: "8px 16px" }}
                onClick={() => {
                  handleCancelAppointment(cancellingAppId);
                  setCancellingAppId(null);
                }}
              >
                Yes, Cancel Appointment
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Appointments;

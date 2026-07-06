import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import BedsTracker from "./pages/BedsTracker";
import Inventory from "./pages/Inventory";
import Appointments from "./pages/Appointments";
import Billing from "./pages/Billing";
import PatientPortal from "./pages/PatientPortal";
import CareInstructions from "./pages/CareInstructions";
import PatientNotificationsPage from "./pages/PatientNotifications";
import PatientLookup from "./pages/PatientLookup";
import UserManagement from "./pages/UserManagement";
import ProtectedRoute from "./components/ProtectedRoute";
import PatientAssistant from "./components/PatientAssistant";
import { MessageSquare } from "lucide-react";

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case "/dashboard": return "Hospital Operations Dashboard";
      case "/beds": return "Wards & Bed Allocations Map";
      case "/inventory": return "Pharmacy Stock & Inventory";
      case "/appointments": return "Appointments Desk";
      case "/billing": return "Invoicing & Financial Ledger";
      case "/patient-portal": return "Personal Patient Care Portal";
      case "/patient-lookup": return "Patient Lookup";
      case "/users": return "User Management";
      case "/care-instructions": return "Care Instructions & Delegation";
      case "/notifications": return "Patient Notifications";
      default: return "Smart Healthcare Management System";
    }
  };

  const showLayout = user && location.pathname !== "/login";

  return (
    <div className="app-container" style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      {showLayout && <Sidebar />}

      <div
        className="main-content-wrapper"
        style={{
          flex: 1,
          marginLeft: showLayout ? "var(--sidebar-width)" : 0,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          width: showLayout ? "calc(100% - var(--sidebar-width))" : "100%",
        }}
      >
        {showLayout && <Navbar title={getPageTitle(location.pathname)} />}

        <main style={{ padding: showLayout ? "30px" : 0, flex: 1, width: "100%" }}>
          <Routes>
            <Route
              path="/login"
              element={!user ? <Login /> : <Navigate to={user.role.toLowerCase() === "patient" ? "/patient-portal" : "/dashboard"} replace />}
            />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>

              {/* Patient Only */}
              <Route element={<ProtectedRoute allowedRoles={["Patient"]} />}>
                <Route path="/patient-portal" element={<PatientPortal />} />
              </Route>

              {/* Staff Only */}
              <Route element={<ProtectedRoute allowedRoles={["Admin", "Doctor", "Nurse"]} />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/beds" element={<BedsTracker />} />
              </Route>

              {/* Doctor & Nurse Only */}
              <Route element={<ProtectedRoute allowedRoles={["Doctor", "Nurse"]} />}>
                <Route path="/care-instructions" element={<CareInstructions />} />
                <Route path="/notifications" element={<PatientNotificationsPage />} />
              </Route>

              {/* Doctor Only */}
              <Route element={<ProtectedRoute allowedRoles={["Doctor"]} />}>
                <Route path="/patient-lookup" element={<PatientLookup />} />
              </Route>

              {/* Admin Only */}
              <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
                <Route path="/users" element={<UserManagement />} />
              </Route>

              {/* Admin & Nurse Only */}
              <Route element={<ProtectedRoute allowedRoles={["Admin", "Nurse"]} />}>
                <Route path="/inventory" element={<Inventory />} />
              </Route>

              {/* Shared Protected Pages */}
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/billing" element={<Billing />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
      </div>

      {/* Floating Chatbot for Patients */}
      {user?.role.toLowerCase() === "patient" && (
        <div className="floating-chat-container">
          {isChatOpen ? (
            <div className="floating-chat-popup animate-slide-up">
              <PatientAssistant
                onBookAppointment={() => { navigate("/appointments"); setIsChatOpen(false); }}
                onOpenAppointments={() => { navigate("/appointments"); setIsChatOpen(false); }}
                onOpenRecords={() => { navigate("/patient-portal"); setIsChatOpen(false); }}
                onClose={() => setIsChatOpen(false)}
              />
            </div>
          ) : (
            <button
              className="floating-chat-fab"
              onClick={() => setIsChatOpen(true)}
              aria-label="Open support chat"
              title="Open Support Chat"
            >
              <MessageSquare size={26} />
              <span className="floating-chat-badge-dot"></span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;

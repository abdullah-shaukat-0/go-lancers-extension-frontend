import React, { useState, useEffect } from "react";
import { request } from "../services/api";
import { Receipt, Plus, Check, CreditCard } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Billing: React.FC = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  
  // Manual Invoice Generation
  const [targetPatientId, setTargetPatientId] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");

  // Payment checkout states
  const [paymentBill, setPaymentBill] = useState<any | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isPatient = user?.role.toLowerCase() === "patient";
  const canManage = user?.role.toLowerCase() === "admin" || user?.role.toLowerCase() === "nurse";

  const fetchBillingRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let queryStr = "";
      if (isPatient) {
        queryStr = `?patientId=${user.profileId}`;
      }

      const billsData = await request(`/billing${queryStr}`);
      setBills(billsData);

      if (canManage) {
        const patientsData = await request("/patients");
        setPatients(patientsData);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch billing/invoicing statements.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingRecords();
  }, []);

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPatientId || !chargeAmount) return;

    try {
      setError(null);
      setSuccess(null);
      await request("/billing", {
        method: "POST",
        body: JSON.stringify({
          patientId: parseInt(targetPatientId),
          amount: parseFloat(chargeAmount)
        })
      });

      setSuccess("Custom invoice generated successfully.");
      setTargetPatientId("");
      setChargeAmount("");
      fetchBillingRecords();
    } catch (err: any) {
      setError(err.message || "Failed to generate manual invoice.");
    }
  };

  const handlePayInvoice = async (billId: number) => {
    try {
      setError(null);
      setSuccess(null);
      await request(`/billing/${billId}/pay`, {
        method: "PUT"
      });

      setSuccess(isPatient ? "Payment processed successfully!" : "Invoice marked as paid.");
      fetchBillingRecords();
    } catch (err: any) {
      setError(err.message || "Failed to process payment.");
    }
  };

  const handlePayClick = (bill: any) => {
    if (isPatient) {
      setPaymentBill(bill);
      setCardNumber("");
      setCardName(user?.fullName || "");
      setCardExpiry("");
      setCardCvv("");
      setIsProcessing(false);
      setPaymentSuccess(false);
    } else {
      handlePayInvoice(bill.id || bill.Id);
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
    setCardNumber(formatted.substring(0, 19));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\//g, '').replace(/[^0-9]/gi, '');
    let formatted = value;
    if (value.length > 2) {
      formatted = `${value.substring(0, 2)}/${value.substring(2, 4)}`;
    }
    setCardExpiry(formatted.substring(0, 5));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/gi, '');
    setCardCvv(value.substring(0, 3));
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentBill) return;

    setIsProcessing(true);
    setError(null);
    
    // Simulate gateway delay
    setTimeout(async () => {
      try {
        await request(`/billing/${paymentBill.id || paymentBill.Id}/pay`, {
          method: "PUT"
        });
        
        setIsProcessing(false);
        setPaymentSuccess(true);
        
        setTimeout(() => {
          setPaymentBill(null);
          fetchBillingRecords();
          setSuccess("Secure payment of $" + (paymentBill.amount || paymentBill.Amount).toFixed(2) + " authorized successfully.");
        }, 1800);
      } catch (err: any) {
        setIsProcessing(false);
        setError(err.message || "Payment authorization failed.");
        setPaymentBill(null);
      }
    }, 2200);
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <span className="badge badge-info">Syncing invoicing records...</span>
      </div>
    );
  }

  // Calculate unpaid balances
  const pendingTotal = bills
    .filter(b => (b.paymentStatus || b.PaymentStatus) === "Pending")
    .reduce((sum, b) => sum + (b.amount || b.Amount), 0);

  return (
    <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: canManage ? "1fr 1fr" : "1fr", gap: "30px" }}>
      
      {/* Messages */}
      <div style={{ gridColumn: canManage ? "span 2" : "span 1" }}>
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

      {/* Patient view - Unpaid balance banner */}
      {isPatient && pendingTotal > 0 && (
        <div className="glass-panel" style={{ 
          gridColumn: "span 1", 
          padding: "20px 30px", 
          background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(245, 158, 11, 0.05))",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <h4 style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 500 }}>Outstanding Balance</h4>
            <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--danger)" }}>${pendingTotal.toFixed(2)}</span>
          </div>
          <div className="badge badge-danger" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <Receipt size={14} />
            <span>Awaiting Payment</span>
          </div>
        </div>
      )}

      {/* LEFT: Manual invoice creation (Only Staff) */}
      {canManage && (
        <div className="glass-panel" style={{ padding: "30px", height: "fit-content" }}>
          <h3 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <Receipt style={{ color: "var(--accent-secondary)" }} />
            <span>Generate Patient Invoice</span>
          </h3>

          <form onSubmit={handleGenerateInvoice} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label>Select Patient</label>
              <select 
                required
                value={targetPatientId}
                onChange={(e) => setTargetPatientId(e.target.value)}
              >
                <option value="">-- Choose Patient --</option>
                {patients.map((p) => (
                  <option key={p.id || p.Id} value={p.id || p.Id}>
                    {p.user?.fullName || p.User?.FullName} (ID: {p.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Service / Consultation Amount ($)</label>
              <input 
                type="number" 
                step="0.01"
                required
                placeholder="e.g. 150.00" 
                value={chargeAmount}
                onChange={(e) => setChargeAmount(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: "10px" }}>
              <Plus size={18} />
              <span>Issue Invoice</span>
            </button>
          </form>
        </div>
      )}

      {/* RIGHT / MAIN: Invoices List */}
      <div className="glass-panel" style={{ padding: "30px" }}>
        <h3 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <Receipt style={{ color: "var(--accent-purple)" }} />
          <span>{isPatient ? "My Billing Statements" : "Hospital Ledger Invoices"}</span>
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {bills.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "30px 0" }}>
              No billing statements found.
            </p>
          ) : (
            bills.map((bill) => {
              const dateGen = new Date(bill.dateGenerated || bill.DateGenerated).toLocaleDateString();
              const status = bill.paymentStatus || bill.PaymentStatus;
              const isPending = status.toLowerCase() === "pending";
              const billId = bill.id || bill.Id;

              return (
                <div 
                  key={billId} 
                  style={{
                    padding: "16px 20px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "15px"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>${(bill.amount || bill.Amount).toFixed(2)}</span>
                      <span className={`badge ${isPending ? "badge-warning" : "badge-success"}`}>
                        {status}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                      {canManage && `Patient: ${bill.patient?.user?.fullName || "Patient"} • `}
                      Issued: {dateGen} 
                      {bill.appointment && ` • Consultation Ref #${bill.appointmentId}`}
                    </div>
                  </div>

                  {isPending && (
                    <button 
                      onClick={() => handlePayClick(bill)}
                      className="btn btn-primary"
                      style={{ 
                        padding: "8px 14px", 
                        fontSize: "0.8rem", 
                        display: "flex", 
                        gap: "6px",
                        background: isPatient ? "linear-gradient(135deg, var(--success), #059669)" : undefined,
                        boxShadow: isPatient ? "0 4px 12px rgba(16, 185, 129, 0.2)" : undefined
                      }}
                    >
                      {isPatient ? (
                        <>
                          <CreditCard size={14} />
                          <span>Pay Now</span>
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          <span>Collect Payment</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Checkout Gateway Modal */}
      {paymentBill && (
        <div className="checkout-modal-overlay">
          <div className="glass-panel" style={{ padding: "30px", width: "100%", maxWidth: "420px", position: "relative" }}>
            
            {/* 1. Processing Overlay */}
            {isProcessing && (
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "rgba(6, 9, 19, 0.9)",
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "20px",
                zIndex: 10
              }}>
                <div className="spin-loader"></div>
                <div style={{ textAlign: "center" }}>
                  <h4 style={{ fontWeight: 600, fontSize: "1rem" }}>Authorizing Secure Charge...</h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "4px" }}>Contacting SHMS banking gateway...</p>
                </div>
              </div>
            )}

            {/* 2. Success Overlay */}
            {paymentSuccess && (
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "rgba(6, 9, 19, 0.95)",
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                zIndex: 10
              }}>
                <div className="success-checkmark-circle">
                  <Check size={36} />
                </div>
                <h3 style={{ color: "var(--success)", fontWeight: 700 }}>Payment Authorized!</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>Reference Code: txn_{Math.random().toString(36).substring(2, 9)}</p>
              </div>
            )}

            {/* Main Form Content */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.2rem" }}>
                <CreditCard size={20} style={{ color: "var(--accent-secondary)" }} />
                <span>Pay Invoices Checkout</span>
              </h3>
              <span className="badge badge-info">${(paymentBill.amount || paymentBill.Amount).toFixed(2)}</span>
            </div>

            {/* Card Preview Card */}
            <div className="checkout-card-preview">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="card-preview-chip"></div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700, fontFamily: "sans-serif" }}>
                  {cardNumber.startsWith("4") ? "VISA" : cardNumber.startsWith("5") ? "MASTERCARD" : "SECURE PAY"}
                </span>
              </div>
              <div className="card-preview-number">
                {cardNumber || "•••• •••• •••• ••••"}
              </div>
              <div className="card-preview-meta">
                <div>
                  <div className="card-meta-label">Card Holder</div>
                  <div className="card-meta-value">{cardName.toUpperCase() || "NAME SURNAME"}</div>
                </div>
                <div>
                  <div className="card-meta-label">Expires</div>
                  <div className="card-meta-value">{cardExpiry || "MM/YY"}</div>
                </div>
              </div>
            </div>

            {/* Inputs Form */}
            <form onSubmit={handlePaymentSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label>Cardholder Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                />
              </div>

              <div>
                <label>Card Number</label>
                <input 
                  type="text" 
                  required
                  placeholder="4000 1234 5678 9010"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label>Expiry Date</label>
                  <input 
                    type="text" 
                    required
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={handleExpiryChange}
                  />
                </div>
                <div>
                  <label>CVV / CVC Code</label>
                  <input 
                    type="password" 
                    required
                    placeholder="•••"
                    value={cardCvv}
                    onChange={handleCvvChange}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "15px" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setPaymentBill(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  Pay Securely ${(paymentBill.amount || paymentBill.Amount).toFixed(2)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;

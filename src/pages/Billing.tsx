import React, { useEffect, useMemo, useState } from "react";
import { request } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Banknote,
  Check,
  CreditCard,
  FileText,
  Plus,
  Receipt,
  RefreshCw,
  WalletCards,
} from "lucide-react";

type BillStatus = "Pending" | "Paid" | "Cancelled";

interface BillItem {
  id?: number;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
  hospitalService?: HospitalService;
}

interface Bill {
  id: number;
  invoiceNumber?: string;
  amount: number;
  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  paymentStatus: BillStatus;
  dateGenerated: string;
  datePaid?: string;
  notes?: string;
  appointmentId?: number;
  patient?: {
    id: number;
    user?: {
      fullName?: string;
    };
  };
  appointment?: {
    id: number;
    doctor?: {
      user?: {
        fullName?: string;
      };
    };
  };
  items?: BillItem[];
}

interface HospitalService {
  id: number;
  name: string;
  category: string;
  price: number;
  isActive: boolean;
}

interface Expense {
  id: number;
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
  notes?: string;
}

interface BillingStats {
  totalRevenue: number;
  pendingAmount: number;
  cancelledAmount: number;
  totalExpenses: number;
  netIncome: number;
  totalInvoiceCount: number;
  paidInvoiceCount: number;
  pendingInvoiceCount: number;
}

const currency = (value?: number) => `$${Number(value || 0).toFixed(2)}`;

export const Billing: React.FC = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [services, setServices] = useState<HospitalService[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);

  const [targetPatientId, setTargetPatientId] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [invoiceDescription, setInvoiceDescription] = useState("Manual hospital service");
  const [invoiceNotes, setInvoiceNotes] = useState("");

  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceCategory, setNewServiceCategory] = useState("General");
  const [newServicePrice, setNewServicePrice] = useState("");

  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Operations");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseNotes, setExpenseNotes] = useState("");

  const [activeTab, setActiveTab] = useState<"invoices" | "expenses" | "services">("invoices");
  const [paymentBill, setPaymentBill] = useState<Bill | null>(null);
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const role = user?.role.toLowerCase();
  const isPatient = role === "patient";
  const canManage = role === "admin" || role === "nurse";

  const fetchBillingData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const billsData = await request(isPatient ? `/billing/patient/${user?.profileId}` : "/billing");
      setBills(billsData);

      if (canManage) {
        const [patientsData, servicesData, expensesData, statsData] = await Promise.all([
          request("/patients"),
          request("/billing/services"),
          request("/billing/expenses"),
          request("/billing/stats"),
        ]);

        setPatients(patientsData);
        setServices(servicesData);
        setExpenses(expensesData);
        setStats(statsData);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load billing records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const pendingTotal = useMemo(
    () => bills.filter((bill) => bill.paymentStatus === "Pending").reduce((sum, bill) => sum + bill.amount, 0),
    [bills]
  );

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPatientId || !chargeAmount) return;

    try {
      setError(null);
      setSuccess(null);
      await request("/billing", {
        method: "POST",
        body: JSON.stringify({
          patientId: Number(targetPatientId),
          amount: Number(chargeAmount),
          description: invoiceDescription,
          notes: invoiceNotes,
        }),
      });

      setSuccess("Invoice created.");
      setTargetPatientId("");
      setChargeAmount("");
      setInvoiceDescription("Manual hospital service");
      setInvoiceNotes("");
      fetchBillingData();
    } catch (err: any) {
      setError(err.message || "Failed to create invoice.");
    }
  };

  const handleStatusChange = async (billId: number, paymentStatus: BillStatus) => {
    try {
      setError(null);
      setSuccess(null);
      await request(`/billing/${billId}/status`, {
        method: "PUT",
        body: JSON.stringify({ paymentStatus }),
      });
      setSuccess(`Invoice marked as ${paymentStatus.toLowerCase()}.`);
      fetchBillingData();
    } catch (err: any) {
      setError(err.message || "Failed to update invoice status.");
    }
  };

  const handlePayInvoice = async (bill: Bill) => {
    if (isPatient) {
      setPaymentBill(bill);
      setCardName(user?.fullName || "");
      setCardNumber("");
      setCardExpiry("");
      setCardCvv("");
      return;
    }

    handleStatusChange(bill.id, "Paid");
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentBill) return;

    setIsProcessing(true);
    try {
      await request(`/billing/${paymentBill.id}/pay`, { method: "PUT" });
      setPaymentBill(null);
      setSuccess(`Payment completed for ${paymentBill.invoiceNumber || `invoice #${paymentBill.id}`}.`);
      fetchBillingData();
    } catch (err: any) {
      setError(err.message || "Payment failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      await request("/billing/services", {
        method: "POST",
        body: JSON.stringify({
          name: newServiceName,
          category: newServiceCategory,
          price: Number(newServicePrice),
        }),
      });

      setSuccess("Service added.");
      setNewServiceName("");
      setNewServiceCategory("General");
      setNewServicePrice("");
      fetchBillingData();
    } catch (err: any) {
      setError(err.message || "Failed to add service.");
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      await request("/expenses", {
        method: "POST",
        body: JSON.stringify({
          title: expenseTitle,
          category: expenseCategory,
          amount: Number(expenseAmount),
          expenseDate: new Date(expenseDate).toISOString(),
          notes: expenseNotes,
        }),
      });

      setSuccess("Expense saved.");
      setExpenseTitle("");
      setExpenseCategory("Operations");
      setExpenseAmount("");
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setExpenseNotes("");
      fetchBillingData();
    } catch (err: any) {
      setError(err.message || "Failed to save expense.");
    }
  };

  const handleDeleteExpense = async (expenseId: number) => {
    try {
      setError(null);
      setSuccess(null);
      await request(`/expenses/${expenseId}`, { method: "DELETE" });
      setSuccess("Expense deleted.");
      fetchBillingData();
    } catch (err: any) {
      setError(err.message || "Failed to delete expense.");
    }
  };

  const handleCardNumberChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    setCardNumber(digits.match(/.{1,4}/g)?.join(" ") || digits);
  };

  const handleExpiryChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setCardExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <span className="badge badge-info">Loading billing records...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {(error || success) && (
        <div>
          {error && <div className="badge-danger" style={{ padding: "12px", borderRadius: "8px" }}>{error}</div>}
          {success && <div className="badge-success" style={{ padding: "12px", borderRadius: "8px" }}>{success}</div>}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button className={activeTab === "invoices" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setActiveTab("invoices")}>
            <Receipt size={16} />
            <span>Invoices</span>
          </button>
          {canManage && (
            <>
              <button className={activeTab === "expenses" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setActiveTab("expenses")}>
                <Banknote size={16} />
                <span>Expenses</span>
              </button>
              <button className={activeTab === "services" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setActiveTab("services")}>
                <WalletCards size={16} />
                <span>Services</span>
              </button>
            </>
          )}
        </div>

        <button className="btn btn-secondary" onClick={fetchBillingData}>
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {canManage && stats && (
        <div className="card-grid">
          <MetricCard label="Paid Revenue" value={currency(stats.totalRevenue)} />
          <MetricCard label="Pending Bills" value={currency(stats.pendingAmount)} tone="warning" />
          <MetricCard label="Expenses" value={currency(stats.totalExpenses)} tone="danger" />
          <MetricCard label="Net Income" value={currency(stats.netIncome)} tone={stats.netIncome >= 0 ? "success" : "danger"} />
        </div>
      )}

      {isPatient && pendingTotal > 0 && (
        <div className="glass-panel" style={{ padding: "22px", display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}>Outstanding Balance</div>
            <div style={{ color: "var(--danger)", fontSize: "2rem", fontWeight: 800 }}>{currency(pendingTotal)}</div>
          </div>
          <span className="badge badge-danger">Payment pending</span>
        </div>
      )}

      {activeTab === "invoices" && (
        <div style={{ display: "grid", gridTemplateColumns: canManage ? "360px 1fr" : "1fr", gap: "24px", alignItems: "start" }}>
          {canManage && (
            <div className="glass-panel" style={{ padding: "24px" }}>
              <h3 style={{ marginBottom: "18px", display: "flex", alignItems: "center", gap: "10px" }}>
                <FileText size={20} style={{ color: "var(--accent-secondary)" }} />
                <span>Create Invoice</span>
              </h3>
              <form onSubmit={handleGenerateInvoice} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label>Patient</label>
                  <select required value={targetPatientId} onChange={(e) => setTargetPatientId(e.target.value)}>
                    <option value="">Choose patient</option>
                    {patients.map((patient) => (
                      <option key={patient.id || patient.Id} value={patient.id || patient.Id}>
                        {patient.user?.fullName || patient.User?.FullName || `Patient #${patient.id || patient.Id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Description</label>
                  <input value={invoiceDescription} onChange={(e) => setInvoiceDescription(e.target.value)} required />
                </div>
                <div>
                  <label>Amount</label>
                  <input type="number" step="0.01" min="0.01" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} required />
                </div>
                <div>
                  <label>Notes</label>
                  <textarea rows={3} value={invoiceNotes} onChange={(e) => setInvoiceNotes(e.target.value)} />
                </div>
                <button className="btn btn-primary" type="submit">
                  <Plus size={16} />
                  <span>Issue Invoice</span>
                </button>
              </form>
            </div>
          )}

          <InvoiceList bills={bills} canManage={canManage} isPatient={isPatient} onPay={handlePayInvoice} onStatusChange={handleStatusChange} />
        </div>
      )}

      {activeTab === "expenses" && canManage && (
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "24px", alignItems: "start" }}>
          <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 style={{ marginBottom: "18px", display: "flex", alignItems: "center", gap: "10px" }}>
              <Banknote size={20} style={{ color: "var(--accent-secondary)" }} />
              <span>Add Expense</span>
            </h3>
            <form onSubmit={handleCreateExpense} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label>Title</label>
                <input value={expenseTitle} onChange={(e) => setExpenseTitle(e.target.value)} required />
              </div>
              <div>
                <label>Category</label>
                <input value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} required />
              </div>
              <div>
                <label>Amount</label>
                <input type="number" step="0.01" min="0.01" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} required />
              </div>
              <div>
                <label>Date</label>
                <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required />
              </div>
              <div>
                <label>Notes</label>
                <textarea rows={3} value={expenseNotes} onChange={(e) => setExpenseNotes(e.target.value)} />
              </div>
              <button className="btn btn-primary" type="submit">
                <Plus size={16} />
                <span>Save Expense</span>
              </button>
            </form>
          </div>

          <div className="glass-panel" style={{ overflowX: "auto" }}>
            <DataTable
              headers={["Title", "Category", "Date", "Amount", "Actions"]}
              emptyText="No expenses found."
              rows={expenses.map((expense) => [
                expense.title,
                <span className="badge badge-info">{expense.category}</span>,
                new Date(expense.expenseDate).toLocaleDateString(),
                currency(expense.amount),
                <button className="btn btn-danger" style={{ padding: "6px 12px", fontSize: "0.8rem" }} onClick={() => handleDeleteExpense(expense.id)}>
                  Delete
                </button>,
              ])}
            />
          </div>
        </div>
      )}

      {activeTab === "services" && canManage && (
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "24px", alignItems: "start" }}>
          <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 style={{ marginBottom: "18px", display: "flex", alignItems: "center", gap: "10px" }}>
              <WalletCards size={20} style={{ color: "var(--accent-secondary)" }} />
              <span>Add Service</span>
            </h3>
            <form onSubmit={handleCreateService} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label>Service Name</label>
                <input value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} required />
              </div>
              <div>
                <label>Category</label>
                <input value={newServiceCategory} onChange={(e) => setNewServiceCategory(e.target.value)} required />
              </div>
              <div>
                <label>Price</label>
                <input type="number" step="0.01" min="0" value={newServicePrice} onChange={(e) => setNewServicePrice(e.target.value)} required />
              </div>
              <button className="btn btn-primary" type="submit">
                <Plus size={16} />
                <span>Add Service</span>
              </button>
            </form>
          </div>

          <div className="glass-panel" style={{ overflowX: "auto" }}>
            <DataTable
              headers={["Service", "Category", "Price", "Status"]}
              emptyText="No services found."
              rows={services.map((service) => [
                service.name,
                <span className="badge badge-info">{service.category}</span>,
                currency(service.price),
                <span className={service.isActive ? "badge badge-success" : "badge badge-danger"}>
                  {service.isActive ? "Active" : "Inactive"}
                </span>,
              ])}
            />
          </div>
        </div>
      )}

      {paymentBill && (
        <div className="checkout-modal-overlay">
          <div className="glass-panel" style={{ padding: "30px", width: "100%", maxWidth: "420px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.15rem" }}>
                <CreditCard size={20} style={{ color: "var(--accent-secondary)" }} />
                <span>Pay Invoice</span>
              </h3>
              <span className="badge badge-info">{currency(paymentBill.amount)}</span>
            </div>

            <form onSubmit={handlePaymentSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label>Cardholder Name</label>
                <input value={cardName} onChange={(e) => setCardName(e.target.value)} required />
              </div>
              <div>
                <label>Card Number</label>
                <input value={cardNumber} onChange={(e) => handleCardNumberChange(e.target.value)} placeholder="4000 1234 5678 9010" required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label>Expiry</label>
                  <input value={cardExpiry} onChange={(e) => handleExpiryChange(e.target.value)} placeholder="MM/YY" required />
                </div>
                <div>
                  <label>CVV</label>
                  <input value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 3))} required />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setPaymentBill(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isProcessing}>
                  {isProcessing ? "Processing..." : "Pay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; tone?: "success" | "warning" | "danger" }> = ({ label, value, tone }) => (
  <div className="glass-panel metric-card">
    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: "1.65rem", fontWeight: 800, color: tone ? `var(--${tone})` : "var(--text-primary)" }}>{value}</div>
  </div>
);

const InvoiceList: React.FC<{
  bills: Bill[];
  canManage: boolean;
  isPatient: boolean;
  onPay: (bill: Bill) => void;
  onStatusChange: (billId: number, status: BillStatus) => void;
}> = ({ bills, canManage, isPatient, onPay, onStatusChange }) => (
  <div className="glass-panel" style={{ padding: "24px" }}>
    <h3 style={{ marginBottom: "18px", display: "flex", alignItems: "center", gap: "10px" }}>
      <Receipt size={20} style={{ color: "var(--accent-purple)" }} />
      <span>{isPatient ? "My Invoices" : "Invoices"}</span>
    </h3>

    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {bills.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "30px 0" }}>No invoices found.</p>
      ) : (
        bills.map((bill) => {
          const isPending = bill.paymentStatus === "Pending";
          const statusClass = bill.paymentStatus === "Paid" ? "badge-success" : bill.paymentStatus === "Cancelled" ? "badge-danger" : "badge-warning";
          return (
            <div key={bill.id} style={{ padding: "18px", borderRadius: "10px", background: "var(--surface-soft)", border: "1px solid var(--panel-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <strong>{bill.invoiceNumber || `Invoice #${bill.id}`}</strong>
                    <span className={`badge ${statusClass}`}>{bill.paymentStatus}</span>
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "5px" }}>
                    {canManage && `${bill.patient?.user?.fullName || "Patient"} | `}
                    Issued {new Date(bill.dateGenerated).toLocaleDateString()}
                    {bill.appointmentId ? ` | Appointment #${bill.appointmentId}` : ""}
                  </div>
                </div>
                <div style={{ fontSize: "1.35rem", fontWeight: 800 }}>{currency(bill.amount)}</div>
              </div>

              {bill.items && bill.items.length > 0 && (
                <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {bill.items.map((item, index) => (
                    <div key={item.id || index} style={{ display: "flex", justifyContent: "space-between", gap: "12px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      <span>{item.description || "Invoice item"} x {item.quantity || 1}</span>
                      <span>{currency(item.lineTotal)}</span>
                    </div>
                  ))}
                </div>
              )}

              {(isPending || canManage) && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px", flexWrap: "wrap" }}>
                  {isPending && (
                    <button className="btn btn-primary" style={{ padding: "8px 14px", fontSize: "0.82rem" }} onClick={() => onPay(bill)}>
                      {isPatient ? <CreditCard size={14} /> : <Check size={14} />}
                      <span>{isPatient ? "Pay" : "Mark Paid"}</span>
                    </button>
                  )}
                  {canManage && bill.paymentStatus !== "Cancelled" && (
                    <button className="btn btn-secondary" style={{ padding: "8px 14px", fontSize: "0.82rem" }} onClick={() => onStatusChange(bill.id, "Cancelled")}>
                      Cancel
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
);

const DataTable: React.FC<{ headers: string[]; rows: React.ReactNode[][]; emptyText: string }> = ({ headers, rows, emptyText }) => (
  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
    <thead>
      <tr style={{ borderBottom: "1px solid var(--panel-border)" }}>
        {headers.map((header) => (
          <th key={header} style={{ padding: "16px 20px" }}>{header}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.length === 0 ? (
        <tr>
          <td colSpan={headers.length} style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)" }}>{emptyText}</td>
        </tr>
      ) : (
        rows.map((row, rowIndex) => (
          <tr key={rowIndex} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} style={{ padding: "16px 20px" }}>{cell}</td>
            ))}
          </tr>
        ))
      )}
    </tbody>
  </table>
);

export default Billing;

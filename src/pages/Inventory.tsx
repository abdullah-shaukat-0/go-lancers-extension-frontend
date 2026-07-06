import React, { useState, useEffect } from "react";
import { request } from "../services/api";
import { Plus, ShieldAlert, Check, Filter } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Inventory: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Item Form
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Medicine");
  const [quantity, setQuantity] = useState("0");
  const [thresholdValue, setThresholdValue] = useState("10");
  const [price, setPrice] = useState("0.00");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [newStockVal, setNewStockVal] = useState<string>("");

  const { user } = useAuth();
  const canEdit = user?.role.toLowerCase() === "admin" || user?.role.toLowerCase() === "nurse";

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const data = await request("/inventory");
      setItems(data);
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch inventory stock.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await request("/inventory", {
        method: "POST",
        body: JSON.stringify({
          name,
          category,
          quantity: parseInt(quantity),
          thresholdValue: parseInt(thresholdValue),
          price: parseFloat(price)
        })
      });

      // Reset fields
      setName("");
      setQuantity("0");
      setThresholdValue("10");
      setPrice("0.00");
      setIsModalOpen(false);
      fetchInventory();
    } catch (err: any) {
      setError(err.message || "Failed to create inventory item.");
    }
  };

  const handleUpdateStock = async (itemId: number) => {
    if (!newStockVal) return;
    try {
      await request(`/inventory/${itemId}/stock`, {
        method: "PUT",
        body: JSON.stringify({ quantity: parseInt(newStockVal) })
      });
      setUpdatingItemId(null);
      setNewStockVal("");
      fetchInventory();
    } catch (err: any) {
      setError(err.message || "Failed to update stock quantity.");
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <span className="badge badge-info">Fetching inventory records...</span>
      </div>
    );
  }

  const filteredItems = filterCategory === "All" 
    ? items 
    : items.filter(item => (item.category || item.Category) === filterCategory);

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
      
      {error && (
        <div className="badge-danger" style={{ padding: "12px", borderRadius: "8px" }}>
          <span>{error}</span>
        </div>
      )}

      {/* Control bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Filter size={16} style={{ color: "var(--text-secondary)" }} />
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ width: "160px", padding: "8px 12px" }}
          >
            <option value="All">All Categories</option>
            <option value="Medicine">Medicines</option>
            <option value="Equipment">Equipment</option>
            <option value="Consumable">Consumables</option>
          </select>
        </div>

        {canEdit && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            <span>Add Stock Item</span>
          </button>
        )}
      </div>

      {/* Inventory table */}
      <div className="glass-panel" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--panel-border)" }}>
              <th style={{ padding: "16px 20px" }}>Item Name</th>
              <th style={{ padding: "16px 20px" }}>Category</th>
              <th style={{ padding: "16px 20px" }}>Unit Price</th>
              <th style={{ padding: "16px 20px" }}>Stock Level</th>
              <th style={{ padding: "16px 20px" }}>Status</th>
              {canEdit && <th style={{ padding: "16px 20px", textAlign: "right" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)" }}>
                  No inventory items match the selected criteria.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const qty = item.quantity ?? item.Quantity ?? 0;
                const thresh = item.thresholdValue ?? item.ThresholdValue ?? 0;
                const isLow = qty <= thresh;
                const itemId = item.id ?? item.Id;

                return (
                  <tr key={itemId} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.03)" }}>
                    <td style={{ padding: "16px 20px", fontWeight: 600 }}>{item.name || item.Name}</td>
                    <td style={{ padding: "16px 20px" }}>
                      <span className="badge badge-info">{item.category || item.Category}</span>
                    </td>
                    <td style={{ padding: "16px 20px" }}>${(item.price || item.Price).toFixed(2)}</td>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {updatingItemId === itemId ? (
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <input 
                              type="number" 
                              value={newStockVal}
                              onChange={(e) => setNewStockVal(e.target.value)}
                              placeholder="Qty"
                              style={{ width: "70px", padding: "6px" }}
                            />
                            <button 
                              onClick={() => handleUpdateStock(itemId)}
                              className="btn btn-primary"
                              style={{ padding: "6px 10px" }}
                            >
                              <Check size={14} />
                            </button>
                            <button 
                              onClick={() => setUpdatingItemId(null)}
                              className="btn btn-secondary"
                              style={{ padding: "6px 10px" }}
                            >
                              x
                            </button>
                          </div>
                        ) : (
                          <>
                            <span style={{ fontWeight: 700, color: isLow ? "var(--danger)" : "var(--text-primary)" }}>{qty}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>/ threshold {thresh}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      {isLow ? (
                        <span className="badge badge-danger" style={{ display: "inline-flex", gap: "4px" }}>
                          <ShieldAlert size={12} />
                          <span>Reorder</span>
                        </span>
                      ) : (
                        <span className="badge badge-success">Sufficient</span>
                      )}
                    </td>
                    {canEdit && (
                      <td style={{ padding: "16px 20px", textAlign: "right" }}>
                        {updatingItemId !== itemId && (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                            onClick={() => {
                              setUpdatingItemId(itemId);
                              setNewStockVal(qty.toString());
                            }}
                          >
                            Update Stock
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Item Modal */}
      {isModalOpen && (
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
          <div className="glass-panel" style={{ padding: "30px", width: "100%", maxWidth: "450px" }}>
            <h3 style={{ marginBottom: "20px" }}>Create Inventory Entry</h3>
            
            <form onSubmit={handleAddItem} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label>Item Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Ibuprofen 200mg" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Medicine">Medicine</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Consumable">Consumable</option>
                  </select>
                </div>
                <div>
                  <label>Unit Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label>Initial Quantity</label>
                  <input 
                    type="number" 
                    required 
                    value={quantity} 
                    onChange={(e) => setQuantity(e.target.value)} 
                  />
                </div>
                <div>
                  <label>Warning Threshold</label>
                  <input 
                    type="number" 
                    required 
                    value={thresholdValue} 
                    onChange={(e) => setThresholdValue(e.target.value)} 
                  />
                </div>
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
                >
                  Register Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;

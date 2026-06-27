import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";

export interface Invoice {
  id: string;
  customer: string;
  amount: string;
  status: "Utkast" | "Skickad" | "Betald" | "Förfallen";
  date: string;
}

export function AdminFakturorTab() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceRecordId, setInvoiceRecordId] = useState<string | null>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState<Partial<Invoice>>({
    id: "",
    customer: "",
    amount: "",
    status: "Utkast",
    date: new Date().toISOString().split("T")[0],
  });
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoadingInvoices(true);
    setDbError(false);
    try {
      const { data, error } = await supabase
        .from("admin_invoices")
        .select("id, data")
        .limit(1)
        .maybeSingle();
      if (!error && data) {
         setInvoiceRecordId(data.id);
         setInvoices(data.data as Invoice[]);
      } else {
         throw new Error("No data or error");
      }
    } catch (err) {
      const stored = localStorage.getItem("betong_admin_invoices");
      if (stored) {
        setInvoices(JSON.parse(stored));
      } else {
        setInvoices([
          { id: "INV-2026-001", customer: "Peab AB", amount: "125 000 kr", status: "Betald", date: "2026-04-15" },
          { id: "INV-2026-002", customer: "Skanska", amount: "89 500 kr", status: "Skickad", date: "2026-05-02" },
          { id: "INV-2026-003", customer: "NCC", amount: "45 000 kr", status: "Förfallen", date: "2026-03-20" },
        ]);
      }
    }
    setLoadingInvoices(false);
  };

  const saveInvoices = async (newInvoices: Invoice[]) => {
    setInvoices(newInvoices);
    localStorage.setItem("betong_admin_invoices", JSON.stringify(newInvoices));
    try {
      if (invoiceRecordId) {
        const { error } = await supabase.from("admin_invoices").update({ data: newInvoices }).eq("id", invoiceRecordId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("admin_invoices").insert({ data: newInvoices }).select("id").single();
        if (data) setInvoiceRecordId(data.id);
        if (error) throw error;
      }
    } catch (err) {
      console.error("Fel vid sparande av fakturor", err);
      setDbError(true);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto relative">
      <h2 className="text-xl font-bold text-gray-800 border-b pb-3 mb-4 flex justify-between items-center">
        <div>
          <i className="fa-solid fa-file-invoice mr-2 text-[var(--blue)]"></i>
          Fakturor
        </div>
        <button
          onClick={() => {
            setEditingInvoiceId(null);
            setInvoiceForm({ id: "", customer: "", amount: "", status: "Utkast", date: new Date().toISOString().split("T")[0] });
            setShowInvoiceModal(true);
          }}
          className="bg-[var(--blue)] text-white px-4 py-2 rounded text-sm font-semibold hover:bg-blue-600 transition-colors"
        >
          <i className="fa-solid fa-plus mr-2"></i>Skapa Ny Faktura
        </button>
      </h2>

      {loadingInvoices ? (
        <div className="py-10 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-[var(--blue)]"></i></div>
      ) : (
        <div className="bg-white border text-left border-[var(--border)] rounded-lg shadow-sm overflow-hidden mb-8">
          {invoices.length === 0 ? (
             <div className="p-8 text-center text-gray-500">Inga fakturor funna.</div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm text-left text-gray-500 min-w-[700px]">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                  <tr>
                    <th scope="col" className="px-6 py-3">Fakturanummer</th>
                    <th scope="col" className="px-6 py-3">Kund</th>
                    <th scope="col" className="px-6 py-3">Datum</th>
                    <th scope="col" className="px-6 py-3">Belopp</th>
                    <th scope="col" className="px-6 py-3">Status</th>
                    <th scope="col" className="px-6 py-3 text-right">Åtgärd</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, idx) => (
                    <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{inv.id}</td>
                      <td className="px-6 py-4">{inv.customer}</td>
                      <td className="px-6 py-4">{inv.date}</td>
                      <td className="px-6 py-4 font-semibold">{inv.amount}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          inv.status === "Betald" ? "bg-green-100 text-green-800" :
                          inv.status === "Förfallen" ? "bg-red-100 text-red-800" :
                          inv.status === "Skickad" ? "bg-blue-100 text-blue-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setEditingInvoiceId(inv.id);
                            setInvoiceForm(inv);
                            setShowInvoiceModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium mr-4"
                        >
                          Redigera
                        </button>
                        <button
                          onClick={() => saveInvoices(invoices.filter(i => i.id !== inv.id))}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Ta bort
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">{editingInvoiceId ? "Redigera Faktura" : "Skapa Faktura"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fakturanummer</label>
                <input
                  type="text"
                  className="w-full border rounded p-2 text-sm"
                  value={invoiceForm.id}
                  onChange={e => setInvoiceForm({...invoiceForm, id: e.target.value})}
                  placeholder="T.ex. INV-2026-005"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kund</label>
                <input
                  type="text"
                  className="w-full border rounded p-2 text-sm"
                  value={invoiceForm.customer}
                  onChange={e => setInvoiceForm({...invoiceForm, customer: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Belopp</label>
                <input
                  type="text"
                  className="w-full border rounded p-2 text-sm"
                  value={invoiceForm.amount}
                  onChange={e => setInvoiceForm({...invoiceForm, amount: e.target.value})}
                  placeholder="T.ex. 100 000 kr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full border rounded p-2 text-sm"
                  value={invoiceForm.status}
                  onChange={e => setInvoiceForm({...invoiceForm, status: e.target.value as any})}
                >
                  <option value="Utkast">Utkast</option>
                  <option value="Skickad">Skickad</option>
                  <option value="Betald">Betald</option>
                  <option value="Förfallen">Förfallen</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                <input
                  type="date"
                  className="w-full border rounded p-2 text-sm"
                  value={invoiceForm.date}
                  onChange={e => setInvoiceForm({...invoiceForm, date: e.target.value})}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 border rounded font-medium text-gray-700 hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={() => {
                  if (!invoiceForm.id || !invoiceForm.customer) {
                    alert("Fyll i fakturanummer och kund");
                    return;
                  }
                  if (editingInvoiceId) {
                    saveInvoices(invoices.map(i => i.id === editingInvoiceId ? invoiceForm as Invoice : i));
                  } else {
                    saveInvoices([...invoices, invoiceForm as Invoice]);
                  }
                  setShowInvoiceModal(false);
                }}
                className="px-4 py-2 bg-[var(--blue)] text-white rounded font-medium hover:bg-blue-600"
              >
                {editingInvoiceId ? "Spara" : "Skapa"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 md:p-8 p-6 text-center rounded-lg shadow-sm mt-8">
        <h3 className="text-lg font-semibold text-[var(--blue)] mb-2">
          Integrationer med affärssystem
        </h3>
        <p className="text-gray-600 max-w-md mx-auto mb-6">
          Logiken för att automatiskt skicka fakturor till system som Fortnox och Visma eEkonomi är under utveckling.
        </p>
        <div className="flex gap-4 justify-center">
          <button className="px-4 py-2 border border-gray-300 bg-white rounded font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <i className="fa-solid fa-plug"></i> Koppla Fortnox
          </button>
        </div>
      </div>
    </div>
  );
}

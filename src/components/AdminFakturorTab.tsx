import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";

interface Company {
  id: string;
  name: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price_month: number;
}

interface Subscription {
  company_id: string;
  plan_id: string;
  status: string;
  period_end: string | null;
}

export interface InvoiceTotal {
  id: string;
  company_id: string;
  invoice_nr: string;
  status: "utkast" | "skickad" | "betald" | "forfallen" | "krediterad";
  issue_date: string;
  due_date: string | null;
  currency: string;
  vat_rate: number;
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
  company_name?: string;
}

interface InvoiceLineForm {
  id?: string;
  description: string;
  qty: number;
  unit_price: number;
}

interface InvoiceForm {
  id?: string;
  company_id: string;
  invoice_nr: string;
  status: "utkast" | "skickad" | "betald" | "forfallen" | "krediterad";
  issue_date: string;
  due_date: string;
  currency: string;
  vat_rate: number;
  note: string;
  lines: InvoiceLineForm[];
}

export function AdminFakturorTab() {
  const [invoices, setInvoices] = useState<InvoiceTotal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InvoiceForm>({
    company_id: "",
    invoice_nr: "",
    status: "utkast",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    currency: "SEK",
    vat_rate: 0.25,
    note: "",
    lines: []
  });
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [compRes, invRes, plansRes, subsRes] = await Promise.all([
        supabase.from("companies").select("id, name"),
        supabase.from("invoice_totals").select("*").order("created_at", { ascending: false }),
        supabase.from("subscription_plans").select("*"),
        supabase.from("subscriptions").select("*")
      ]);

      if (compRes.data) setCompanies(compRes.data);
      if (plansRes.data) setPlans(plansRes.data);
      if (subsRes.data) setSubscriptions(subsRes.data);

      if (invRes.data) {
        const merged = invRes.data.map(inv => ({
          ...inv,
          company_name: compRes.data?.find(c => c.id === inv.company_id)?.name || "Okänt företag"
        }));
        setInvoices(merged);
      }
    } catch (err) {
      // warning removed
    }
    setLoading(false);
  };

  const generateInvoiceNr = () => {
    const year = new Date().getFullYear();
    const prefix = `FAKT-${year}-`;
    const yearInvoices = invoices.filter(i => i.invoice_nr.startsWith(prefix));
    
    let maxNr = 0;
    yearInvoices.forEach(i => {
      const parts = i.invoice_nr.split("-");
      if (parts.length === 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxNr) maxNr = num;
      }
    });
    
    return `${prefix}${(maxNr + 1).toString().padStart(3, "0")}`;
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      company_id: "",
      invoice_nr: generateInvoiceNr(),
      status: "utkast",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      currency: "SEK",
      vat_rate: 0.25,
      note: "",
      lines: [{ description: "", qty: 1, unit_price: 0 }]
    });
    setShowModal(true);
  };

  const openEditModal = async (inv: InvoiceTotal) => {
    setEditingId(inv.id);
    
    // Fetch lines
    const { data: linesData } = await supabase
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", inv.id)
      .order("sort_order", { ascending: true });
      
    setForm({
      id: inv.id,
      company_id: inv.company_id,
      invoice_nr: inv.invoice_nr,
      status: inv.status,
      issue_date: inv.issue_date,
      due_date: inv.due_date || "",
      currency: inv.currency,
      vat_rate: inv.vat_rate,
      note: "",
      lines: linesData ? linesData.map(l => ({
        id: l.id,
        description: l.description,
        qty: l.qty,
        unit_price: l.unit_price
      })) : []
    });
    
    setShowModal(true);
  };

  const saveInvoice = async () => {
    if (!form.company_id) {
      alert("Välj ett företag");
      return;
    }
    if (!form.invoice_nr) {
      alert("Ange fakturanummer");
      return;
    }
    if (form.lines.length === 0) {
      alert("Minst en fakturarad krävs");
      return;
    }

    try {
      let invoiceId = form.id;
      
      const invoiceData = {
        company_id: form.company_id,
        invoice_nr: form.invoice_nr,
        status: form.status,
        issue_date: form.issue_date,
        due_date: form.due_date || null,
        currency: form.currency,
        vat_rate: form.vat_rate,
        note: form.note
      };

      if (invoiceId) {
        const { error } = await supabase.from("invoices").update(invoiceData).eq("id", invoiceId);
        if (error) throw error;
        
        // delete old lines
        await supabase.from("invoice_lines").delete().eq("invoice_id", invoiceId);
      } else {
        const { data, error } = await supabase.from("invoices").insert([invoiceData]).select("id").single();
        if (error) throw error;
        invoiceId = data.id;
      }

      // insert new lines
      if (invoiceId) {
        const linesToInsert = form.lines.map((l, i) => ({
          invoice_id: invoiceId,
          description: l.description,
          qty: l.qty,
          unit_price: l.unit_price,
          sort_order: i
        }));
        const { error: lineErr } = await supabase.from("invoice_lines").insert(linesToInsert);
        if (lineErr) throw lineErr;
      }

      setShowModal(false);
      loadData();
    } catch (err: any) {
      // warning removed
      alert("Fel vid sparande: " + (err.message || "Okänt fel"));
    }
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm("Är du säker på att du vill ta bort fakturan?")) return;
    try {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
      loadData();
    } catch (err: any) {
      alert("Kunde inte ta bort faktura: " + err.message);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from("invoices").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      loadData();
    } catch (err: any) {
      alert("Kunde inte uppdatera status: " + err.message);
    }
  };

  const handleFillFromSubscription = () => {
    if (!form.company_id) {
      alert("Välj ett företag först");
      return;
    }
    const sub = subscriptions.find(s => s.company_id === form.company_id);
    if (!sub) {
      alert("Företaget har ingen aktiv prenumeration");
      return;
    }
    const plan = plans.find(p => p.id === sub.plan_id);
    if (!plan) return;
    
    const period = sub.period_end ? `t.o.m. ${sub.period_end}` : "löpande";
    
    setForm({
      ...form,
      lines: [
        ...form.lines.filter(l => l.description.trim() !== ""),
        {
          description: `Prenumeration ${plan.name} – ${period}`,
          qty: 1,
          unit_price: plan.price_month
        }
      ]
    });
  };

  const calculateFormTotals = () => {
    const net = form.lines.reduce((sum, l) => sum + (Number(l.qty) * Number(l.unit_price)), 0);
    const vat = net * Number(form.vat_rate);
    const gross = net + vat;
    return { net, vat, gross };
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(val);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "skickad": return "bg-blue-100 text-blue-800";
      case "betald": return "bg-green-100 text-green-800";
      case "forfallen": return "bg-red-100 text-red-800";
      case "krediterad": return "bg-gray-200 text-gray-800";
      default: return "bg-yellow-100 text-yellow-800"; // utkast
    }
  };

  const statusOptions = [
    { value: "utkast", label: "Utkast" },
    { value: "skickad", label: "Skickad" },
    { value: "betald", label: "Betald" },
    { value: "forfallen", label: "Förfallen" },
    { value: "krediterad", label: "Krediterad" },
  ];

  const formTotals = calculateFormTotals();

  return (
    <div className="p-6 max-w-7xl mx-auto relative">
      <h2 className="text-xl font-bold text-gray-800 border-b pb-3 mb-4 flex justify-between items-center">
        <div>
          <i className="fa-solid fa-file-invoice mr-2 text-[var(--blue)]"></i>
          Fakturor
        </div>
        <button
          onClick={openCreateModal}
          className="bg-[var(--blue)] text-white px-4 py-2 rounded text-sm font-semibold hover:bg-blue-600 transition-colors"
        >
          <i className="fa-solid fa-plus mr-2"></i>Skapa Ny Faktura
        </button>
      </h2>

      {loading ? (
        <div className="py-10 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-[var(--blue)]"></i></div>
      ) : (
        <div className="bg-white border text-left border-[var(--border)] rounded-lg shadow-sm overflow-hidden mb-8">
          {invoices.length === 0 ? (
             <div className="p-8 text-center text-gray-500">Inga fakturor funna.</div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm text-left text-gray-500 min-w-[900px]">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                  <tr>
                    <th scope="col" className="px-4 py-3">Fakturanummer</th>
                    <th scope="col" className="px-4 py-3">Företag</th>
                    <th scope="col" className="px-4 py-3">Datum</th>
                    <th scope="col" className="px-4 py-3">Förfaller</th>
                    <th scope="col" className="px-4 py-3 text-right">Netto</th>
                    <th scope="col" className="px-4 py-3 text-right">Moms</th>
                    <th scope="col" className="px-4 py-3 text-right">Brutto</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3 text-right">Åtgärd</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{inv.invoice_nr}</td>
                      <td className="px-4 py-3">{inv.company_name}</td>
                      <td className="px-4 py-3">{inv.issue_date}</td>
                      <td className="px-4 py-3">{inv.due_date || "-"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(inv.net_amount)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(inv.vat_amount)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatCurrency(inv.gross_amount)}</td>
                      <td className="px-4 py-3">
                        <select 
                          className={`text-xs px-2 py-1 rounded-full font-semibold border-none cursor-pointer outline-none ${getStatusColor(inv.status)}`}
                          value={inv.status}
                          onChange={(e) => updateStatus(inv.id, e.target.value)}
                        >
                          {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value} className="bg-white text-gray-900">{opt.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(inv)}
                          className="text-blue-600 hover:text-blue-800 font-medium mr-3"
                          title="Redigera"
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button
                          onClick={() => deleteInvoice(inv.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                          title="Ta bort"
                        >
                          <i className="fa-solid fa-trash"></i>
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

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingId ? "Redigera Faktura" : "Skapa Ny Faktura"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Företag (Kund)</label>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 border rounded p-2 text-sm"
                      value={form.company_id}
                      onChange={e => setForm({...form, company_id: e.target.value})}
                    >
                      <option value="" disabled>Välj företag...</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button 
                      onClick={handleFillFromSubscription}
                      className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-2 rounded text-xs font-semibold whitespace-nowrap transition-colors"
                      title="Skapa abonnemangsfaktura"
                    >
                      <i className="fa-solid fa-magic mr-1"></i> Abonnemang
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fakturanummer</label>
                  <input
                    type="text"
                    className="w-full border rounded p-2 text-sm"
                    value={form.invoice_nr}
                    onChange={e => setForm({...form, invoice_nr: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full border rounded p-2 text-sm"
                    value={form.status}
                    onChange={e => setForm({...form, status: e.target.value as any})}
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fakturadatum</label>
                    <input
                      type="date"
                      className="w-full border rounded p-2 text-sm"
                      value={form.issue_date}
                      onChange={e => setForm({...form, issue_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Förfallodatum</label>
                    <input
                      type="date"
                      className="w-full border rounded p-2 text-sm"
                      value={form.due_date}
                      onChange={e => setForm({...form, due_date: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Momsats</label>
                    <select
                      className="w-full border rounded p-2 text-sm"
                      value={form.vat_rate.toString()}
                      onChange={e => setForm({...form, vat_rate: parseFloat(e.target.value)})}
                    >
                      <option value="0.25">25 %</option>
                      <option value="0.12">12 %</option>
                      <option value="0.06">6 %</option>
                      <option value="0">Momsfritt</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valuta</label>
                    <select
                      className="w-full border rounded p-2 text-sm"
                      value={form.currency}
                      onChange={e => setForm({...form, currency: e.target.value})}
                    >
                      <option value="SEK">SEK</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-2 border-b pb-2">Fakturarader</h4>
              <div className="space-y-2 mb-3">
                {form.lines.map((line, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <input 
                        type="text" 
                        placeholder="Beskrivning"
                        className="w-full border rounded p-2 text-sm"
                        value={line.description}
                        onChange={(e) => {
                          const newLines = [...form.lines];
                          newLines[idx].description = e.target.value;
                          setForm({...form, lines: newLines});
                        }}
                      />
                    </div>
                    <div className="w-24">
                      <input 
                        type="number" 
                        min="1"
                        placeholder="Antal"
                        className="w-full border rounded p-2 text-sm text-right"
                        value={line.qty}
                        onChange={(e) => {
                          const newLines = [...form.lines];
                          newLines[idx].qty = parseFloat(e.target.value) || 0;
                          setForm({...form, lines: newLines});
                        }}
                      />
                    </div>
                    <div className="w-32">
                      <input 
                        type="number" 
                        placeholder="à-pris"
                        className="w-full border rounded p-2 text-sm text-right"
                        value={line.unit_price}
                        onChange={(e) => {
                          const newLines = [...form.lines];
                          newLines[idx].unit_price = parseFloat(e.target.value) || 0;
                          setForm({...form, lines: newLines});
                        }}
                      />
                    </div>
                    <div className="w-32 pt-2 text-right font-medium text-sm tabular-nums">
                      {formatCurrency((line.qty || 0) * (line.unit_price || 0))}
                    </div>
                    <button 
                      className="pt-2 px-2 text-red-500 hover:text-red-700"
                      onClick={() => {
                        const newLines = form.lines.filter((_, i) => i !== idx);
                        setForm({...form, lines: newLines});
                      }}
                      title="Ta bort rad"
                    >
                      <i className="fa-solid fa-trash text-sm"></i>
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setForm({...form, lines: [...form.lines, { description: "", qty: 1, unit_price: 0 }]})}
                className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
              >
                <i className="fa-solid fa-plus mr-1"></i> Lägg till rad
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg flex justify-end mb-6">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Netto:</span>
                  <span className="tabular-nums font-medium">{formatCurrency(formTotals.net)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Moms ({(form.vat_rate * 100).toFixed(0)} %):</span>
                  <span className="tabular-nums font-medium">{formatCurrency(formTotals.vat)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-2 text-base font-bold">
                  <span>Brutto:</span>
                  <span className="tabular-nums">{formatCurrency(formTotals.gross)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded font-medium text-gray-700 hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={saveInvoice}
                className="px-4 py-2 bg-[var(--blue)] text-white rounded font-medium hover:bg-blue-600 flex items-center gap-2"
              >
                <i className="fa-solid fa-save"></i>
                {editingId ? "Spara ändringar" : "Skapa faktura"}
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


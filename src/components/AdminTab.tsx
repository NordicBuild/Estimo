import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { User } from "@supabase/supabase-js";

import { AdminRegisterTab } from "./AdminRegisterTab";
import { AdminFakturorTab } from "./AdminFakturorTab";
import { AdminInstallningarTab } from "./AdminInstallningarTab";
import { AdminAnalysTab } from "./AdminAnalysTab";

export interface AppUser {
  id: string;
  email: string;
  password?: string;
  role: "admin" | "manager" | "user";
  companyId: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_month: number;
  max_seats: number | null;
  features: Record<string, boolean>;
}

export interface CompanySubscription {
  id?: string;
  plan_id: string;
  status: "trial" | "active" | "past_due" | "canceled";
  seats: number;
  period_end: string | null;
}

export interface Company {
  id: string;
  name: string;
  orgNr: string;
  subscription?: CompanySubscription;
}

export interface Invoice {
  id: string;
  customer: string;
  amount: string;
  status: "Utkast" | "Skickad" | "Betald" | "Förfallen";
  date: string;
}

interface Props {
  user: User | null;
  activeTab?: "oversikt" | "kunder" | "fakturor" | "register" | "installningar" | "analys";
  userSettings?: any;
  setUserSettings?: any;

  materials?: any[];
  updateMaterial?: any;
  updateMultipleMaterials?: any;
  addMaterial?: any;
  addMaterials?: any;
  deleteMaterial?: any;
  deleteMultipleMaterials?: any;

  arbetsData?: any[];
  updateArbete?: any;
  updateMultipleArbeten?: any;
  addArbete?: any;
  addArbeten?: any;
  deleteArbete?: any;
  deleteMultipleArbeten?: any;

  customCategories?: string[];
  addCategory?: any;
  renameCategory?: any;
  removeCategory?: any;
  isPlatformAdmin?: boolean;
}

export function AdminTab({ 
  user, activeTab = "oversikt",
  userSettings, setUserSettings,
  materials, updateMaterial, updateMultipleMaterials, addMaterial, addMaterials, deleteMaterial, deleteMultipleMaterials,
  arbetsData, updateArbete, updateMultipleArbeten, addArbete, addArbeten, deleteArbete, deleteMultipleArbeten,
  customCategories, addCategory, renameCategory, removeCategory, isPlatformAdmin
}: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Invoices
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceRecordId, setInvoiceRecordId] = useState<string | null>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<Partial<Invoice>>({
    id: "", customer: "", amount: "", status: "Utkast", date: new Date().toISOString().split('T')[0]
  });

  // Forms
  const [newCompany, setNewCompany] = useState({ name: "", orgNr: "" });
  const [newUser, setNewUser] = useState({
    email: "",
    role: "user" as "admin" | "manager" | "user",
    companyId: "",
  });
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null,
  );
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [generatedCredentials, setGeneratedCredentials] = useState<{email: string; password: string} | null>(null);
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    if (activeTab === "fakturor") {
      loadInvoices();
    }
  }, [activeTab]);

  const loadInvoices = async () => {
    try {
      setLoadingInvoices(true);
      setDbError(false);
      const { data, error } = await supabase.from("admin_invoices").select("id, data").limit(1).maybeSingle();
      if (error && (error.code === "PGRST205" || error.code === "42P01" || error.code === "42501" || (error as any).message?.includes('not found'))) setDbError(true);
      if (error && error.code !== "PGRST116" && error.code !== "PGRST205" && error.code !== "42P01" && error.code !== "42501") throw error;
      if (data && data.data) {
        setInvoiceRecordId(data.id);
        setInvoices(data.data as Invoice[]);
      } else {
        const defaultInvoices: Invoice[] = [
          { id: "INV-2026-001", customer: "Skanska AB", amount: "125 000 kr", status: "Betald", date: "2026-04-15" },
          { id: "INV-2026-002", customer: "NCC Sverige", amount: "89 500 kr", status: "Förfallen", date: "2026-03-20" },
          { id: "INV-2026-003", customer: "Peab Bygg", amount: "210 000 kr", status: "Skickad", date: "2026-05-02" },
          { id: "INV-2026-004", customer: "JM AB", amount: "45 200 kr", status: "Utkast", date: "2026-05-05" },
        ];
        setInvoices(defaultInvoices);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const saveInvoices = async (newInvoices: Invoice[]) => {
    setInvoices(newInvoices);
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

  // Företagsdata (projekt & backup)
  const [companyProjects, setCompanyProjects] = useState<any[]>([]);
  const [loadingCompanyData, setLoadingCompanyData] = useState(false);

  useEffect(() => {
    if (selectedCompanyId) {
      loadCompanyData(selectedCompanyId);
    } else {
      setCompanyProjects([]);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (companies.length > 0) {
      localStorage.setItem("betong_global_companies", JSON.stringify(companies));
    }
  }, [companies]);

  useEffect(() => {
    // Legacy local storage, doing nothing for now.
  }, [appUsers]);

  const loadCompanyData = async (companyId: string) => {
    try {
      setLoadingCompanyData(true);
      const { data, error } = await supabase
        .from("app_state")
        .select("data")
        .eq("id", `projects_${companyId}`)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      if (data && data.data) {
        setCompanyProjects(data.data as any[]);
      } else {
        setCompanyProjects([]);
      }
    } catch (err: any) {
      console.error("Fel vid hämtning av företagsdata:", err);
    } finally {
      setLoadingCompanyData(false);
    }
  };

  const downloadCompanyBackup = async (company: Company) => {
    try {
      showNotification(`Skapar backup för ${company.name}...`, "success");
      
      const { data: projData } = await supabase.from("app_state").select("data").eq("id", `projects_${company.id}`).single();
      const { data: catData } = await supabase.from("app_state").select("data").eq("id", `custom_categories_${company.id}`).single();
      const { data: compInfoData } = await supabase.from("app_state").select("data").eq("id", `company_info_${company.id}`).single();
      const { data: foldersData } = await supabase.from("app_state").select("data").eq("id", `folders_${company.id}`).single();

      const backup = {
        company: company,
        exportDate: new Date().toISOString(),
        projects: projData?.data || [],
        customCategories: catData?.data || [],
        companyInfo: compInfoData?.data || {},
        folders: foldersData?.data || []
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_${company.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      showNotification("Kunde inte skapa backup", "error");
    }
  };

  // Global stats
  const [globalStats, setGlobalStats] = useState({ totalProjects: 0, totalDataSources: 0 });
  const [loadingGlobalStats, setLoadingGlobalStats] = useState(false);

  useEffect(() => {
    if (activeTab === "oversikt") {
      loadGlobalStats();
    }
  }, [activeTab]);

  const loadGlobalStats = async () => {
    try {
      setLoadingGlobalStats(true);
      setDbError(false);
      const { data, error } = await supabase.from("app_state").select("id, data");
      if (error && (error.code === "PGRST205" || error.code === "42P01" || error.code === "42501" || (error as any).message?.includes('not found'))) setDbError(true);
      if (error && error.code !== "PGRST116" && error.code !== "PGRST205" && error.code !== "42P01" && error.code !== "42501") throw error;
      
      let projCount = 0;
      let dsCount = 0;
      if (data) {
        dsCount = data.length;
        data.forEach(row => {
          if (row.id.startsWith("projects_") && Array.isArray(row.data)) {
            projCount += row.data.length;
          }
        });
      }
      setGlobalStats({ totalProjects: projCount, totalDataSources: dsCount });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGlobalStats(false);
    }
  };

  const downloadGlobalBackup = async () => {
    try {
      showNotification("Skapar system-backup...", "success");
      const { data, error } = await supabase.from("app_state").select("*");
      if (error && error.code !== "PGRST205") throw error;
      
      const backup = {
        exportDate: new Date().toISOString(),
        systemData: data || []
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kalkyl_system_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      showNotification("Kunde inte skapa system-backup", "error");
    }
  };

  const showNotification = (message: string, type: "success" | "error") => {

    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    loadAdminData();

    const channel = supabase
      .channel("admin-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_state",
        },
        (payload) => {
          if (payload.new && "id" in payload.new) {
            if (payload.new.id === "global_companies")
              setCompanies((payload.new as any).data || []);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setDbError(false);

      // Load plans
      const { data: plansData, error: plansErr } = await supabase
        .from("subscription_plans")
        .select("*");
      if (plansData) {
        setPlans(plansData);
      }
      
      const { data: compData, error: compErr } = await supabase
        .from("companies")
        .select("*, subscriptions(*)");
        
      if (compErr) {
        if (compErr.code === "PGRST205" || compErr.code === "42P01" || compErr.code === "42501" || (compErr as any).message?.includes('not found')) setDbError(true);
        if (compErr.code !== "PGRST116" && compErr.code !== "PGRST205" && compErr.code !== "42P01" && compErr.code !== "42501") throw compErr;
      }
      
      if (compData) {
        setCompanies(compData.map((c: any) => {
          let subData = undefined;
          if (c.subscriptions && c.subscriptions.length > 0) {
            subData = c.subscriptions[0];
          } else if (c.subscriptions && !Array.isArray(c.subscriptions)) {
            subData = c.subscriptions;
          }
          return {
            id: c.id,
            name: c.name,
            orgNr: c.org_nr || "",
            subscription: subData ? {
              id: subData.id,
              plan_id: subData.plan_id,
              status: subData.status,
              seats: subData.seats,
              period_end: subData.period_end
            } : undefined
          };
        }));
      }

      const { data: userData, error: userErr } = await supabase
        .from("profiles")
        .select("*");
        
      if (userErr) {
        if (userErr.code === "PGRST205" || userErr.code === "42P01" || userErr.code === "42501" || (userErr as any).message?.includes('not found')) setDbError(true);
        if (userErr.code !== "PGRST116" && userErr.code !== "PGRST205" && userErr.code !== "42P01" && userErr.code !== "42501") throw userErr;
      }
      
      if (userData) {
        setAppUsers(userData.map((u: any) => ({
          id: u.id,
          email: u.email || u.name || "Okänd",
          role: u.role as "admin" | "manager" | "user",
          companyId: u.company_id
        })));
      }
    } catch (err) {
      console.error(err);
      showNotification("Använder lokal lagring (" + (err as any).message + ")", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = async () => {
    if (!newCompany.name) return;
    try {
      const { data, error } = await supabase
        .from("companies")
        .insert([{ name: newCompany.name, org_nr: newCompany.orgNr }])
        .select()
        .single();
        
      if (error) throw error;

      // Seed the company with global defaults
      await supabase.rpc('seed_company_defaults', { target_company: data.id });

      // Auto-create trial subscription
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .upsert({
          company_id: data.id,
          plan_id: "free",
          status: "trial",
          seats: 1
        }, { onConflict: "company_id" })
        .select()
        .single();
      
      if (subError) {
        console.error("Kunde inte skapa prenumeration:", subError);
      }
      
      setCompanies([...companies, {
        id: data.id,
        name: data.name,
        orgNr: data.org_nr || "",
        subscription: subData ? {
          id: subData.id,
          plan_id: subData.plan_id,
          status: subData.status,
          seats: subData.seats,
          period_end: subData.period_end
        } : undefined
      }]);
      setNewCompany({ name: "", orgNr: "" });
      showNotification("Företag tillagt.", "success");
    } catch (err) {
      console.error(err);
      showNotification(
        "Ett fel uppstod när företaget skulle läggas till.",
        "error",
      );
    }
  };

  const handleAddUser = async (overrideCompanyId?: string) => {
    const compId = overrideCompanyId || newUser.companyId;
    if (!newUser.email || !compId) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: newUser.email,
          role: newUser.role,
          company_id: compId,
          full_name: "", 
          send_invite: true
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Okänt fel vid anrop till edge function');
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.tempPassword) {
        setGeneratedCredentials({ email: data.email, password: data.tempPassword });
      } else if (data.invited) {
        showNotification(`Inbjudan skickad till ${data.email}`, "success");
      }
      
      setNewUser({ ...newUser, email: "" });
      loadAdminData();
    } catch (err: any) {
      console.error(err);
      showNotification(
        "Kunde inte skapa användaren: " + (err.message || "Okänt fel"),
        "error"
      );
    }
  };

  const handleRemoveCompany = async (id: string) => {
    try {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
      setCompanies(companies.filter((c) => c.id !== id));
      showNotification("Företag borttaget.", "success");
    } catch (err: any) {
      console.error(err);
      showNotification(
        "Kunde inte ta bort företaget: " + (err.message || "Okänt fel"),
        "error",
      );
    }
  };

  const handleRemoveUser = async (id: string) => {
    try {
      setAppUsers(appUsers.filter((u) => u.id !== id));
      
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId: id }
      });
      
      if (error) throw new Error(error.message || "Ett fel uppstod");
      if (data?.error) throw new Error(data.error);

      showNotification("Användare borttagen.", "success");
    } catch (err: any) {
      console.error(err);
      loadAdminData();
      showNotification(
        "Kunde inte ta bort användaren: " + (err.message || "Okänt fel"),
        "error",
      );
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !editingUser.email) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: editingUser.role, company_id: editingUser.companyId })
        .eq("id", editingUser.id);
      if (error) throw error;
      
      setAppUsers(appUsers.map((u) =>
        u.id === editingUser.id ? editingUser : u,
      ));
      setEditingUser(null);
      showNotification("Användare uppdaterad.", "success");
    } catch (err: any) {
      console.error(err);
      showNotification(
        "Kunde inte uppdatera användaren: " + (err.message || "Okänt fel"),
        "error",
      );
    }
  };

  const handleUpdateCompany = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!editingCompany || !editingCompany.name) return;
    try {
      const { error } = await supabase
        .from("companies")
        .update({ name: editingCompany.name, org_nr: editingCompany.orgNr })
        .eq("id", editingCompany.id);
      if (error) throw error;

      setCompanies(companies.map((c) =>
        c.id === editingCompany.id ? editingCompany : c,
      ));
      setEditingCompany(null);
      showNotification("Företag uppdaterat.", "success");
    } catch (err: any) {
      console.error(err);
      showNotification(
        "Kunde inte uppdatera företaget: " + (err.message || "Okänt fel"),
        "error",
      );
    }
  };

  const handleUpdateSubscription = async (
    companyId: string,
    updates: Partial<CompanySubscription>
  ) => {
    try {
      const company = companies.find(c => c.id === companyId);
      if (!company) return;

      const currentSub = company.subscription || { plan_id: 'free', status: 'active', seats: 1, period_end: null };
      const newSub = { ...currentSub, ...updates };

      const { data, error } = await supabase
        .from('subscriptions')
        .upsert({
          company_id: companyId,
          plan_id: newSub.plan_id,
          status: newSub.status,
          seats: newSub.seats,
          period_end: newSub.period_end
        }, { onConflict: 'company_id' })
        .select()
        .single();

      if (error) throw error;

      setCompanies(companies.map(c => 
        c.id === companyId ? {
          ...c,
          subscription: {
            id: data.id,
            plan_id: data.plan_id,
            status: data.status,
            seats: data.seats,
            period_end: data.period_end
          }
        } : c
      ));

      showNotification("Prenumeration uppdaterad.", "success");
    } catch (err) {
      console.error(err);
      showNotification("Kunde inte uppdatera prenumerationen.", "error");
    }
  };

  // Basic authorization: Only display if logged in user is admin, or display a message
  const currentUserRecord = appUsers.find((u) => u.email === user?.email);

  if (loading) {
    return (
      <div className="p-6 text-[var(--text2)]">
        Laddar administratörsdata...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 text-[var(--red)]">
        Du måste vara inloggad för att se denna sida.
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold text-[var(--red)] mb-4">
          Åtkomst nekad
        </h2>
        <p className="text-[var(--text2)]">
          Du har inte administratörsbehörighet till denna modul.
        </p>
        <p className="text-sm mt-4 text-gray-400">
          Nuvarande inloggning: {user.email}
        </p>
      </div>
    );
  }

  const selectedCompany = selectedCompanyId
    ? companies.find((c) => c.id === selectedCompanyId)
    : null;
  const companyUsers = selectedCompanyId
    ? appUsers.filter((u) => u.companyId === selectedCompanyId)
    : appUsers;
  const filteredUsers = companyUsers.filter((u) =>
    u.email.toLowerCase().includes(userSearch.toLowerCase()),
  );

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(companySearch.toLowerCase()) ||
      (c.orgNr && c.orgNr.includes(companySearch)),
  );

  const renderDbWarning = () => {
    if (!dbError) return null;
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 mt-2 relative">
        <div className="flex">
          <div className="flex-shrink-0">
            <i className="fa-solid fa-exclamation-triangle text-red-500"></i>
          </div>
          <div className="ml-3 flex-1">
            <div className="flex justify-between items-start">
              <p className="text-sm text-red-700 font-bold">
                Varning: Supabase-databasen är inte fullt konfigurerad
              </p>
              <button 
                onClick={() => setDbError(false)}
                className="text-red-500 hover:text-red-700"
                title="Dölj varning"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <p className="text-sm text-red-600 mt-1">
              Tabellen <code>app_state</code> saknas i databasen, RLS är felkonfigurerat, eller så har databasens schema inte uppdaterats än. Data sparas <b>endast lokalt</b> tills detta är löst. Kör detta SQL-kommando i din Supabase ("SQL Editor") om du inte redan har gjort det:
            </p>
            <pre className="mt-2 bg-white p-3 rounded text-xs select-all border border-red-200 overflow-x-auto text-gray-800">
{`CREATE TABLE IF NOT EXISTS public.app_state (
  id text PRIMARY KEY,
  data jsonb
);

ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for all users" ON public.app_state;
CREATE POLICY "Enable all for all users" ON public.app_state FOR ALL USING (true) WITH CHECK (true);

-- Tvinga en uppdatering av PostgREST-schemat
NOTIFY pgrst, 'reload schema';
`}
            </pre>
            <p className="text-xs text-red-500 mt-2 font-medium">TIPS: Om du precis körde detta kommando, prova att ladda om sidan 1-2 gånger.</p>
          </div>
        </div>
      </div>
    );
  };

  if (activeTab === "oversikt") {
    return (
      <div className="p-6 max-w-7xl mx-auto relative">
        {renderDbWarning()}
        <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-6">
          <i className="fa-solid fa-house mr-3 text-[var(--blue)]"></i>
          Översikt
        </h2>

        <div className="bg-white border md:p-8 p-6 text-center border-[var(--border)] rounded-lg shadow-sm mb-6">
          <div className="w-16 h-16 bg-blue-50 text-[var(--blue)] flex items-center justify-center rounded-full mx-auto mb-4 text-2xl">
            <i className="fa-solid fa-laptop-code"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Plattformsadministration
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Använd menyn till vänster för att navigera mellan funktioner som företag, plattformsinställningar och analys.
          </p>
        </div>

        <div className="bg-white border md:p-8 p-6 border-[var(--border)] rounded-lg shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">
                Systemhantering
              </h3>
              <p className="text-sm text-gray-500">
                Ladda ner en komplett kopia av alla registrerade databaser och kalkyler för backup.
              </p>
            </div>
            <button
               onClick={downloadGlobalBackup}
               className="bg-[var(--blue)] hover:bg-blue-600 text-white px-6 py-3 rounded-lg shadow font-semibold transition-colors flex items-center whitespace-nowrap"
            >
              <i className="fa-solid fa-database mr-3 border-r pr-3 border-white/20"></i> System Backup
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === "register") {
    return (
      <AdminRegisterTab />
    );
  }

  if (activeTab === "fakturor") {
    return <AdminFakturorTab />;
  }

  if (activeTab === "installningar") {
    return <AdminInstallningarTab userSettings={userSettings} setUserSettings={setUserSettings} />;
  }

  if (activeTab === "analys") {
    return <AdminAnalysTab />;
  }

  return (
    <div className="p-6 w-[1200px] max-w-full mx-auto flex flex-col relative">
      {renderDbWarning()}
      <div className="flex gap-6 w-full">
      {/* Notifications */}
      {notification && (
        <div
          className={`absolute top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg font-semibold z-50 text-white ${notification.type === "success" ? "bg-green-600" : "bg-red-600"} transition-all`}
        >
          {notification.message}
        </div>
      )}

      {/* Generated Credentials Modal */}
      {generatedCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              <i className="fa-solid fa-key text-[var(--accent)] mr-2"></i>
              Användare skapad!
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              En ny användare har skapats. Kopiera lösenordet eller skicka det direkt via e-post (simulerat).
            </p>
            <div className="bg-gray-50 border p-4 rounded-md mb-4 font-mono text-sm">
              <div><strong className="text-gray-700 font-sans">E-post:</strong> {generatedCredentials.email}</div>
              <div className="mt-2"><strong className="text-gray-700 font-sans">Lösenord:</strong> {generatedCredentials.password}</div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                onClick={() => setGeneratedCredentials(null)}
              >
                Stäng
              </button>
              <a
                href={`mailto:${generatedCredentials.email}?subject=Ditt konto är skapat&body=Hej!%0D%0ADitt konto har skapats.%0D%0A%0D%0AInloggning: ${generatedCredentials.email}%0D%0ALösenord: ${generatedCredentials.password}%0D%0A%0D%0AVänligen logga in och byt lösenord.`}
                className="bg-[var(--blue)] text-white px-4 py-2 text-sm font-semibold rounded-md hover:bg-blue-600 transition-colors"
                onClick={() => setGeneratedCredentials(null)}
              >
                <i className="fa-solid fa-envelope mr-2"></i>
                Skicka e-post
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Companies List */}
      <div className="w-[550px] flex-shrink-0 bg-white border border-[var(--border)] rounded-lg p-5 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 border-b pb-3 mb-4">
          <i className="fa-solid fa-building mr-2 text-[var(--blue)]"></i>
          Företag
        </h2>

        <div className="mb-6 bg-gray-50 p-4 rounded-md border border-gray-100 shadow-inner">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">
            Lägg till företag
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Företagsnamn"
              className="flex-1 border rounded px-3 py-2 text-sm"
              value={newCompany.name}
              onChange={(e) =>
                setNewCompany({ ...newCompany, name: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Org.nr"
              className="w-32 border rounded px-3 py-2 text-sm"
              value={newCompany.orgNr}
              onChange={(e) =>
                setNewCompany({ ...newCompany, orgNr: e.target.value })
              }
            />
            <button
              className="bg-[var(--blue)] hover:bg-blue-600 outline-none text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
              onClick={handleAddCompany}
              disabled={!newCompany.name}
            >
              Lägg till
            </button>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Sök företag..."
            className="w-full border rounded px-3 py-2 text-sm text-gray-700 focus:outline-[var(--blue)] outline-1"
            value={companySearch}
            onChange={(e) => setCompanySearch(e.target.value)}
          />
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
          {filteredCompanies.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              Inga företag matchar sökningen.
            </p>
          ) : (
            filteredCompanies.map((comp) => (
              <div
                key={comp.id}
                className={`p-3 border rounded-md cursor-pointer transition-colors flex flex-col gap-2 ${selectedCompanyId === comp.id ? "border-[var(--blue)] bg-blue-50" : "hover:bg-gray-50"}`}
                onClick={() => setSelectedCompanyId(comp.id)}
              >
                {editingCompany?.id === comp.id ? (
                  <div
                    className="flex gap-2 items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      className="flex-1 border rounded px-2 py-1 text-sm bg-white"
                      value={editingCompany.name}
                      onChange={(e) =>
                        setEditingCompany({
                          ...editingCompany,
                          name: e.target.value,
                        })
                      }
                    />
                    <input
                      type="text"
                      className="w-32 border rounded px-2 py-1 text-sm bg-white"
                      value={editingCompany.orgNr}
                      onChange={(e) =>
                        setEditingCompany({
                          ...editingCompany,
                          orgNr: e.target.value,
                        })
                      }
                    />
                    <button
                      className="bg-green-500 hover:bg-green-600 text-white w-7 h-7 rounded flex items-center justify-center transition-colors"
                      onClick={handleUpdateCompany}
                      title="Spara ändringar"
                    >
                      <i className="fa-solid fa-check"></i>
                    </button>
                    <button
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-7 h-7 rounded flex items-center justify-center transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCompany(null);
                      }}
                      title="Avbryt"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-800">
                        {comp.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        Org: {comp.orgNr || "-"}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {comp.subscription && (
                        <div className="flex gap-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold uppercase">
                            {plans.find(p => p.id === comp.subscription?.plan_id)?.name || comp.subscription.plan_id}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                            comp.subscription.status === 'active' ? 'bg-green-100 text-green-700' :
                            comp.subscription.status === 'trial' ? 'bg-yellow-100 text-yellow-700' :
                            comp.subscription.status === 'past_due' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {comp.subscription.status}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          className="text-gray-400 hover:text-blue-500 w-6 h-6 flex items-center justify-center transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCompany(comp);
                          }}
                          title="Redigera företag"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button
                          className="text-gray-400 hover:text-red-500 w-6 h-6 flex items-center justify-center transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                "Är du säker på att du vill ta bort företaget?",
                              )
                            )
                              handleRemoveCompany(comp.id);
                          }}
                          title="Ta bort företag"
                        >
                          <i className="fa-solid fa-trash text-sm"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Users List */}
      <div className="w-[550px] flex-shrink-0 bg-white border border-[var(--border)] rounded-lg p-5 shadow-sm flex flex-col">
        <h2 className="text-xl font-bold text-gray-800 border-b pb-3 mb-4 flex justify-between items-center">
          <div>
            <i className="fa-solid fa-users mr-2 text-[var(--blue)]"></i>
            {selectedCompany
              ? `${selectedCompany.name}`
              : "Alla användare"}
          </div>
          {selectedCompany && (
            <button
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded"
              onClick={() => setSelectedCompanyId(null)}
            >
              Visa alla
            </button>
          )}
        </h2>

        {selectedCompany && (
          <div className="mb-6 bg-purple-50/50 p-4 rounded-md border border-purple-100 shadow-sm">
            <h3 className="text-sm font-bold text-purple-900 mb-3 flex justify-between items-center">
              <span><i className="fa-solid fa-crown mr-2"></i>Prenumeration</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-purple-700 mb-1">Plan</label>
                <select 
                  className="w-full border-purple-200 rounded px-2 py-1.5 text-sm"
                  value={selectedCompany.subscription?.plan_id || 'free'}
                  onChange={(e) => handleUpdateSubscription(selectedCompany.id, { plan_id: e.target.value })}
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.price_month} kr/mån)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-purple-700 mb-1">Status</label>
                <select 
                  className="w-full border-purple-200 rounded px-2 py-1.5 text-sm"
                  value={selectedCompany.subscription?.status || 'active'}
                  onChange={(e) => handleUpdateSubscription(selectedCompany.id, { status: e.target.value as any })}
                >
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="past_due">Past Due</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-purple-700 mb-1">Antal licenser (Seats)</label>
                <input 
                  type="number"
                  min="1"
                  className="w-full border-purple-200 rounded px-2 py-1.5 text-sm"
                  value={selectedCompany.subscription?.seats || 1}
                  onChange={(e) => {
                    const plan = plans.find(p => p.id === (selectedCompany.subscription?.plan_id || 'free'));
                    const val = parseInt(e.target.value, 10);
                    if (plan?.max_seats && val > plan.max_seats) {
                      showNotification(`Denna plan tillåter max ${plan.max_seats} licenser.`, "error");
                      return;
                    }
                    handleUpdateSubscription(selectedCompany.id, { seats: val });
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-purple-700 mb-1">Giltig till (Period End)</label>
                <input 
                  type="date"
                  className="w-full border-purple-200 rounded px-2 py-1.5 text-sm"
                  value={selectedCompany.subscription?.period_end || ''}
                  onChange={(e) => handleUpdateSubscription(selectedCompany.id, { period_end: e.target.value || null })}
                />
              </div>
            </div>
          </div>
        )}

        {selectedCompany && (
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="bg-blue-50/50 p-4 rounded-md border border-blue-100 shadow-sm flex flex-col items-center justify-center">
              <span className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">Sparade Projekt</span>
              <span className="text-2xl font-bold text-blue-900">
                {loadingCompanyData ? <i className="fa-solid fa-spinner fa-spin text-sm"></i> : companyProjects.length}
              </span>
            </div>
            <div className="bg-amber-50/50 p-4 rounded-md border border-amber-100 shadow-sm flex flex-col items-center justify-center">
               <span className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">Företagsdata</span>
               <button 
                 onClick={() => downloadCompanyBackup(selectedCompany)}
                 className="text-sm bg-white hover:bg-amber-100 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-md transition-colors flex items-center font-medium mt-1 shadow-sm"
               >
                 <i className="fa-solid fa-download mr-2"></i> Ladda ner backup
               </button>
            </div>
          </div>
        )}

        <div className="mb-6 bg-gray-50 p-4 rounded-md border border-gray-100 shadow-inner">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">
            {selectedCompany
              ? `Lägg till användare i ${selectedCompany.name}`
              : "Lägg till användare"}
          </h3>
          <div className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="E-postadress"
              className="w-full border rounded px-3 py-2 text-sm"
              value={newUser.email}
              onChange={(e) =>
                setNewUser({
                  ...newUser,
                  email: e.target.value,
                  companyId: selectedCompany
                    ? selectedCompany.id
                    : !!newUser.companyId
                      ? newUser.companyId
                      : companies[0]?.id || "",
                })
              }
            />
            <div className="flex gap-2 items-center">
              <select
                className="border rounded px-3 py-2 text-sm flex-1 max-w-[140px]"
                value={
                  newUser.companyId ||
                  (selectedCompany ? selectedCompany.id : "")
                }
                onChange={(e) =>
                  setNewUser({
                    ...newUser,
                    companyId: e.target.value,
                  })
                }
              >
                {!selectedCompany && !newUser.companyId && (
                  <option value="" disabled>
                    Välj företag...
                  </option>
                )}
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                className="border rounded px-3 py-2 text-sm flex-1"
                value={newUser.role}
                onChange={(e) =>
                  setNewUser({
                    ...newUser,
                    role: e.target.value as any,
                  })
                }
              >
                <option value="user">Användare</option>
                <option value="manager">Chef</option>
                <option value="admin">Administratör</option>
              </select>
              <button
                className="bg-[var(--blue)] hover:bg-blue-600 outline-none text-white px-4 py-2 rounded text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() =>
                  handleAddUser(newUser.companyId || selectedCompany?.id)
                }
                disabled={
                  !newUser.email || (!selectedCompany && !newUser.companyId)
                }
              >
                Lägg till
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Sök användare..."
            className="w-full border rounded px-3 py-2 text-sm text-gray-700 focus:outline-[var(--blue)] outline-1"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 flex-1">
          {filteredUsers.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              Inga användare matchar sökningen.
            </p>
          ) : (
            filteredUsers.map((u) => (
              <div
                key={u.id}
                className="p-3 border rounded-md flex justify-between items-center bg-white gap-4"
              >
                {editingUser?.id === u.id ? (
                  <div className="flex-1 flex gap-2 items-center">
                    <input
                      type="email"
                      className="flex-1 border rounded px-2 py-1 text-sm"
                      value={editingUser.email}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          email: e.target.value,
                        })
                      }
                    />
                    <select
                      className="border rounded px-2 py-1 text-sm max-w-[120px]"
                      value={editingUser.companyId}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          companyId: e.target.value,
                        })
                      }
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={editingUser.role}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          role: e.target.value as any,
                        })
                      }
                    >
                      <option value="user">Användare</option>
                      <option value="manager">Chef</option>
                      <option value="admin">Administratör</option>
                    </select>
                    <button
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-7 h-7 rounded flex items-center justify-center transition-colors"
                      onClick={() => showNotification("Lösenord återställs via inloggningsskärmen av användaren.", "error")}
                      title="Generera nytt lösenord (avaktiverat)"
                    >
                      <i className="fa-solid fa-key"></i>
                    </button>
                    <button
                      className="bg-green-500 hover:bg-green-600 text-white w-7 h-7 rounded flex items-center justify-center transition-colors"
                      onClick={handleUpdateUser}
                      title="Spara ändringar"
                    >
                      <i className="fa-solid fa-check"></i>
                    </button>
                    <button
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-7 h-7 rounded flex items-center justify-center transition-colors"
                      onClick={() => setEditingUser(null)}
                      title="Avbryt"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-800 flex items-center gap-2">
                        {u.email}
                        {u.role === "admin" && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            Admin
                          </span>
                        )}
                        {u.role === "manager" && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            Chef
                          </span>
                        )}
                        {u.role === "user" && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            Anv
                          </span>
                        )}
                      </div>
                      {!selectedCompanyId && (
                        <div className="text-xs text-gray-500 mt-1">
                          Företag:{" "}
                          <span className="font-medium">
                            {companies.find((c) => c.id === u.companyId)
                              ?.name || "Okänt"}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="text-gray-400 hover:text-blue-500 w-7 h-7 flex items-center justify-center transition-colors"
                        onClick={() => setEditingUser(u)}
                        title="Redigera användare"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button
                        className="text-gray-400 hover:text-red-500 w-7 h-7 flex items-center justify-center transition-colors"
                        onClick={() => {
                          if (
                            confirm(
                              "Är du säker på att du vill ta bort användaren?",
                            )
                          )
                            handleRemoveUser(u.id);
                        }}
                        title="Ta bort användare"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-8 border-t pt-4">
          <h3 className="font-bold text-sm text-gray-700 mb-2">
            Behörigheter förklarade:
          </h3>
          <ul className="text-xs text-gray-600 space-y-2">
            <li>
              <strong className="text-gray-800">Användare:</strong> Kan skapa
              och se sina egna kalkyler och projekt inom företaget.
            </li>
            <li>
              <strong className="text-blue-700">Chef:</strong> Kan se alla
              kalkyler och projekt som skapats av alla användare inom företaget.
            </li>
            <li>
              <strong className="text-purple-700">Administratör:</strong> Har
              åtkomst till denna globala admin-panel.
            </li>
          </ul>
        </div>

      </div>
    </div>
    </div>
  );
}

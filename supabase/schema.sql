-- ==========================================
-- Supabase Schema för Kalkylprogrammet
-- ==========================================

-- 1. Företag / Organisation (Data Space)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    org_nr TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    ort TEXT,
    lan TEXT,
    land TEXT DEFAULT 'Sverige',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profiler / Användare
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    role TEXT CHECK (role IN ('admin', 'user', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Mappar (Folders)
CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Projekt
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
    nr TEXT,
    name TEXT NOT NULL,
    client TEXT,
    client_org_nr TEXT,
    client_contact TEXT,
    client_email TEXT,
    client_phone TEXT,
    ort TEXT,
    lan TEXT,
    land TEXT DEFAULT 'Sverige',
    status TEXT,
    contract_type TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Material (Företagsspecifikt eller globalt)
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    cat TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT,
    price NUMERIC NOT NULL,
    spill NUMERIC DEFAULT 0,
    konto TEXT,
    lev TEXT,
    note TEXT,
    price_history JSONB DEFAULT '[]',
    co2_per_unit NUMERIC,
    co2_source TEXT,
    lca_indicators JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Arbetsmoment (Företagsspecifikt eller globalt)
CREATE TABLE IF NOT EXISTS arbetsmoments (
    id SERIAL PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    cat TEXT NOT NULL,
    name TEXT NOT NULL,
    tid NUMERIC NOT NULL,
    unit TEXT,
    sv NUMERIC DEFAULT 1.0,
    note TEXT,
    time_history JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Kalkylens Byggdelar (Kopplad till Projekt)
-- Eftersom projekt och byggdelar för tillfället sparas som stora JSON blobbar
-- kan man antingen behålla JSON för just kalkylträdet (pga avancerad state-hantering)
-- eller normalisera. En hybrid approch är ofta bäst från början.
CREATE TABLE IF NOT EXISTS project_byggdelar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Offerter (Anbud / Inköp)
CREATE TABLE IF NOT EXISTS leverantor_offert (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    anbud_id UUID NULL,
    leverantor TEXT,
    typ TEXT CHECK (typ IN ('ue', 'leverantor')),
    valuta TEXT DEFAULT 'SEK',
    status TEXT DEFAULT 'inkommen',
    poster JSONB,
    fast_tillagg NUMERIC DEFAULT 0,
    giltig_till DATE NULL,
    "not" TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leverantor_offert_project_id ON leverantor_offert(project_id);
CREATE INDEX IF NOT EXISTS idx_leverantor_offert_anbud_id ON leverantor_offert(anbud_id);

-- 9. Byggdel Recept (Receptbibliotek)
CREATE TABLE IF NOT EXISTS byggdel_recept (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    kod TEXT,
    namn TEXT,
    enhet TEXT,
    byggdel_type TEXT,
    byggdelsgrupp TEXT,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Projekt Utfall (EAC)
CREATE TABLE IF NOT EXISTS projekt_utfall (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL,
    line_key TEXT NOT NULL,
    ac NUMERIC,
    fardiggrad NUMERIC,
    manuell_eac NUMERIC,
    noterat_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, line_key)
);

-- 11. App State (Key-Value Store)
CREATE TABLE IF NOT EXISTS public.app_state (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Row Level Security (RLS) policies
-- Slå på RLS för varje tabell
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE arbetsmoments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_byggdelar ENABLE ROW LEVEL SECURITY;
ALTER TABLE leverantor_offert ENABLE ROW LEVEL SECURITY;
ALTER TABLE byggdel_recept ENABLE ROW LEVEL SECURITY;
ALTER TABLE projekt_utfall ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

-- Här är det viktigt att skriva policys så att man bara ser sitt eget företags data:
CREATE POLICY "Se sitt eget företags data" ON companies
    FOR ALL USING (id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Se projekt baserat på company" ON projects
    FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Se offerter baserat på company" ON leverantor_offert
    FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Se recept baserat på company" ON byggdel_recept
    FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Se utfall baserat på company" ON projekt_utfall
    FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- App State policy (Full tillgång för alla inloggade just nu, då ids i koden använder dataSpaceId)
DROP POLICY IF EXISTS "Enable all for all users" ON public.app_state;
CREATE POLICY "Enable all for all users" ON public.app_state FOR ALL USING (true) WITH CHECK (true);


-- Osv. Beroende på exakt hur strikt vi vill ha det.

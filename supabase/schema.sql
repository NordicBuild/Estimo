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

-- 8. Row Level Security (RLS) policies
-- Slå på RLS för varje tabell
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE arbetsmoments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_byggdelar ENABLE ROW LEVEL SECURITY;

-- Här är det viktigt att skriva policys så att man bara ser sitt eget företags data:
CREATE POLICY "Se sitt eget företags data" ON companies
    FOR ALL USING (id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Se projekt baserat på company" ON projects
    FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Osv. Beroende på exakt hur strikt vi vill ha det.

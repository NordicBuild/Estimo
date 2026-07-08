-- ==========================================
-- Supabase Schema för BIM 3D Mätning
-- ==========================================

-- 1. BIM Models (Uppladdade modeller)
CREATE TABLE IF NOT EXISTS bim_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size NUMERIC,
    format TEXT,
    status TEXT DEFAULT 'pending',
    geometry_url TEXT,
    has_geometry BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE bim_models IS 'Metadata och filreferenser för uppladdade 3D/BIM-modeller.';
COMMENT ON COLUMN bim_models.id IS 'Unikt ID för modellen.';
COMMENT ON COLUMN bim_models.company_id IS 'Koppling till företaget som äger modellen.';
COMMENT ON COLUMN bim_models.project_id IS 'Koppling till projektet där modellen används.';
COMMENT ON COLUMN bim_models.name IS 'Ursprungligt filnamn (t.ex. hus.ifc).';
COMMENT ON COLUMN bim_models.file_url IS 'Sökväg/Länk till filen i Supabase Storage.';
COMMENT ON COLUMN bim_models.file_size IS 'Filstorlek i bytes.';
COMMENT ON COLUMN bim_models.format IS 'Filformat, t.ex. IFC eller DWG.';
COMMENT ON COLUMN bim_models.status IS 'Bearbetningsstatus (pending, processing, ready, error).';
COMMENT ON COLUMN bim_models.metadata IS 'Extra information, t.ex. bounding box eller parser-version.';
COMMENT ON COLUMN bim_models.created_at IS 'När modellen laddades upp.';
COMMENT ON COLUMN bim_models.updated_at IS 'När modellen senast ändrades.';


-- 2. BIM Elements (Parsade element från modellen)
CREATE TABLE IF NOT EXISTS bim_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES bim_models(id) ON DELETE CASCADE,
    guid TEXT NOT NULL,
    category TEXT,
    name TEXT,
    storey TEXT,
    discipline TEXT,
    properties JSONB DEFAULT '{}',
    geometry_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE bim_elements IS 'Parsade byggelement (väggar, bjälklag) extraherade från BIM-modellerna.';
COMMENT ON COLUMN bim_elements.id IS 'Unikt ID för elementposten i databasen.';
COMMENT ON COLUMN bim_elements.model_id IS 'Referens till vilken modell elementet tillhör.';
COMMENT ON COLUMN bim_elements.guid IS 'GlobalId från IFC-filen.';
COMMENT ON COLUMN bim_elements.category IS 'IFC-klass eller elementkategori (t.ex. IfcWall).';
COMMENT ON COLUMN bim_elements.name IS 'Elementets namn från filen.';
COMMENT ON COLUMN bim_elements.storey IS 'Vilket våningsplan (IfcBuildingStorey) elementet tillhör.';
COMMENT ON COLUMN bim_elements.properties IS 'Nyckel-värde-par för elementets egenskaper (Area, Volume, Material, etc).';
COMMENT ON COLUMN bim_elements.geometry_data IS 'Geometridata för highlight eller bounding box-beräkningar.';
COMMENT ON COLUMN bim_elements.created_at IS 'När elementet infogades.';

-- ==========================================
-- Storage
-- ==========================================

-- 1. Skapa storage-bucketen 'bim-uploads' (privat) om den inte finns
INSERT INTO storage.buckets (id, name, public)
VALUES ('bim-uploads', 'bim-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Tillåt inloggade att ladda upp och läsa filer i bim-uploads
CREATE POLICY "Tillåt inloggade att ladda upp" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bim-uploads');

CREATE POLICY "Tillåt inloggade att läsa" ON storage.objects
    FOR SELECT TO authenticated USING (bucket_id = 'bim-uploads');


-- ==========================================
-- Databasändringar (Migrations-steg)
-- ==========================================

-- 2. Lägg till kolumnen 'discipline' på bim_elements om den saknas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bim_elements' AND column_name = 'discipline') THEN
        ALTER TABLE bim_elements ADD COLUMN discipline TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bim_models' AND column_name = 'geometry_url') THEN
        ALTER TABLE bim_models ADD COLUMN geometry_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bim_models' AND column_name = 'has_geometry') THEN
        ALTER TABLE bim_models ADD COLUMN has_geometry BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 6. Index för snabba sökningar
CREATE INDEX IF NOT EXISTS idx_bim_elements_model_id ON bim_elements(model_id);
CREATE INDEX IF NOT EXISTS idx_bim_elements_category ON bim_elements(category);
CREATE INDEX IF NOT EXISTS idx_bim_elements_storey ON bim_elements(storey);

-- 3. BIM Selections (Användarens grupperade element / "mängder")
CREATE TABLE IF NOT EXISTS bim_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    model_id UUID REFERENCES bim_models(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    elements JSONB NOT NULL,
    filters JSONB,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE bim_selections IS 'Sparade urval (elementgrupper) kopplade till kalkyler/mängdning.';
COMMENT ON COLUMN bim_selections.id IS 'Unikt ID för urvalet.';
COMMENT ON COLUMN bim_selections.company_id IS 'Företaget urvalet tillhör.';
COMMENT ON COLUMN bim_selections.project_id IS 'Projektet urvalet tillhör.';
COMMENT ON COLUMN bim_selections.model_id IS 'Vilken modell urvalet baseras på.';
COMMENT ON COLUMN bim_selections.name IS 'Namn på urvalet, t.ex. Ytterväggar Plan 1.';
COMMENT ON COLUMN bim_selections.color IS 'Färg för urvalet i 3D-vyn.';
COMMENT ON COLUMN bim_selections.elements IS 'JSON-array av element-GUIDs som ingår.';
COMMENT ON COLUMN bim_selections.filters IS 'Filterregler (t.ex. kategori=IfcWall) om det är ett dynamiskt urval.';
COMMENT ON COLUMN bim_selections.created_by IS 'Användaren som skapade urvalet.';
COMMENT ON COLUMN bim_selections.created_at IS 'Skapandetidpunkt.';
COMMENT ON COLUMN bim_selections.updated_at IS 'Ändringstidpunkt.';

-- 4. BIM Snapshots (Sparade vyer, kameravinklar, aktiva urval)
CREATE TABLE IF NOT EXISTS bim_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    model_id UUID REFERENCES bim_models(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    camera_state JSONB NOT NULL,
    visibility_state JSONB,
    selection_state JSONB,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE bim_snapshots IS 'Kameravyer och synlighetsinställningar för specifika presentationer eller arbetslägen.';
COMMENT ON COLUMN bim_snapshots.id IS 'Unikt ID för snapshotet.';
COMMENT ON COLUMN bim_snapshots.company_id IS 'Företaget som äger snapshotet.';
COMMENT ON COLUMN bim_snapshots.project_id IS 'Projektet där snapshotet sparats.';
COMMENT ON COLUMN bim_snapshots.model_id IS 'Vilken modell snapshotet avser.';
COMMENT ON COLUMN bim_snapshots.name IS 'Namn på vyn (t.ex. Fasadvinkel Nord).';
COMMENT ON COLUMN bim_snapshots.camera_state IS 'JSON med kamerans position, target och zoom-nivå.';
COMMENT ON COLUMN bim_snapshots.visibility_state IS 'JSON med information om dolda eller transparens-ändrade element.';
COMMENT ON COLUMN bim_snapshots.selection_state IS 'JSON med aktivt markerade element när snapshotet togs.';
COMMENT ON COLUMN bim_snapshots.created_by IS 'Användaren som skapade snapshotet.';
COMMENT ON COLUMN bim_snapshots.created_at IS 'Skapandetidpunkt.';

-- ==========================================
-- Row Level Security (RLS)
-- ==========================================

-- 3. Aktivera RLS
ALTER TABLE bim_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE bim_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bim_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bim_snapshots ENABLE ROW LEVEL SECURITY;

-- Ta bort gamla stubs för säkerhets skull
DROP POLICY IF EXISTS "Se sitt eget företags modeller" ON bim_models;
DROP POLICY IF EXISTS "Se element från tillåtna modeller" ON bim_elements;
DROP POLICY IF EXISTS "Se sitt eget företags urval" ON bim_selections;
DROP POLICY IF EXISTS "Se sitt eget företags snapshots" ON bim_snapshots;

-- 4. SELECT-policy för bim_models
-- Förklaring: Tillåter en användare att läsa (SELECT) rader i bim_models där modellens company_id matchar användarens eget company_id i profiles.
CREATE POLICY "Läsbehörighet för bim_models" ON bim_models
    FOR SELECT 
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- 4. SELECT-policy för bim_elements
-- Förklaring: Tillåter en användare att läsa element om elementets model_id är kopplat till en modell i bim_models som tillhör användarens företag.
CREATE POLICY "Läsbehörighet för bim_elements" ON bim_elements
    FOR SELECT 
    USING (model_id IN (
        SELECT id FROM bim_models WHERE company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    ));

-- 5. INSERT/UPDATE/DELETE på bim_models
-- Förklaring: Användare tillhörande samma company_id får skapa, ändra eller ta bort modeller (ALL inkluderar INSERT, UPDATE, DELETE).
CREATE POLICY "Skrivbehörighet för bim_models" ON bim_models
    FOR ALL
    USING (
        company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

-- (Behåll de gamla urvals- och snapshot-policyerna med nya namn för tydlighetens skull)
CREATE POLICY "Läs och skriv för egna företags urval" ON bim_selections
    FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Läs och skriv för egna företags snapshots" ON bim_snapshots
    FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

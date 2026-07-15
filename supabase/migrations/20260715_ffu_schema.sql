-- ============================================================================
-- Estimo FFU (Projektunderlag) Schema
-- Idempotent SQL ready for Supabase
-- Run as: postgres role in Supabase SQL Editor
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. ENUM TYPES
-- ─────────────────────────────────────────────────────────────────────────

CREATE TYPE document_type_enum AS ENUM (
  'ritning',
  'mätning',
  'instruktion',
  'bild',
  'annat'
);

CREATE TYPE document_share_role AS ENUM (
  'viewer',
  'editor',
  'admin'
);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. DOCUMENT FOLDERS (Hierarkisk mapstruktur)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📁',  -- Material Symbol or emoji placeholder
  position INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_hierarchy CHECK (parent_id IS NULL OR parent_id != id)
);

COMMENT ON TABLE document_folders IS
  'Hierarkisk mapstruktur för dokumentorganisering. parent_id = NULL betyder root-nivå.';
COMMENT ON COLUMN document_folders.company_id IS
  'Tenant isolation: varje mapp tillhör ett företag.';
COMMENT ON COLUMN document_folders.position IS
  'Ordning för visning (0, 1, 2, ...) — uppdateras vid drag-drop.';

CREATE INDEX idx_document_folders_project_id ON document_folders(project_id);
CREATE INDEX idx_document_folders_parent_id ON document_folders(parent_id);
CREATE INDEX idx_document_folders_company_id ON document_folders(company_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. PROJECT DOCUMENTS (Huvuddokument-post)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES document_folders(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,  -- "application/pdf", "image/jpeg", etc.
  size_bytes BIGINT NOT NULL,
  document_type document_type_enum NOT NULL DEFAULT 'annat',
  description TEXT,
  
  -- Versioning
  current_version_id UUID,  -- FK to document_versions (set after first version created)
  version_count INTEGER DEFAULT 0,
  
  -- Metadata
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,  -- Soft delete for recovery
  
  CONSTRAINT unique_filename_per_folder UNIQUE (folder_id, filename)
);

COMMENT ON TABLE project_documents IS
  'Huvudpost för varje dokument. En dokument kan ha många versioner.';
COMMENT ON COLUMN project_documents.current_version_id IS
  'Referens till latest document_versions.id — NULL tills första version skapas.';
COMMENT ON COLUMN project_documents.deleted_at IS
  'Soft delete: NULL = aktiv, NOT NULL = borttagen (kan recoveras).';

CREATE INDEX idx_project_documents_folder_id ON project_documents(folder_id);
CREATE INDEX idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX idx_project_documents_company_id ON project_documents(company_id);
CREATE INDEX idx_project_documents_created_by ON project_documents(created_by);
CREATE INDEX idx_project_documents_tags ON project_documents USING GIN(tags);
CREATE INDEX idx_project_documents_deleted_at ON project_documents(deleted_at);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. DOCUMENT VERSIONS (Versions-historik)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  storage_path TEXT NOT NULL,  -- e.g., "projects/{projectId}/documents/ritningar/plan-1-50.pdf"
  size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  change_notes TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT version_number_positive CHECK (version_number > 0),
  CONSTRAINT unique_version_per_document UNIQUE (document_id, version_number)
);

COMMENT ON TABLE document_versions IS
  'Version-historik för dokument. Låter rollback och jämförande.';
COMMENT ON COLUMN document_versions.storage_path IS
  'Path i Supabase Storage (projects bucket).';
COMMENT ON COLUMN document_versions.change_notes IS
  'Vad som ändrades i denna version (valfritt).';

CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_uploaded_by ON document_versions(uploaded_by);
CREATE INDEX idx_document_versions_uploaded_at ON document_versions(uploaded_at);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. PDF MEASUREMENT LINKS (Länka mätningar → dokument)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pdf_measurement_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- JSON-serialiserade mätnings-ID från PdfMeasurementTab
  measurement_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  measurement_data JSONB,  -- Kopiera av measurements JSON (optional, för preview)
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT at_least_one_measurement CHECK (array_length(measurement_ids, 1) > 0)
);

COMMENT ON TABLE pdf_measurement_links IS
  'Länka PDF-mätningar (från PdfMeasurementTab) → dokument de mättes på.
   Låter rekonstruera mäthistorik och se vilka dokument som har varit mätta.';
COMMENT ON COLUMN pdf_measurement_links.measurement_ids IS
  'Array av mätnings-ID:n från measurementTypes.ts (id field).';
COMMENT ON COLUMN pdf_measurement_links.measurement_data IS
  'Snapshot av measurements.json för förhands-preview utan att öppna PDF.';

CREATE INDEX idx_pdf_measurement_links_document_id ON pdf_measurement_links(document_id);
CREATE INDEX idx_pdf_measurement_links_project_id ON pdf_measurement_links(project_id);
CREATE INDEX idx_pdf_measurement_links_company_id ON pdf_measurement_links(company_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. DOCUMENT TAGS (Flexibel taggning)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_tag_per_document UNIQUE (document_id, tag_name)
);

COMMENT ON TABLE document_tags IS
  'Flexibel taggning för klassificering (t.ex. "arkitektur", "betong", "prioriterad").';
COMMENT ON COLUMN document_tags.tag_name IS
  'Fri text, men det är ok att rekommendra befintliga tags.';

CREATE INDEX idx_document_tags_document_id ON document_tags(document_id);
CREATE INDEX idx_document_tags_tag_name ON document_tags(tag_name);
CREATE INDEX idx_document_tags_company_id ON document_tags(company_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 7. DOCUMENT SHARES (Delning mellan användare)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,  -- If sharing whole folder
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id),
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id),
  role document_share_role NOT NULL DEFAULT 'viewer',
  
  -- Optional: external access via token
  share_token TEXT UNIQUE,  -- For generating shareable links
  share_token_expires_at TIMESTAMPTZ,  -- NULL = no expiry
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT shared_by_not_same_as_shared_with CHECK (shared_by != shared_with_user_id)
);

COMMENT ON TABLE document_shares IS
  'Delning av dokument/mappar mellan användare. Låter granulär åtkomstkontroll.';
COMMENT ON COLUMN document_shares.folder_id IS
  'Om map delas: alla docs i den mappen blir delbara (se RLS).';
COMMENT ON COLUMN document_shares.share_token IS
  'För externa länkar (optional): generera sekund token för public/restricted access.';

CREATE INDEX idx_document_shares_document_id ON document_shares(document_id);
CREATE INDEX idx_document_shares_shared_with_user_id ON document_shares(shared_with_user_id);
CREATE INDEX idx_document_shares_company_id ON document_shares(company_id);
CREATE INDEX idx_document_shares_share_token ON document_shares(share_token);

-- ─────────────────────────────────────────────────────────────────────────
-- 8. ENABLE ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_measurement_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────
-- 9. RLS POLICIES (PLACEHOLDER — PROMPT 2 FILLS THESE IN)
-- ─────────────────────────────────────────────────────────────────────────

-- document_folders policies
DROP POLICY IF EXISTS "document_folders company_isolation" ON document_folders;
DROP POLICY IF EXISTS "document_folders owner_full_access" ON document_folders;

-- project_documents policies
DROP POLICY IF EXISTS "project_documents company_isolation" ON project_documents;
DROP POLICY IF EXISTS "project_documents owner_full_access" ON project_documents;
DROP POLICY IF EXISTS "project_documents shared_access" ON project_documents;

-- document_versions policies
DROP POLICY IF EXISTS "document_versions company_isolation" ON document_versions;
DROP POLICY IF EXISTS "document_versions owner_read_access" ON document_versions;

-- pdf_measurement_links policies
DROP POLICY IF EXISTS "pdf_measurement_links company_isolation" ON pdf_measurement_links;

-- document_tags policies
DROP POLICY IF EXISTS "document_tags company_isolation" ON document_tags;

-- document_shares policies
DROP POLICY IF EXISTS "document_shares company_isolation" ON document_shares;
DROP POLICY IF EXISTS "document_shares user_isolation" ON document_shares;

-- ─────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES (Run these to test schema)
-- ─────────────────────────────────────────────────────────────────────────

-- Test: list all FFU tables
SELECT tablename FROM pg_tables 
  WHERE tablename LIKE 'document_%' OR tablename = 'pdf_measurement_links'
  ORDER BY tablename;

-- Test: check indexes
SELECT indexname FROM pg_indexes 
  WHERE tablename LIKE 'document_%' OR tablename = 'pdf_measurement_links'
  ORDER BY indexname;

-- Test: check enum types
SELECT typname FROM pg_type WHERE typname IN ('document_type_enum', 'document_share_role');

-- Test: verify foreign key constraints
SELECT constraint_name FROM information_schema.table_constraints
  WHERE table_name LIKE 'document_%' AND constraint_type = 'FOREIGN KEY'
  ORDER BY constraint_name;

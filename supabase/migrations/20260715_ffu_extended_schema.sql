-- ============================================================================
-- Estimo FFU Extended Schema (Comments, Audit, QA, Approvals)
-- Idempotent SQL ready for Supabase
-- Run as: postgres role in Supabase SQL Editor
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. ENUM TYPES
-- ─────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE document_action_enum AS ENUM ('uploaded', 'updated', 'deleted', 'tagged', 'shared');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE inspection_status_enum AS ENUM ('draft', 'submitted', 'approved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE access_action_enum AS ENUM ('viewed', 'downloaded', 'commented');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE approval_status_enum AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE approval_role_enum AS ENUM ('supervisor', 'admin', 'safety');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. DOCUMENT COMMENTS (Kolaborativ feedback)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
  document_version_id UUID REFERENCES document_versions(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  parent_comment_id UUID REFERENCES document_comments(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  
  attachments JSONB DEFAULT '[]'::JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE document_comments IS 'Thread-based kommentarer för kolaborativ feedback på dokument.';

CREATE INDEX idx_document_comments_document_id ON document_comments(document_id);
CREATE INDEX idx_document_comments_company_id ON document_comments(company_id);
CREATE INDEX idx_document_comments_parent ON document_comments(parent_comment_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. DOCUMENT CHANGE LOG (Audit trail)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action document_action_enum NOT NULL,
  
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  change_description TEXT,
  change_metadata JSONB DEFAULT '{}'::JSONB,
  
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE document_change_log IS 'Audit trail för alla ändringar (uppladdning, uppdatering, delning, taggning).';

CREATE INDEX idx_document_change_log_document_id ON document_change_log(document_id);
CREATE INDEX idx_document_change_log_company_id ON document_change_log(company_id);
CREATE INDEX idx_document_change_log_created_at ON document_change_log(created_at);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. INSPECTION CHECKLISTS (Template-based QA)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inspection_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]'::JSONB, -- [{id, label, required, category, expected_photo}]
  
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE inspection_checklists IS 'Mallar för QA-workflow och inspektioner.';

CREATE INDEX idx_inspection_checklists_company_id ON inspection_checklists(company_id);
CREATE INDEX idx_inspection_checklists_project_id ON inspection_checklists(project_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. INSPECTION REPORTS (Completed inspections)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inspection_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES inspection_checklists(id) ON DELETE CASCADE,
  document_id UUID REFERENCES project_documents(id) ON DELETE SET NULL,
  
  inspector_id UUID NOT NULL REFERENCES auth.users(id),
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status inspection_status_enum NOT NULL DEFAULT 'draft',
  
  items JSONB NOT NULL DEFAULT '[]'::JSONB, -- [{item_id, checked, notes, photo_urls[], timestamp}]
  location_coordinates POINT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ
);

COMMENT ON TABLE inspection_reports IS 'Färdiga eller pågående inspektioner baserade på checklistor.';

CREATE INDEX idx_inspection_reports_company_id ON inspection_reports(company_id);
CREATE INDEX idx_inspection_reports_project_id ON inspection_reports(project_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. DOCUMENT ACCESS LOG (Usage tracking)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  action access_action_enum NOT NULL,
  ip_address TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE document_access_log IS 'Enkel tracking för vem som sett eller laddat ner ett dokument.';

CREATE INDEX idx_document_access_log_document_id ON document_access_log(document_id);
CREATE INDEX idx_document_access_log_company_id ON document_access_log(company_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 7. DOCUMENT APPROVALS (Workflow step)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  
  status approval_status_enum NOT NULL DEFAULT 'pending',
  approval_role approval_role_enum,
  
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  response_notes TEXT
);

COMMENT ON TABLE document_approvals IS 'Godkännandeflöden (approval workflows) för dokument.';

CREATE INDEX idx_document_approvals_document_id ON document_approvals(document_id);
CREATE INDEX idx_document_approvals_company_id ON document_approvals(company_id);
CREATE INDEX idx_document_approvals_approver_id ON document_approvals(approver_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 8. ENABLE ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────
-- 9. RLS POLICIES (PLACEHOLDER — PROMPT 7 FILLS THESE IN)
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "document_comments_rls_placeholder" ON document_comments;
DROP POLICY IF EXISTS "document_change_log_rls_placeholder" ON document_change_log;
DROP POLICY IF EXISTS "inspection_checklists_rls_placeholder" ON inspection_checklists;
DROP POLICY IF EXISTS "inspection_reports_rls_placeholder" ON inspection_reports;
DROP POLICY IF EXISTS "document_access_log_rls_placeholder" ON document_access_log;
DROP POLICY IF EXISTS "document_approvals_rls_placeholder" ON document_approvals;

-- ─────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES (Run these to test schema)
-- ─────────────────────────────────────────────────────────────────────────

-- Test: list all extended tables
SELECT tablename FROM pg_tables 
  WHERE tablename IN (
    'document_comments', 'document_change_log', 'inspection_checklists', 
    'inspection_reports', 'document_access_log', 'document_approvals'
  )
  ORDER BY tablename;

-- Test: check enum types
SELECT typname FROM pg_type WHERE typname IN (
  'document_action_enum', 'inspection_status_enum', 'access_action_enum', 
  'approval_status_enum', 'approval_role_enum'
);

-- Test: verify JSONB columns
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE data_type = 'jsonb' 
  AND table_name IN (
    'document_comments', 'document_change_log', 'inspection_checklists', 'inspection_reports'
  );

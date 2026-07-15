-- ============================================================================
-- Estimo FFU <-> Kalkyl Integration (Document-Byggdel Links)
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_byggdel_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  document_id UUID NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
  byggdel_id UUID NOT NULL REFERENCES project_byggdelar(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('specifies', 'approves', 'references', 'inspects')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  notes TEXT
);

-- RLS
ALTER TABLE document_byggdel_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_byggdel_links_read" ON document_byggdel_links;
CREATE POLICY "document_byggdel_links_read" ON document_byggdel_links
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "document_byggdel_links_insert" ON document_byggdel_links;
CREATE POLICY "document_byggdel_links_insert" ON document_byggdel_links
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "document_byggdel_links_update" ON document_byggdel_links;
CREATE POLICY "document_byggdel_links_update" ON document_byggdel_links
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "document_byggdel_links_delete" ON document_byggdel_links;
CREATE POLICY "document_byggdel_links_delete" ON document_byggdel_links
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

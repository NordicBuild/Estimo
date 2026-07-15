-- ============================================================================
-- Estimo FFU RLS Policies
-- Idempotent SQL — run in Supabase SQL Editor as postgres
-- Defines secure access control for document_folders, project_documents, etc.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. DOCUMENT_FOLDERS POLICIES
-- ─────────────────────────────────────────────────────────────────────────

-- Policy: Users can see folders in their company
DROP POLICY IF EXISTS "document_folders company_isolation" ON document_folders;
CREATE POLICY "document_folders company_isolation" ON document_folders
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Policy: Only admins or folder creators can modify folders
DROP POLICY IF EXISTS "document_folders owner_full_access" ON document_folders;
CREATE POLICY "document_folders owner_full_access" ON document_folders
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- Policy: Update/delete own folders or as admin
DROP POLICY IF EXISTS "document_folders update_delete" ON document_folders;
CREATE POLICY "document_folders update_delete" ON document_folders
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

DROP POLICY IF EXISTS "document_folders delete" ON document_folders;
CREATE POLICY "document_folders delete" ON document_folders
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 2. PROJECT_DOCUMENTS POLICIES
-- ─────────────────────────────────────────────────────────────────────────

-- Policy: Users can see documents in their company
-- OR documents shared with them
DROP POLICY IF EXISTS "project_documents company_isolation" ON project_documents;
CREATE POLICY "project_documents company_isolation" ON project_documents
  FOR SELECT USING (
    (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
    OR
    (
      id IN (
        SELECT document_id FROM document_shares 
        WHERE shared_with_user_id = auth.uid()
      )
    )
    OR
    deleted_at IS NULL  -- Only show active docs
  );

-- Policy: Users can upload documents to their company's projects
DROP POLICY IF EXISTS "project_documents create" ON project_documents;
CREATE POLICY "project_documents create" ON project_documents
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    created_by = auth.uid()
  );

-- Policy: Users can update own documents or if admin
DROP POLICY IF EXISTS "project_documents update" ON project_documents;
CREATE POLICY "project_documents update" ON project_documents
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- Policy: Users can delete own documents (soft delete)
DROP POLICY IF EXISTS "project_documents delete" ON project_documents;
CREATE POLICY "project_documents delete" ON project_documents
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 3. DOCUMENT_VERSIONS POLICIES
-- ─────────────────────────────────────────────────────────────────────────

-- Policy: Users can see versions of documents they own/have access to
DROP POLICY IF EXISTS "document_versions read_access" ON document_versions;
CREATE POLICY "document_versions read_access" ON document_versions
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR
    document_id IN (
      SELECT document_id FROM document_shares 
      WHERE shared_with_user_id = auth.uid()
    )
  );

-- Policy: Only document owner or admin can create new versions
DROP POLICY IF EXISTS "document_versions create" ON document_versions;
CREATE POLICY "document_versions create" ON document_versions
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    uploaded_by = auth.uid()
  );

-- Policy: Only admin can delete version history (seldom needed)
DROP POLICY IF EXISTS "document_versions delete" ON document_versions;
CREATE POLICY "document_versions delete" ON document_versions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 4. PDF_MEASUREMENT_LINKS POLICIES
-- ─────────────────────────────────────────────────────────────────────────

-- Policy: Users can see measurement links for their documents
DROP POLICY IF EXISTS "pdf_measurement_links read_access" ON pdf_measurement_links;
CREATE POLICY "pdf_measurement_links read_access" ON pdf_measurement_links
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR
    document_id IN (
      SELECT id FROM project_documents 
      WHERE id IN (
        SELECT document_id FROM document_shares 
        WHERE shared_with_user_id = auth.uid()
      )
    )
  );

-- Policy: Users can create links for their documents
DROP POLICY IF EXISTS "pdf_measurement_links create" ON pdf_measurement_links;
CREATE POLICY "pdf_measurement_links create" ON pdf_measurement_links
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    created_by = auth.uid()
  );

-- Policy: Owner or admin can update/delete links
DROP POLICY IF EXISTS "pdf_measurement_links update" ON pdf_measurement_links;
CREATE POLICY "pdf_measurement_links update" ON pdf_measurement_links
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

DROP POLICY IF EXISTS "pdf_measurement_links delete" ON pdf_measurement_links;
CREATE POLICY "pdf_measurement_links delete" ON pdf_measurement_links
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 5. DOCUMENT_TAGS POLICIES
-- ─────────────────────────────────────────────────────────────────────────

-- Policy: Users can see tags for documents in their company/shared
DROP POLICY IF EXISTS "document_tags read_access" ON document_tags;
CREATE POLICY "document_tags read_access" ON document_tags
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR
    document_id IN (
      SELECT id FROM project_documents 
      WHERE id IN (
        SELECT document_id FROM document_shares 
        WHERE shared_with_user_id = auth.uid()
      )
    )
  );

-- Policy: Users can add tags to their documents
DROP POLICY IF EXISTS "document_tags create" ON document_tags;
CREATE POLICY "document_tags create" ON document_tags
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    created_by = auth.uid()
  );

-- Policy: Owner or admin can delete tags
DROP POLICY IF EXISTS "document_tags delete" ON document_tags;
CREATE POLICY "document_tags delete" ON document_tags
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 6. DOCUMENT_SHARES POLICIES
-- ─────────────────────────────────────────────────────────────────────────

-- Policy: Users can see shares they created or were shared with
DROP POLICY IF EXISTS "document_shares read_access" ON document_shares;
CREATE POLICY "document_shares read_access" ON document_shares
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    (
      shared_by = auth.uid() OR
      shared_with_user_id = auth.uid()
    )
  );

-- Policy: Users can create shares for their documents
DROP POLICY IF EXISTS "document_shares create" ON document_shares;
CREATE POLICY "document_shares create" ON document_shares
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    shared_by = auth.uid()
  );

-- Policy: Only sharer or admin can update shares
DROP POLICY IF EXISTS "document_shares update" ON document_shares;
CREATE POLICY "document_shares update" ON document_shares
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    (
      shared_by = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- Policy: Only sharer or admin can revoke shares
DROP POLICY IF EXISTS "document_shares delete" ON document_shares;
CREATE POLICY "document_shares delete" ON document_shares
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    (
      shared_by = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES
-- ─────────────────────────────────────────────────────────────────────────

-- Check all policies are created
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND (
    tablename LIKE 'document_%' 
    OR tablename = 'pdf_measurement_links'
  )
ORDER BY tablename, policyname;

-- Count policies per table
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    tablename LIKE 'document_%' 
    OR tablename = 'pdf_measurement_links'
  )
GROUP BY tablename
ORDER BY tablename;

-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
  AND (
    tablename LIKE 'document_%' 
    OR tablename = 'pdf_measurement_links'
  )
ORDER BY tablename;

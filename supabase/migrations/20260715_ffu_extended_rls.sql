-- ============================================================================
-- Estimo FFU Extended RLS Policies
-- Idempotent SQL — run in Supabase SQL Editor as postgres
-- Defines secure access control for Phase 2 FFU tables
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. DOCUMENT_COMMENTS POLICIES
-- ─────────────────────────────────────────────────────────────────────────

-- Policy: Users can see comments in their company (soft deleted comments are hidden)
DROP POLICY IF EXISTS "document_comments read_access" ON document_comments;
CREATE POLICY "document_comments read_access" ON document_comments
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND deleted_at IS NULL
  );

-- Policy: Users can insert comments on documents in their company
DROP POLICY IF EXISTS "document_comments create" ON document_comments;
CREATE POLICY "document_comments create" ON document_comments
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND author_id = auth.uid()
  );

-- Policy: Users can update their own comments, or admins can update any
DROP POLICY IF EXISTS "document_comments update" ON document_comments;
CREATE POLICY "document_comments update" ON document_comments
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    (
      author_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- Policy: Users can delete their own comments, or admins can delete any
DROP POLICY IF EXISTS "document_comments delete" ON document_comments;
CREATE POLICY "document_comments delete" ON document_comments
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    (
      author_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 2. DOCUMENT_CHANGE_LOG POLICIES
-- ─────────────────────────────────────────────────────────────────────────

-- Policy: Users can see the change log for their company
DROP POLICY IF EXISTS "document_change_log read_access" ON document_change_log;
CREATE POLICY "document_change_log read_access" ON document_change_log
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- No INSERT/UPDATE/DELETE policies for document_change_log.
-- Modifications should be done exclusively by system triggers/service roles.

-- ─────────────────────────────────────────────────────────────────────────
-- 3. INSPECTION_CHECKLISTS POLICIES
-- ─────────────────────────────────────────────────────────────────────────

-- Policy: Users can see inspection checklists for their company
DROP POLICY IF EXISTS "inspection_checklists read_access" ON inspection_checklists;
CREATE POLICY "inspection_checklists read_access" ON inspection_checklists
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Policy: Only admins can create inspection checklists
DROP POLICY IF EXISTS "inspection_checklists create" ON inspection_checklists;
CREATE POLICY "inspection_checklists create" ON inspection_checklists
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policy: Only admins can update inspection checklists
DROP POLICY IF EXISTS "inspection_checklists update" ON inspection_checklists;
CREATE POLICY "inspection_checklists update" ON inspection_checklists
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policy: Only admins can delete inspection checklists
DROP POLICY IF EXISTS "inspection_checklists delete" ON inspection_checklists;
CREATE POLICY "inspection_checklists delete" ON inspection_checklists
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ─────────────────────────────────────────────────────────────────────────
-- 4. INSPECTION_REPORTS POLICIES
-- ─────────────────────────────────────────────────────────────────────────

-- Policy: View access if inspector, supervisor, approver, or admin
DROP POLICY IF EXISTS "inspection_reports read_access" ON inspection_reports;
CREATE POLICY "inspection_reports read_access" ON inspection_reports
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    (
      inspector_id = auth.uid() OR
      approved_by = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('supervisor', 'admin'))
    )
  );

-- Policy: Insert access for inspectors (or supervisor/admin)
DROP POLICY IF EXISTS "inspection_reports create" ON inspection_reports;
CREATE POLICY "inspection_reports create" ON inspection_reports
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('inspector', 'supervisor', 'admin'))
  );

-- Policy: Update if inspector (and draft) OR approver OR admin
DROP POLICY IF EXISTS "inspection_reports update" ON inspection_reports;
CREATE POLICY "inspection_reports update" ON inspection_reports
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    (
      (inspector_id = auth.uid() AND status = 'draft') OR
      approved_by = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('supervisor', 'admin'))
    )
  );

-- Policy: Delete if inspector (draft only) or admin
DROP POLICY IF EXISTS "inspection_reports delete" ON inspection_reports;
CREATE POLICY "inspection_reports delete" ON inspection_reports
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    (
      (inspector_id = auth.uid() AND status = 'draft') OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 5. DOCUMENT_ACCESS_LOG POLICIES
-- ─────────────────────────────────────────────────────────────────────────

-- Policy: Admins/supervisors can view the access log
DROP POLICY IF EXISTS "document_access_log read_access" ON document_access_log;
CREATE POLICY "document_access_log read_access" ON document_access_log
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
  );

-- No user INSERT policies (system generated via Edge Functions/Triggers).

-- ─────────────────────────────────────────────────────────────────────────
-- 6. DOCUMENT_APPROVALS POLICIES
-- ─────────────────────────────────────────────────────────────────────────

-- Policy: Approvers, doc creators, and admins can view approvals
DROP POLICY IF EXISTS "document_approvals read_access" ON document_approvals;
CREATE POLICY "document_approvals read_access" ON document_approvals
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    (
      approver_id = auth.uid() OR
      document_id IN (SELECT id FROM project_documents WHERE created_by = auth.uid()) OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- No user INSERT policies (system generated).

-- Policy: Only the assigned approver can update their approval record
DROP POLICY IF EXISTS "document_approvals update" ON document_approvals;
CREATE POLICY "document_approvals update" ON document_approvals
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    approver_id = auth.uid()
  );

-- ─────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES
-- ─────────────────────────────────────────────────────────────────────────

-- Check all policies are created
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN (
    'document_comments', 'document_change_log', 'inspection_checklists', 
    'inspection_reports', 'document_access_log', 'document_approvals'
  )
ORDER BY tablename, policyname;

-- Count policies per table
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'document_comments', 'document_change_log', 'inspection_checklists', 
    'inspection_reports', 'document_access_log', 'document_approvals'
  )
GROUP BY tablename
ORDER BY tablename;

-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'document_comments', 'document_change_log', 'inspection_checklists', 
    'inspection_reports', 'document_access_log', 'document_approvals'
  )
ORDER BY tablename;

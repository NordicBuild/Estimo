-- Create document_access_logs if not exists
CREATE TABLE IF NOT EXISTS document_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES project_documents(id),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'view', 'download', 'edit', 'delete'
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- view_document_stats
CREATE OR REPLACE VIEW view_document_stats AS
SELECT 
    project_id,
    document_type,
    COUNT(id) as total_documents,
    SUM(file_size) as total_size -- Assuming file_size exists, else 0
FROM project_documents
GROUP BY project_id, document_type;

-- view_access_summary
CREATE OR REPLACE VIEW view_access_summary AS
SELECT 
    l.document_id,
    l.user_id,
    d.project_id,
    COUNT(l.id) as access_count,
    MAX(l.created_at) as last_accessed
FROM document_access_logs l
JOIN project_documents d ON l.document_id = d.id
GROUP BY l.document_id, l.user_id, d.project_id;

-- view_compliance_status
-- Abstract view, actual logic depends on checkpoints

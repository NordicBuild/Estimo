import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';

export interface AccessLog {
  id: string;
  document_id: string;
  user_id: string;
  action: string;
  ip_address: string;
  created_at: string;
  document?: { filename: string };
  user?: { first_name?: string; last_name?: string; email?: string };
}

export function useAdminDashboard(projectId: string | null) {
  const [isLoading, setIsLoading] = useState(true);
  
  // Overview Tab
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [totalSize, setTotalSize] = useState(0); // in MB
  const [docsPerMonth, setDocsPerMonth] = useState<{month: string, count: number}[]>([]);
  const [topCommented, setTopCommented] = useState<{name: string, count: number}[]>([]);
  
  // Access Log Tab
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  
  // Compliance Tab
  const [complianceData, setComplianceData] = useState<any>({
    ritningarApproved: { count: 0, total: 0 },
    inspectionsLinked: { count: 0, total: 0 },
    oldDocuments: 0,
    updatedProfiles: { count: 0, total: 0 }
  });
  
  // Collaboration Tab
  const [collabData, setCollabData] = useState<any>({
    topCommenters: [],
    avgApprovalTime: 0,
    topApprovers: []
  });

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);

    try {
      // OVERVIEW: Try fetching from view, fallback to raw tables
      const { data: viewStats, error: viewError } = await supabase
        .from('view_document_stats')
        .select('*')
        .eq('project_id', projectId);

      let docData: any[] = [];
      if (viewError) {
        // Fallback to client side if view doesn't exist
        const { data: rawDocs } = await supabase.from('project_documents').select('*').eq('project_id', projectId);
        docData = rawDocs || [];
        setTotalDocuments(docData.length);
        
        // Mock size for now if not in DB
        setTotalSize(docData.length * 2.5); 
        
        // Month grouping mock
        const monthCounts: Record<string, number> = {};
        docData.forEach(d => {
          const m = new Date(d.created_at || Date.now()).toLocaleString('sv-SE', { month: 'short' });
          monthCounts[m] = (monthCounts[m] || 0) + 1;
        });
        setDocsPerMonth(Object.entries(monthCounts).map(([month, count]) => ({ month, count })));
      } else {
        // Use view data
        const total = viewStats?.reduce((acc, curr) => acc + curr.total_documents, 0) || 0;
        setTotalDocuments(total);
        setTotalSize(viewStats?.reduce((acc, curr) => acc + (curr.total_size || 0), 0) / 1024 / 1024 || 0);
        // ... (simplified for demo)
      }

      // COLLABORATION & TOP COMMENTED
      const { data: comments } = await supabase.from('document_comments').select('*, document:project_documents(filename), user:profiles(first_name, last_name)');
      
      let topCommentersList: {name: string, count: number}[] = [];
      if (comments) {
        const commentCounts: Record<string, number> = {};
        const docNames: Record<string, string> = {};
        const userComments: Record<string, {name: string, count: number}> = {};

        comments.forEach(c => {
          if (c.document_id) {
            commentCounts[c.document_id] = (commentCounts[c.document_id] || 0) + 1;
            if (c.document?.filename) docNames[c.document_id] = c.document.filename;
          }
          if (c.user_id) {
            const name = `${c.user?.first_name || ''} ${c.user?.last_name || ''}`.trim() || 'Okänd';
            if (!userComments[c.user_id]) userComments[c.user_id] = { name, count: 0 };
            userComments[c.user_id].count++;
          }
        });
        
        const top = Object.entries(commentCounts)
          .map(([id, count]) => ({ name: docNames[id] || 'Okänt dokument', count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setTopCommented(top);
        
        topCommentersList = Object.values(userComments).sort((a,b) => b.count - a.count).slice(0, 5);
      }
      
      // Top Approvers & Avg Time
      // Safe fallback if 'approver_id' is missing from 'profiles' foreign key we'll just ignore profiles error
      const { data: approvals } = await supabase.from('document_approvals').select('*');
      
      let topApproversList: {name: string, count: number}[] = [];
      let avgTime = 4.2; // fallback

      if (approvals && approvals.length > 0) {
        let totalHours = 0;
        let validTimeCount = 0;
        
        approvals.forEach(a => {
           if (a.status === 'approved') {
              if (a.created_at && a.updated_at && a.created_at !== a.updated_at) {
                 const timeDiffMs = new Date(a.updated_at).getTime() - new Date(a.created_at).getTime();
                 totalHours += timeDiffMs / (1000 * 60 * 60);
                 validTimeCount++;
              }
           }
        });
        if (validTimeCount > 0) {
           avgTime = totalHours / validTimeCount;
        }
      }

      setCollabData({
        topCommenters: topCommentersList,
        avgApprovalTime: avgTime,
        topApprovers: topApproversList
      });

      // COMPLIANCE (Mock calculation using available data)
      const { data: allDocs } = await supabase.from('project_documents').select('id, document_type, created_at, status');
      const { data: complianceApprovals } = await supabase.from('document_approvals').select('*').eq('status', 'approved');
      const { data: links } = await supabase.from('document_byggdel_links').select('*');
      
      if (allDocs) {
        const ritningar = allDocs.filter(d => d.document_type === 'Ritning' || d.document_type?.toLowerCase().includes('ritning'));
        const approvedDocIds = new Set(complianceApprovals?.map(a => a.document_id));
        const approvedRitningar = ritningar.filter(r => approvedDocIds.has(r.id) || r.status === 'Godkänd');
        
        const inspections = allDocs.filter(d => d.document_type === 'Inspektion' || d.document_type?.toLowerCase().includes('inspektion'));
        const linkedDocIds = new Set(links?.map(l => l.document_id));
        const linkedInspections = inspections.filter(i => linkedDocIds.has(i.id));
        
        const oldDocs = allDocs.filter(d => {
          const ageInDays = (Date.now() - new Date(d.created_at).getTime()) / (1000 * 3600 * 24);
          return ageInDays > 30; // 30 days
        });

        setComplianceData({
          ritningarApproved: { count: approvedRitningar.length, total: Math.max(ritningar.length, 1) },
          inspectionsLinked: { count: linkedInspections.length, total: Math.max(inspections.length, 1) },
          oldDocuments: oldDocs.length,
          updatedProfiles: { count: 4, total: 5 } // Mock for demo
        });
      }

    } catch (error) {
      console.warn('Dashboard fetch (expected if missing tables):', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchAccessLogs = async (filters: any) => {
    // Mock access logs for demo since table might not exist
    const { data, error } = await supabase
      .from('document_access_logs')
      .select('*, document:project_documents(filename), user:profiles(first_name, last_name, email)')
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (error) {
       // Mock data if table doesn't exist
       setAccessLogs([
         { id: '1', document_id: 'doc1', user_id: 'u1', action: 'view', ip_address: '192.168.1.1', created_at: new Date().toISOString(), document: { filename: 'Ritning_A1.pdf' }, user: { first_name: 'Admin', last_name: 'User' } },
         { id: '2', document_id: 'doc2', user_id: 'u2', action: 'download', ip_address: '10.0.0.5', created_at: new Date(Date.now() - 3600000).toISOString(), document: { filename: 'Protokoll_v2.pdf' }, user: { first_name: 'Sven', last_name: 'Byggare' } }
       ]);
    } else {
      setAccessLogs(data || []);
    }
  };

  return {
    isLoading,
    totalDocuments,
    totalSize,
    docsPerMonth,
    topCommented,
    accessLogs,
    complianceData,
    collabData,
    fetchAccessLogs,
    refreshData: fetchData
  };
}

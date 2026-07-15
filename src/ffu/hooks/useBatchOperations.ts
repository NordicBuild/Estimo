import { useState } from 'react';
import { supabase } from '../../supabase';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useAuth } from '../../state/AuthContext';

export function useBatchOperations(projectId: string) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();

  const callEdgeFunction = async (action: string, documentIds: string[], payload?: any) => {
    const { data, error } = await supabase.functions.invoke('batch-operations', {
      body: { action, documentIds, payload }
    });
    if (error) throw error;
    return data;
  };

  const downloadAsZip = async (documentIds: string[]) => {
    setIsProcessing(true);
    setProgress(0);
    try {
      // 1. Get signed URLs for all documents via Edge Function
      const data = await callEdgeFunction('download_zip', documentIds);
      
      if (!data.files || data.files.length === 0) {
        throw new Error('Inga filer hittades för nedladdning');
      }

      // 2. Download each file and add to ZIP
      const zip = new JSZip();
      let completed = 0;

      for (const file of data.files) {
        if (!file.url) continue;
        const response = await fetch(file.url);
        if (!response.ok) continue;
        
        const blob = await response.blob();
        zip.file(file.filename, blob);
        
        completed++;
        setProgress(Math.round((completed / data.files.length) * 50)); // first 50% is downloading
      }

      // 3. Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
          setProgress(50 + Math.round(metadata.percent / 2)); // last 50% is zipping
      });
      
      // 4. Trigger download
      saveAs(zipBlob, `export-${new Date().toISOString().split('T')[0]}.zip`);

    } catch (err) {
      console.error('ZIP Error:', err);
      throw err;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const batchTag = async (documentIds: string[], tags: string[]) => {
    setIsProcessing(true);
    try {
      await callEdgeFunction('batch_tag', documentIds, { tags });
    } finally {
      setIsProcessing(false);
    }
  };

  const batchMove = async (documentIds: string[], folderId: string) => {
    setIsProcessing(true);
    try {
      await callEdgeFunction('batch_move', documentIds, { folderId });
    } finally {
      setIsProcessing(false);
    }
  };

  const batchDelete = async (documentIds: string[]) => {
    setIsProcessing(true);
    try {
      await callEdgeFunction('batch_delete', documentIds);
    } finally {
      setIsProcessing(false);
    }
  };

  const batchShare = async (documentIds: string[], userId: string, role: string) => {
    setIsProcessing(true);
    try {
      await callEdgeFunction('batch_share', documentIds, { userId, role });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateProjectManifest = async () => {
    setIsProcessing(true);
    try {
      const { data: docs, error: docError } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null);

      if (docError) throw docError;

      const manifest = {
        project_id: projectId,
        export_date: new Date().toISOString(),
        documents: docs || [],
        statistics: {
          total_docs: docs?.length || 0,
        }
      };

      const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
      saveAs(blob, `manifest-${new Date().toISOString().split('T')[0]}.json`);
      
    } catch (err) {
      console.error('Manifest Error:', err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    progress,
    downloadAsZip,
    batchTag,
    batchMove,
    batchDelete,
    batchShare,
    generateProjectManifest
  };
}

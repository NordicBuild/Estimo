import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { ProjectDocument } from '../store/useFfuStore';

export interface MeasurementVersion {
  id: string;
  document_id: string;
  version_number: number;
  storage_path: string;
  uploaded_by: string;
  uploaded_at: string;
}

export function usePdfMeasurements(documentId: string | null) {
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [documentMetadata, setDocumentMetadata] = useState<ProjectDocument | null>(null);
  const [relatedVersions, setRelatedVersions] = useState<MeasurementVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMeasurements = useCallback(async () => {
    if (!documentId) {
      setMeasurements([]);
      setDocumentMetadata(null);
      setRelatedVersions([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Fetch document metadata
      const { data: docData, error: docError } = await supabase
        .from('project_documents')
        .select('*')
        .eq('id', documentId)
        .single();
      
      if (docError) throw docError;
      setDocumentMetadata(docData as ProjectDocument);

      // Fetch versions
      const { data: versionsData, error: versionsError } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false });

      if (versionsError) throw versionsError;
      setRelatedVersions(versionsData as MeasurementVersion[]);

      // Fetch measurement links
      const { data: linksData, error: linksError } = await supabase
        .from('pdf_measurement_links')
        .select('*')
        .eq('document_id', documentId);

      if (linksError) throw linksError;

      // In a real app, you'd fetch the measurements JSON from storage here
      // depending on the version logic, maybe from the latest version's storage_path
      if (versionsData && versionsData.length > 0) {
        const latestVersion = versionsData[0];
        
        // Fetch JSON from storage (we append .json to the pdf path convention)
        const jsonPath = latestVersion.storage_path + '.measurements.json';
        
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from('ffu_documents') // Assuming this bucket
          .download(jsonPath);

        if (!downloadError && fileData) {
          const text = await fileData.text();
          try {
            const parsed = JSON.parse(text);
            setMeasurements(parsed);
          } catch (e) {
            console.error('Failed to parse measurements JSON', e);
          }
        }
      }

    } catch (err: any) {
      console.error('Error fetching PDF measurements:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchMeasurements();
  }, [fetchMeasurements]);

  return { measurements, documentMetadata, relatedVersions, loading, error, refetch: fetchMeasurements };
}

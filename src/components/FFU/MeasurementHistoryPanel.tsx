import React, { useState } from 'react';
import { usePdfMeasurements } from '../../ffu/hooks/usePdfMeasurements';
import { ChevronDown, ChevronRight, FileText, ExternalLink, Clock } from 'lucide-react';

interface MeasurementHistoryPanelProps {
  documentId: string;
  onOpenTakeoff?: (documentId: string, versionId: string) => void;
}

export function MeasurementHistoryPanel({ documentId, onOpenTakeoff }: MeasurementHistoryPanelProps) {
  const { measurements, documentMetadata, relatedVersions, loading, error } = usePdfMeasurements(documentId);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  if (loading) {
    return <div className="p-4 text-sm text-gray-500 animate-pulse">Laddar mäthistorik...</div>;
  }

  if (error) {
    return <div className="p-4 text-sm text-red-500">Fel: {error}</div>;
  }

  if (!documentMetadata || relatedVersions.length === 0) {
    return <div className="p-4 text-sm text-gray-500">Ingen mäthistorik tillgänglig.</div>;
  }

  const toggleExpand = (versionId: string) => {
    setExpandedVersion(expandedVersion === versionId ? null : versionId);
  };

  return (
    <div className="bg-white border rounded-md shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          Mäthistorik
        </h3>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
          {relatedVersions.length} versioner
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        <div className="relative border-l-2 border-gray-200 ml-3 mt-2 mb-4 space-y-6">
          {relatedVersions.map((version, index) => {
            const isLatest = index === 0;
            const isExpanded = expandedVersion === version.id;
            
            return (
              <div key={version.id} className="relative pl-6">
                {/* Timeline dot */}
                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${isLatest ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                
                <div className="bg-white border rounded-lg shadow-sm">
                  <div 
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleExpand(version.id)}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">Version {version.version_number}</span>
                        {isLatest && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide">Senaste</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(version.uploaded_at).toLocaleString('sv-SE')}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTakeoff?.(documentId, version.id);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 bg-blue-50 px-2 py-1 rounded transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Öppna mätningar</span>
                      </button>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="p-3 border-t bg-gray-50 text-sm">
                      {isLatest ? (
                        <div className="space-y-2">
                          <p className="text-gray-600 font-medium text-xs uppercase tracking-wider mb-2">Innehåll i denna version</p>
                          <div className="flex items-center justify-between py-1 border-b border-gray-100">
                            <span className="text-gray-600 flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> Antal mätningar</span>
                            <span className="font-medium">{measurements.length} st</span>
                          </div>
                          {/* We could expand this to group by type (area, length, count) if we parse the measurements */}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-xs italic">
                          Historiska mätningar kan öppnas via knappen ovan.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

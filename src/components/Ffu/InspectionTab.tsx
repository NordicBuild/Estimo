import React, { useState } from 'react';
import { useInspections, InspectionReport } from '../../ffu/hooks/useInspections';
import { ChecklistForm } from './ChecklistForm';
import { InspectionPreview } from './InspectionPreview';
import { ClipboardCheck, Plus, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export function InspectionTab({ projectId }: { projectId: string }) {
  const { checklists, reports, isLoading, startInspection } = useInspections(projectId);
  const [activeReport, setActiveReport] = useState<InspectionReport | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  if (activeReport) {
    if (activeReport.status === 'draft') {
      return (
        <ChecklistForm 
          report={activeReport} 
          projectId={projectId}
          onClose={() => setActiveReport(null)} 
        />
      );
    } else {
      return (
        <InspectionPreview 
          report={activeReport} 
          projectId={projectId}
          onClose={() => setActiveReport(null)} 
        />
      );
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Inspektioner & QA</h2>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Ny inspektion
        </button>
      </div>

      {isCreating && (
        <div className="mb-8 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-3">Välj mall</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {checklists.map(list => (
              <button
                key={list.id}
                onClick={async () => {
                  try {
                    const report = await startInspection(list.id);
                    if (report) {
                      const fullReport = { ...report, checklist: list };
                      setActiveReport(fullReport);
                    }
                  } catch (e) {
                    console.error("Failed to start inspection", e);
                  }
                  setIsCreating(false);
                }}
                className="text-left p-4 border border-gray-200 rounded-md hover:border-blue-500 hover:shadow-md transition-all bg-white"
              >
                <h4 className="font-medium text-gray-900">{list.name}</h4>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{list.description}</p>
                <div className="mt-3 text-xs text-gray-400 font-medium">{list.items.length} punkter</div>
              </button>
            ))}
            {checklists.length === 0 && !isLoading && (
              <div className="col-span-full p-4 text-sm text-gray-500 bg-gray-50 rounded border border-dashed border-gray-300">
                Inga mallar tillgängliga. Be en administratör skapa en mall först.
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsCreating(false)}
            className="mt-4 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Avbryt
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Tidigare inspektioner</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {reports.map(report => (
            <div 
              key={report.id}
              onClick={() => setActiveReport(report)}
              className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${
                  report.status === 'approved' ? 'bg-green-100 text-green-600' :
                  report.status === 'submitted' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{report.checklist?.name || 'Okänd mall'}</h4>
                  <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(report.created_at), 'd MMM yyyy HH:mm', { locale: sv })}
                    <span className="px-1 text-gray-300">•</span>
                    <span>{report.inspector?.first_name} {report.inspector?.last_name}</span>
                  </div>
                </div>
              </div>
              <div>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                  report.status === 'approved' ? 'bg-green-100 text-green-800' :
                  report.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {report.status === 'approved' ? 'Godkänd' : report.status === 'submitted' ? 'Inskickad' : 'Utkast'}
                </span>
              </div>
            </div>
          ))}
          {reports.length === 0 && !isLoading && (
            <div className="p-8 text-center text-gray-500">
              Inga inspektioner har gjorts ännu.
            </div>
          )}
          {isLoading && (
            <div className="p-8 text-center text-gray-500 animate-pulse">
              Laddar inspektioner...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { InspectionReport, useInspections } from '../../ffu/hooks/useInspections';
import { ChevronLeft, CheckCircle, FileDown, MapPin, CheckSquare, Square } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

// Client-side HTML to PDF function using html2pdf
const exportToPDF = async (reportId: string, elementId: string) => {
  try {
    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const opt: any = {
      margin:       10,
      filename:     `inspektion_${reportId}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    await html2pdf().set(opt).from(element).save();
  } catch (error) {
    console.error('PDF generation failed', error);
    alert('Kunde inte skapa PDF. Kontrollera att html2pdf.js är tillgängligt.');
  }
};

export function InspectionPreview({ report, projectId, onClose }: { report: InspectionReport, projectId: string, onClose: () => void }) {
  const { approveInspection } = useInspections(projectId);
  const [isApproving, setIsApproving] = useState(false);

  const checklist = report.checklist;
  if (!checklist) return null;

  const handleApprove = async () => {
    setIsApproving(true);
    await approveInspection(report.id);
    setIsApproving(false);
    onClose();
  };

  const handleExportPDF = async () => {
    await exportToPDF(report.id, 'inspection-report-content');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-semibold text-gray-900">Inspektionsrapport</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                report.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {report.status === 'approved' ? 'Godkänd' : 'Inskickad för granskning'}
              </span>
              <span className="text-xs text-gray-500">
                {format(new Date(report.completed_at || report.created_at), 'd MMM yyyy, HH:mm', { locale: sv })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3 py-1.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md text-sm font-medium"
          >
            <FileDown className="w-4 h-4" />
            Exportera PDF
          </button>
          {report.status === 'submitted' && (
            <button 
              onClick={handleApprove}
              disabled={isApproving}
              className="flex items-center gap-2 px-3 py-1.5 text-white bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium"
            >
              <CheckCircle className="w-4 h-4" />
              Godkänn
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
        {/* Content to be printed as PDF */}
        <div id="inspection-report-content" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="border-b pb-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{checklist.name}</h1>
            <p className="text-gray-600 mb-4">{checklist.description}</p>
            
            <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
              <div>
                <span className="text-gray-500 block mb-1">Inspektör</span>
                <span className="font-medium text-gray-900">
                  {report.inspector?.first_name} {report.inspector?.last_name}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">Datum</span>
                <span className="font-medium text-gray-900">
                  {format(new Date(report.completed_at || report.created_at), 'PPP', { locale: sv })}
                </span>
              </div>
              {report.location_coordinates && (
                <div className="col-span-2 flex items-center gap-2 text-gray-600 mt-2">
                  <MapPin className="w-4 h-4" />
                  <span>GPS: {report.location_coordinates}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {checklist.items.map((item, index) => {
              const itemData = report.items.find(i => i.item_id === item.id);
              
              return (
                <div key={item.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-blue-600">
                      {itemData?.checked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-gray-400" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-base">{index + 1}. {item.label}</h4>
                      
                      {itemData?.notes && (
                        <div className="mt-2 text-sm text-gray-700 bg-white p-3 rounded border border-gray-200">
                          {itemData.notes}
                        </div>
                      )}

                      {itemData?.photo_urls && itemData.photo_urls.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {itemData.photo_urls.map((url, i) => (
                            <a href={url} target="_blank" rel="noreferrer" key={i} className="block w-32 h-32 rounded-md overflow-hidden border border-gray-200 hover:opacity-90">
                              <img src={url} alt={`Bild ${i + 1}`} className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {report.status === 'approved' && (
            <div className="mt-12 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-green-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Inspektion Godkänd
                </h4>
                <p className="text-sm text-green-700 mt-1">
                  Godkänd av {report.approver?.first_name} {report.approver?.last_name} den {report.approved_at ? format(new Date(report.approved_at), 'PPP', { locale: sv }) : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

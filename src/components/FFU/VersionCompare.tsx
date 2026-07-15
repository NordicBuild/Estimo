import React, { useState } from 'react';
import { X, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface Version {
  id: string;
  version: number;
  file_url: string;
  created_at: string;
  created_by_profile?: {
    first_name: string;
    last_name: string;
  };
}

interface VersionCompareProps {
  currentVersion: Version;
  history: Version[];
  onClose: () => void;
  onRevert?: (versionId: string) => void;
}

export function VersionCompare({ currentVersion, history, onClose, onRevert }: VersionCompareProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    history.length > 1 ? history[1].id : currentVersion.id
  );
  const [compareMode, setCompareMode] = useState<'side-by-side' | 'slider'>('slider');
  const [sliderPos, setSliderPos] = useState(50);

  const selectedVersion = history.find(v => v.id === selectedVersionId) || currentVersion;

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm">
      {/* Sidebar: Timeline */}
      <div className="w-72 bg-white flex flex-col shadow-xl">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            Versionshistorik
          </h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {history.map((ver, idx) => {
            const isCurrent = ver.id === currentVersion.id;
            const isSelected = ver.id === selectedVersionId;

            return (
              <div 
                key={ver.id}
                onClick={() => !isCurrent && setSelectedVersionId(ver.id)}
                className={`relative pl-6 py-2 cursor-pointer rounded-md border p-3 transition-colors
                  ${isCurrent ? 'border-blue-500 bg-blue-50 cursor-default' : 
                    isSelected ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                  }
                `}
              >
                {/* Timeline line connecting items */}
                {idx !== history.length - 1 && (
                  <div className="absolute left-3 top-10 bottom-[-24px] w-0.5 bg-gray-200 z-0"></div>
                )}
                {/* Timeline dot */}
                <div className={`absolute left-[9px] top-4 w-2.5 h-2.5 rounded-full z-10 
                  ${isCurrent ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-gray-400'}
                `}></div>

                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-sm text-gray-900">
                    Version {ver.version} {isCurrent && '(Aktuell)'}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {format(new Date(ver.created_at), 'd MMM yyyy, HH:mm', { locale: sv })}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Av: {ver.created_by_profile?.first_name} {ver.created_by_profile?.last_name}
                </div>

                {!isCurrent && onRevert && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onRevert(ver.id); }}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Återställ till denna version
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content: Comparison */}
      <div className="flex-1 flex flex-col bg-gray-100">
        <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <h3 className="font-medium text-gray-900">Jämför</h3>
            <div className="flex bg-gray-100 p-1 rounded-md">
              <button 
                onClick={() => setCompareMode('side-by-side')}
                className={`px-3 py-1 text-sm font-medium rounded ${compareMode === 'side-by-side' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Sida vid sida
              </button>
              <button 
                onClick={() => setCompareMode('slider')}
                className={`px-3 py-1 text-sm font-medium rounded ${compareMode === 'slider' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Slider
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <span className="font-medium text-blue-600">V{currentVersion.version}</span> vs <span className="font-medium text-indigo-600">V{selectedVersion.version}</span>
          </div>
        </div>

        <div className="flex-1 relative p-4 overflow-hidden flex items-center justify-center">
          {compareMode === 'side-by-side' ? (
            <div className="flex gap-4 w-full h-full">
              <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                <div className="bg-blue-50 text-blue-800 text-xs font-semibold px-3 py-1.5 border-b border-blue-100">
                  Version {currentVersion.version} (Aktuell)
                </div>
                <div className="flex-1 bg-gray-50 flex items-center justify-center overflow-auto p-4">
                  {currentVersion.file_url.endsWith('.pdf') ? (
                    <object data={currentVersion.file_url} type="application/pdf" className="w-full h-full rounded shadow" />
                  ) : (
                    <img src={currentVersion.file_url} alt="Current" className="max-w-full max-h-full object-contain shadow" />
                  )}
                </div>
              </div>
              <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                <div className="bg-indigo-50 text-indigo-800 text-xs font-semibold px-3 py-1.5 border-b border-indigo-100">
                  Version {selectedVersion.version} (Historisk)
                </div>
                <div className="flex-1 bg-gray-50 flex items-center justify-center overflow-auto p-4">
                  {selectedVersion.file_url.endsWith('.pdf') ? (
                    <object data={selectedVersion.file_url} type="application/pdf" className="w-full h-full rounded shadow" />
                  ) : (
                    <img src={selectedVersion.file_url} alt="Selected" className="max-w-full max-h-full object-contain shadow" />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full max-w-4xl h-full max-h-[80vh] bg-white shadow-lg border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center group">
              {/* Note: True PDF slider diffing is complex in browser, we simulate it with overlapping containers and clip-path for images, or warn for PDF */}
              {currentVersion.file_url.endsWith('.pdf') ? (
                 <div className="text-center p-8 max-w-md">
                   <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                   <h4 className="text-lg font-medium text-gray-900 mb-2">Visuell slider stöds ej för PDF</h4>
                   <p className="text-sm text-gray-500 mb-6">
                     Webbläsaren stöder inte överlappande visuell jämförelse av interaktiva PDF-dokument. Vänligen använd "Sida vid sida"-läget istället.
                   </p>
                   <button 
                     onClick={() => setCompareMode('side-by-side')}
                     className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                   >
                     Byt till Sida vid sida
                   </button>
                 </div>
              ) : (
                <>
                  <div className="absolute inset-0 select-none">
                    <img src={selectedVersion.file_url} alt="Selected" className="w-full h-full object-contain pointer-events-none" />
                  </div>
                  <div 
                    className="absolute inset-0 select-none border-r-2 border-blue-500"
                    style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                  >
                    <img src={currentVersion.file_url} alt="Current" className="w-full h-full object-contain pointer-events-none" />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPos}
                    onChange={(e) => setSliderPos(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                  />
                  {/* Slider Handle Visual */}
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-blue-500 pointer-events-none z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow flex items-center justify-center">
                      <div className="flex gap-0.5">
                        <div className="w-0.5 h-3 bg-white rounded-full"></div>
                        <div className="w-0.5 h-3 bg-white rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

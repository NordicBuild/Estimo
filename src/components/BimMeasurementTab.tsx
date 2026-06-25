import React, { useState, useRef, useEffect } from 'react';
import { ViewerUI } from '../viewer/components/ViewerUI';
import { getIfcFile, saveIfcFile } from '../ifcStorage';

import { Byggdel } from '../data';

interface Props {
  activeProjectId?: string;
  addParts?: (parts: Omit<Byggdel, 'id'>[]) => void;
}

export function BimMeasurementTab({ activeProjectId = "default", addParts }: Props) {
  const [ifcFile, setIfcFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeProjectId) {
      getIfcFile(activeProjectId).then(file => {
        if (file) {
          setIfcFile(file);
        } else {
          setIfcFile(null);
        }
      }).catch(err => {
        console.error('Failed to load IFC file from local storage', err);
      });
    }
  }, [activeProjectId]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      await new Promise(r => setTimeout(r, 100)); // allow UI to update
      setIfcFile(file);
      if (activeProjectId) {
        saveIfcFile(activeProjectId, file).catch(console.error);
      }
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.ifc')) {
      setIsUploading(true);
      await new Promise(r => setTimeout(r, 100));
      setIfcFile(file);
      if (activeProjectId) {
        saveIfcFile(activeProjectId, file).catch(console.error);
      }
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (ifcFile) {
      return (
          <div className="flex flex-col h-full bg-[#1a1a1a]">
            {/* Top Toolbar */}
            <div className="flex items-center gap-4 p-3 border-b border-white/10 bg-[#222] shrink-0 text-white shadow-sm">
                <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                   <button 
                      onClick={handleUploadClick}
                      className="flex items-center gap-2 px-4 py-2 bg-[var(--blue)] text-white rounded-md font-bold text-sm shadow hover:bg-[var(--blue-dk)] transition-colors"
                    >
                     <i className="fa-solid fa-upload"></i> Byt IFC-modell
                   </button>
                   <input type="file" accept=".ifc" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                </div>
                
                <div>
                   <h2 className="text-sm font-semibold truncate max-w-[200px] text-gray-300" title={ifcFile.name}>
                      <i className="fa-regular fa-file-lines mr-2"></i>
                      {ifcFile.name}
                   </h2>
                </div>
            </div>
            
            <div className="flex-1 relative min-h-0">
               <ViewerUI file={ifcFile} addParts={addParts} />
            </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-surface-container-lowest">
      <div className="flex-1 overflow-hidden bg-black/5 relative flex items-center justify-center">
          <input type="file" accept=".ifc" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <div 
            className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant/50 cursor-pointer hover:bg-black/5 transition-colors"
            onClick={handleUploadClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
             {isUploading ? (
                <>
                   <span className="material-symbols-outlined text-6xl mb-4 font-light animate-spin">refresh</span>
                   <h2 className="text-xl font-medium mb-2 text-on-surface">Laddar modell...</h2>
                </>
             ) : (
                <>
                   <span className="material-symbols-outlined text-8xl mb-4 font-light">view_in_ar</span>
                   <h2 className="text-xl font-medium mb-2 text-on-surface">BIM 3D Mätning</h2>
                   <p className="max-w-md text-center">
                     Dra och släpp en IFC-fil här eller klicka på Ladda upp för att visa 3D-modellen. 
                     Här kan du mäta längder, areor och volymer direkt i modellen.
                   </p>
                   <button className="mt-8 px-6 py-2.5 bg-surface border border-outline-variant rounded-lg font-medium shadow-sm hover:bg-surface-container-low text-on-surface flex items-center gap-2">
                     <span className="material-symbols-outlined">folder_open</span>
                     Bläddra efter IFC
                   </button>
                </>
             )}
          </div>
      </div>
    </div>
  );
}

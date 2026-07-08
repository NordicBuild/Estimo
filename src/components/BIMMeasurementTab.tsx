import React from 'react';
import { BIMLeftPanel } from './BIMLeftPanel';
import { BIM3DViewer } from './BIM3DViewer';
import { BIMRightPanel } from './BIMRightPanel';
import { useBIMStore } from '../stores/useBIMStore';

interface Props {
  addParts: (parts: any[]) => void;
  projectId?: string | null;
  companyId?: string | null;
}

export function BIMMeasurementTab({ addParts, projectId, companyId }: Props) {
  const modelUrl = useBIMStore(state => state.modelUrl);

  return (
    <div className="flex w-full h-full bg-white overflow-hidden">
      <BIMLeftPanel projectId={projectId} companyId={companyId} />
      <div className="flex-1 relative min-w-0">
        <BIM3DViewer modelUrl={modelUrl || undefined} />
      </div>
      <BIMRightPanel addParts={addParts} />
    </div>
  );
}

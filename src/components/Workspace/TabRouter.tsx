import React, { Suspense, lazy } from 'react';
import { HemsidaTab } from '../HemsidaTab';
import { ProjektInfoTab } from '../ProjektInfoTab';
import { KalkylTab } from '../KalkylTab';
import { MaterialTab } from '../MaterialTab';
import { ArbetsmomentTab } from '../ArbetsmomentTab';
import { AnalysTab } from '../AnalysTab';
import { SammanstallnTab } from '../SammanstallnTab';
import { PlaneringTab } from '../PlaneringTab';
import { SlutsidaTab } from '../SlutsidaTab';
import { AnbudTab } from '../AnbudTab';
import { InkopTab } from '../InkopTab';
import { PrognosTab } from '../PrognosTab';
import { ReceptbibliotekTab } from '../ReceptbibliotekTab';

const PdfMeasurementTab = lazy(() => import('../PdfMeasurementTab').then(m => ({ default: m.PdfMeasurementTab })));
const BIMMeasurementTab = lazy(() => import('../BIMMeasurementTab').then(m => ({ default: m.BIMMeasurementTab })));

const FallbackSpinner = () => (
  <div className="flex-1 flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--blue)]"></div>
  </div>
);

export function TabRouter(props: any) {
  const { activeTab, ...rest } = props;

  return (
    <>
      {activeTab === 'hemsida' && (
        <HemsidaTab 
          user={rest.user}
          projects={rest.projects}
          folders={rest.folders}
          activeProjectId={rest.activeProjectId}
          companyName={rest.companyInfo.name}
          createFolder={rest.createFolder}
          createProject={rest.createProject}
          renameFolder={rest.renameFolder}
          deleteFolder={rest.deleteFolder}
          renameProject={rest.renameProject}
          duplicateProject={rest.duplicateProject}
          deleteProject={rest.deleteProject}
          switchProject={rest.switchProject}
          reorderProjects={rest.reorderProjects}
          reorderFolders={rest.reorderFolders}
        />
      )}
      {activeTab === 'projekt' && (
        <ProjektInfoTab 
          projectInfo={rest.projectInfo} 
          setProjectInfo={rest.setProjectInfo}
          companyInfo={rest.companyInfo}
          setCompanyInfo={rest.setCompanyInfo}
          currentProject={rest.currentProject}
          saveVersion={rest.saveVersion}
          loadVersion={rest.loadVersion}
          deleteVersion={rest.deleteVersion}
          addActivityLog={rest.addActivityLog}
          byggdelar={rest.byggdelar}
          projectId={rest.activeProjectId}
          companyId={rest.dataSpaceId}
          onProjectCompleted={rest.onProjectCompleted}
        />
      )}
      {activeTab === 'kalkyl' && (
        <KalkylTab 
          byggdelar={rest.byggdelar} 
          calcResult={rest.calcResult} 
          materials={rest.materials}
          projectInfo={rest.projectInfo}
          companyInfo={rest.companyInfo}
          companyId={rest.dataSpaceId}
          addParts={rest.addMeasurementParts}
          settings={rest.settings}
          updateSettings={rest.updateSettings}
          byggdelTemplates={rest.byggdelTemplates}
          addTemplate={rest.addTemplate}
          deleteTemplate={rest.deleteTemplate}
          addPartFromTemplate={rest.addTemplatePart}
          toggleByggdel={rest.toggleByggdel} 
          toggleAllByggdelar={rest.toggleAllByggdelar}
          reorderByggdelar={rest.reorderByggdelar}
          removePart={rest.removePart} 
          removeMultipleParts={rest.removeMultipleParts}
          updateMultipleParts={rest.updateMultipleParts}
          clonePart={rest.clonePart}
          togglePartActive={rest.togglePartActive}
          toggleTypeActive={rest.toggleTypeActive}
          cloneType={rest.cloneType}
          openModal={rest.openModal} 
          updateMoment={rest.updateMoment}
          duplicateMoment={rest.duplicateMoment}
          updateMaterialPrice={rest.updateMaterialPrice}
          addMoment={rest.addMoment}
          removeMoment={rest.removeMoment}
          updatePartQty={rest.updatePartQty}
          updatePartAntal={rest.updatePartAntal}
        />
      )}
      {activeTab === 'pdf' && (
        <Suspense fallback={<FallbackSpinner />}>
          <PdfMeasurementTab addParts={rest.addMeasurementParts} />
        </Suspense>
      )}
      {activeTab === 'bim' && (
        <Suspense fallback={<FallbackSpinner />}>
          <BIMMeasurementTab addParts={rest.addMeasurementParts} projectId={rest.activeProjectId} companyId={rest.dataSpaceId} />
        </Suspense>
      )}
      {activeTab === 'material' && (
        <MaterialTab 
          materials={rest.materials} 
          customCategories={rest.customCategories}
          updateMaterial={rest.updateMaterial} 
          updateMultipleMaterials={rest.updateMultipleMaterials}
          addMaterial={rest.addMaterial} 
          addMaterials={rest.addMaterials}
          deleteMaterial={rest.deleteMaterial} 
          deleteMultipleMaterials={rest.deleteMultipleMaterials}
          addCategory={rest.addCategory}
          renameCategory={rest.renameCategory}
          removeCategory={rest.removeCategory}
          showNotification={rest.showNotification}
        />
      )}
      {activeTab === 'arbete' && (
        <div className="p-8">
          <ArbetsmomentTab 
            arbetsData={rest.arbetsData} 
            customCategories={rest.customArbCategories}
            updateArbete={rest.updateArbete} 
            updateMultipleArbeten={rest.updateMultipleArbeten}
            addArbete={rest.addArbete} 
            addArbeten={rest.addArbeten}
            deleteArbete={rest.deleteArbete} 
            deleteMultipleArbeten={rest.deleteMultipleArbeten}
            addCategory={rest.addArbCategory}
            showNotification={rest.showNotification}
          />
        </div>
      )}
      {activeTab === 'analys' && <AnalysTab calcResult={rest.calcResult} />}
      {activeTab === 'sammanstalln' && <SammanstallnTab calcResult={rest.calcResult} materials={rest.materials} updateMaterial={rest.updateMaterial} projectInfo={rest.projectInfo} setProjectInfo={rest.setProjectInfo} companyInfo={rest.companyInfo} />}
      {activeTab === 'planering' && <PlaneringTab calcResult={rest.calcResult} byggdelar={rest.byggdelar} reorderByggdelar={rest.reorderByggdelar} reorderMoment={rest.reorderMoment} updateStartDay={rest.updateStartDay} updatePlanDates={rest.updatePlanDates} updateMomentWorkers={rest.updateMomentWorkers} updateByggdelColor={rest.updateByggdelColor} />}
      {activeTab === 'slutsida' && <SlutsidaTab settings={rest.settings} setSettings={rest.setSettings} calcResult={rest.calcResult} />}
      {activeTab === 'anbud' && <AnbudTab calcResult={rest.calcResult} byggdelar={rest.byggdelar} projectInfo={rest.projectInfo} companyInfo={rest.companyInfo} materials={rest.materials} updateByggdelOfferPrice={rest.updateByggdelOfferPrice} />}
      {activeTab === 'inkop' && <InkopTab projectId={rest.activeProjectId} byggdelar={rest.byggdelar} calcResult={rest.calcResult} companyId={rest.dataSpaceId} onApplyOffert={rest.handleApplyOffert} />}
      {activeTab === 'prognos' && <PrognosTab projectId={rest.activeProjectId} byggdelar={rest.byggdelar} calcResult={rest.calcResult} companyId={rest.dataSpaceId} />}
      {activeTab !== 'anbud' && (
        <div style={{ position: 'absolute', top: '-10000px', left: 0, width: '1000px', zIndex: -1000, pointerEvents: 'none' }}>
          <AnbudTab calcResult={rest.calcResult} byggdelar={rest.byggdelar} projectInfo={rest.projectInfo} companyInfo={rest.companyInfo} materials={rest.materials} updateByggdelOfferPrice={rest.updateByggdelOfferPrice} />
        </div>
      )}
      {activeTab === 'dokument_ffu' && (
        <div className="p-8 flex items-center justify-center h-full">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-surface-container-highest mb-4">description</span>
            <h2 className="text-2xl font-bold text-on-surface">FFU</h2>
            <p className="text-on-surface-variant mt-2">Denna sektion är under utveckling.</p>
          </div>
        </div>
      )}
      {activeTab === 'dokument_modell' && (
        <div className="p-8 flex items-center justify-center h-full">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-surface-container-highest mb-4">architecture</span>
            <h2 className="text-2xl font-bold text-on-surface">Modell</h2>
            <p className="text-on-surface-variant mt-2">Denna sektion är under utveckling.</p>
          </div>
        </div>
      )}
      {activeTab === 'dokument_kommunikation' && (
        <div className="p-8 flex items-center justify-center h-full">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-surface-container-highest mb-4">forum</span>
            <h2 className="text-2xl font-bold text-on-surface">Kommunikation</h2>
            <p className="text-on-surface-variant mt-2">Denna sektion är under utveckling.</p>
          </div>
        </div>
      )}
      {activeTab === 'arbetare' && (
        <div className="p-8 flex items-center justify-center h-full">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-surface-container-highest mb-4">engineering</span>
            <h2 className="text-2xl font-bold text-on-surface">Arbetare</h2>
            <p className="text-on-surface-variant mt-2">Denna sektion är under utveckling.</p>
          </div>
        </div>
      )}
      {activeTab === 'fastigheter' && (
        <div className="p-8 flex items-center justify-center h-full">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-surface-container-highest mb-4">home_work</span>
            <h2 className="text-2xl font-bold text-on-surface">Fastigheter</h2>
            <p className="text-on-surface-variant mt-2">Denna sektion är under utveckling.</p>
          </div>
        </div>
      )}
      {activeTab === 'receptbibliotek' && <ReceptbibliotekTab companyId={rest.dataSpaceId} />}
      {activeTab === 'maskiner' && (
        <div className="p-8 flex items-center justify-center h-full">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-surface-container-highest mb-4">precision_manufacturing</span>
            <h2 className="text-2xl font-bold text-on-surface">Maskiner</h2>
            <p className="text-on-surface-variant mt-2">Denna sektion är under utveckling.</p>
          </div>
        </div>
      )}
      {activeTab === 'bilar' && (
        <div className="p-8 flex items-center justify-center h-full">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-surface-container-highest mb-4">directions_car</span>
            <h2 className="text-2xl font-bold text-on-surface">Bilar</h2>
            <p className="text-on-surface-variant mt-2">Denna sektion är under utveckling.</p>
          </div>
        </div>
      )}
      {activeTab === 'ovrigt' && (
        <div className="p-8 flex items-center justify-center h-full">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-surface-container-highest mb-4">category</span>
            <h2 className="text-2xl font-bold text-on-surface">Övrigt</h2>
            <p className="text-on-surface-variant mt-2">Denna sektion är under utveckling.</p>
          </div>
        </div>
      )}
    </>
  );
}

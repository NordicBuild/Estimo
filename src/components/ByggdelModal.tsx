import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { Material, ArbetsMoment, Byggdel, INITIAL_TIDSFAKTORER, TYPE_UNIT } from "../data";
import { calculateBaseMoments, calculateDefaultMoments } from "../calculationHelpers";

const ByggdelSketch = lazy(() => import('./ByggdelSketch').then(m => ({ default: m.ByggdelSketch })));

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (byggdel: Byggdel) => void;
  initialData: Byggdel | null;
  materials: Material[];
  arbetsData: ArbetsMoment[];
  settings: any;
  onAddMaterial?: (mat: Material) => void;
}

export function ByggdelModal({ isOpen, onClose, onSave, initialData, materials, arbetsData, settings, onAddMaterial }: Props) {
  const [mName, setMName] = useState('');
  const [mType, setMType] = useState('24.1_Fundament');
  const [mGroup, setMGroup] = useState('');
  const [mObjFactor, setMObjFactor] = useState<number | string>(1.0);
  const [mRiskLevel, setMRiskLevel] = useState<'låg' | 'medel' | 'hög'>('medel');
  const [mLength, setMLength] = useState<number | string>(1.0);
  const [mWidth, setMWidth] = useState<number | string>(1.0);
  const [mHeight, setMHeight] = useState<number | string>(0.2);
  const [mShaftWidth, setMShaftWidth] = useState<number | string>(0.2);
  const [mShaftHeight, setMShaftHeight] = useState<number | string>(0.5);
  const [mWallThickness, setMWallThickness] = useState<number | string>(0.2);
  const [mSlabThickness, setMSlabThickness] = useState<number | string>(0.2);
  const [mCount, setMCount] = useState<number | string>(1);
  const [mArea, setMArea] = useState<number | string>(10.0);
  const [mPerimeter, setMPerimeter] = useState<number | string>(12.0);
  const [mStepCount, setMStepCount] = useState<number | string>(10);
  const [mStepWidth, setMStepWidth] = useState<number | string>(1.0);
  const [mStepHeight, setMStepHeight] = useState<number | string>(0.16);
  const [mStepDepth, setMStepDepth] = useState<number | string>(0.28);
  const [mRampThickness, setMRampThickness] = useState<number | string>(0.20);
  const [mMoments, setMMoments] = useState<Byggdel['moments']>([]);
  const [mError, setMError] = useState<string | null>(null);

  const isOpeningModal = useRef(false);

  useEffect(() => {
    if (isOpen) {
      isOpeningModal.current = true;
      setMError(null);
      if (initialData) {
        const b = initialData;
        setMName(b.name);
        setMType(b.type || '24.1_Fundament');
        setMGroup(b.group || '');
        setMRiskLevel(b.riskLevel || 'medel');
        setMObjFactor(b.objFactor ?? 1.0);
        setMCount(b.qty);
        setMLength(b.dimensions?.length ?? 1.0);
        setMWidth(b.dimensions?.width ?? 1.0);
        setMHeight(b.dimensions?.height ?? 0.2);
        setMShaftWidth(b.dimensions?.shaftWidth ?? 0.2);
        setMShaftHeight(b.dimensions?.shaftHeight ?? 0.5);
        setMWallThickness(b.dimensions?.wallThickness ?? 0.2);
        setMSlabThickness(b.dimensions?.slabThickness ?? 0.2);
        setMArea(b.dimensions?.area ?? 10.0);
        setMPerimeter(b.dimensions?.perimeter ?? 12.0);
        setMStepCount(b.dimensions?.stepCount ?? 10);
        setMStepWidth(b.dimensions?.stepWidth ?? 1.0);
        setMStepHeight(b.dimensions?.stepHeight ?? 0.16);
        setMStepDepth(b.dimensions?.stepDepth ?? 0.28);
        setMRampThickness(b.dimensions?.rampThickness ?? 0.20);
      if (b.moments) {
        setMMoments(b.moments.map(m => ({...m})));
      } else {
        setMMoments([]);
      }
      } else {
        setMName('');
        setMGroup('');
        setMRiskLevel('medel');
        setMObjFactor(1.0);
        setMCount(1);
        setMArea(10.0);
        const sn = (val: string | number) => Number(String(val).replace(',', '.')) || 0;
        setMMoments(calculateDefaultMoments(mType, { length: sn(mLength), width: sn(mWidth), height: sn(mHeight), shaftWidth: sn(mShaftWidth), shaftHeight: sn(mShaftHeight), wallThickness: sn(mWallThickness), slabThickness: sn(mSlabThickness), qty: sn(mCount), perimeter: sn(mPerimeter), stepCount: sn(mStepCount), stepWidth: sn(mStepWidth), stepHeight: sn(mStepHeight), stepDepth: sn(mStepDepth), rampThickness: sn(mRampThickness), area: 10.0 }));
      }
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (isOpen) {
      if (isOpeningModal.current) {
        isOpeningModal.current = false;
        return;
      }
      const sn = (val: string | number) => Number(String(val).replace(',', '.')) || 0;
      const { betongPerUnit, formPerUnit, armeringPerUnit } = calculateBaseMoments(mType, { 
        length: sn(mLength), width: sn(mWidth), height: sn(mHeight), 
        shaftWidth: sn(mShaftWidth), shaftHeight: sn(mShaftHeight), 
        wallThickness: sn(mWallThickness), slabThickness: sn(mSlabThickness), 
        qty: sn(mCount), perimeter: sn(mPerimeter), area: sn(mArea),
        stepCount: sn(mStepCount), stepWidth: sn(mStepWidth), stepHeight: sn(mStepHeight), stepDepth: sn(mStepDepth), rampThickness: sn(mRampThickness)
      });
      setMMoments(prev => prev.map(m => {
        if (m.label === 'Betong') return { ...m, amount: parseFloat(betongPerUnit.toFixed(4)) };
        if (m.label === 'Form') return { ...m, amount: parseFloat(formPerUnit.toFixed(4)) };
        if (m.label === 'Armering') return { ...m, amount: parseFloat(armeringPerUnit.toFixed(4)) };
        return m;
      }));
    }
  }, [mType, mLength, mWidth, mHeight, mShaftWidth, mShaftHeight, mWallThickness, mSlabThickness, mCount, mPerimeter, mArea, mStepCount, mStepWidth, mStepHeight, mStepDepth, mRampThickness, isOpen]);

  const modalCalcQty = Number(mCount) || 0;
  const formatKr = (v: number) => Math.round(v).toLocaleString('sv-SE') + ' kr';

  const handleSave = () => {
    if (!mName.trim()) {
      setMError('Vänligen ange ett namn på byggdelen.');
      return;
    }

    const sn = (val: string | number) => Number(String(val).replace(',', '.')) || 0;

    const newPart: Byggdel = {
      id: initialData ? initialData.id : Date.now(),
      name: mName,
      type: mType,
      group: mGroup,
      riskLevel: mRiskLevel,
      revision: initialData ? initialData.revision : undefined,
      qty: modalCalcQty,
      objFactor: sn(mObjFactor),
      dimensions: {
        length: sn(mLength), width: sn(mWidth), height: sn(mHeight),
        shaftWidth: sn(mShaftWidth), shaftHeight: sn(mShaftHeight),
        wallThickness: sn(mWallThickness), slabThickness: sn(mSlabThickness),
        qty: sn(mCount), perimeter: sn(mPerimeter), area: sn(mArea),
        stepCount: sn(mStepCount), stepWidth: sn(mStepWidth), 
        stepHeight: sn(mStepHeight), stepDepth: sn(mStepDepth), 
        rampThickness: sn(mRampThickness)
      },
      moments: mMoments.map(m => ({ ...m, amount: sn(m.amount), timeUnit: sn(m.timeUnit) })),
      collapsed: initialData ? initialData.collapsed : false,
      comment: initialData ? initialData.comment : '',
      active: initialData ? initialData.active : true
    };

    onSave(newPart);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center pt-8 z-[2000] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[1100px] max-w-full flex flex-col overflow-hidden max-h-[90vh]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--border)] bg-[var(--surface2)]">
          <h2 className="font-extrabold text-[15px] tracking-tight flex items-center gap-2">
             <i className="fa-solid fa-layer-group text-[var(--blue)]"></i>
             <span>{initialData ? 'Redigera Byggdel' : 'Konfigurera Byggdel'}</span>
          </h2>
          <button className="text-[var(--text3)] hover:text-gray-900 text-lg w-8 h-8 rounded-lg hover:bg-gray-200" onClick={onClose}>✕</button>
        </div>
        
        <div className="p-5 flex-1 overflow-y-auto bg-[var(--surface)]">
          {mError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs font-semibold">
              {mError}
            </div>
          )}
          
          <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-lg p-4 mb-4">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text3)] mb-3">Grundinfo</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Namn på byggdel</label>
                  <input 
                    type="text" 
                    placeholder="t.ex. Fundament F1" 
                    className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm focus:border-[var(--blue)] outline-none"
                    value={mName}
                    onChange={e => setMName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Gruppering</label>
                  <input 
                    type="text" 
                    placeholder="t.ex. Hus A, Källare" 
                    className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm focus:border-[var(--blue)] outline-none"
                    value={mGroup}
                    onChange={e => setMGroup(e.target.value)}
                  />
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Säkerhet (Risk)</label>
                  <select 
                    className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm focus:border-[var(--blue)] outline-none bg-white"
                    value={mRiskLevel}
                    onChange={e => setMRiskLevel(e.target.value as 'låg' | 'medel' | 'hög')}
                  >
                    <option value="låg">Låg (±5%)</option>
                    <option value="medel">Medel (±15%)</option>
                    <option value="hög">Hög (±30%)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Typ / Kategori</label>
                  <select 
                    className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm focus:border-[var(--blue)] outline-none bg-white"
                    value={mType}
                    onChange={e => setMType(e.target.value)}
                  >
                     <optgroup label="24 — Grund">
                      <option value="24.1_Fundament">Fundament / Plint</option>
                      <option value="24.2_Sula">Sula med skaft</option>
                      <option value="24.3_Grop">Grundgrop</option>
                      <option value="24.4_Grundbalk">Grundbalk</option>
                     </optgroup>
                     <optgroup label="27 — Platta">
                      <option value="27.1_PlattaMark">Grundplatta</option>
                     </optgroup>
                     <optgroup label="31 — Vägg">
                       <option value="31.2_Vagg">Vägg dubbelsidig form</option>
                       <option value="31.1_VaggEnkelsid">Vägg enkelsidig form</option>
                     </optgroup>
                     <optgroup label="32 — Pelare">
                       <option value="32.1_Pelare">Pelare</option>
                     </optgroup>
                     <optgroup label="33 — Balk">
                       <option value="33.1_Balk">Balk</option>
                     </optgroup>
                     <optgroup label="34 — Bjälklag">
                       <option value="34.1_Bjalklag">Bjälklag</option>
                     </optgroup>
                     <optgroup label="35 — Trappa">
                       <option value="35.1_Trappa">Trappa / Vilplan</option>
                     </optgroup>
                     <optgroup label="36 — Balkong">
                       <option value="36.1_Balkong">Balkong</option>
                     </optgroup>
                     <optgroup label="40 — Anläggning">
                       <option value="41.1_Stodmur">Stödmur (L=m)</option>
                       <option value="42.1_Bropelare">Bropelare (st)</option>
                       <option value="43.1_Brofarbana">Brofarbana (m²)</option>
                       <option value="44.1_Tunnelvalv">Tunnelvalv L=m (Omkrets=Bredd)</option>
                       <option value="45.1_Landfaste">Landfäste (st)</option>
                       <option value="46.1_Vingmur">Vingmur (st/m)</option>
                       <option value="47.1_Trog">Betongtråg (m)</option>
                       <option value="48.1_Paldack">Påldäck (m²)</option>
                     </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text2)] mb-1">
                    Objektfaktor (tim)
                  </label>
                  <input 
                    type="number" min="0" step="any"
                    className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm focus:border-[var(--blue)] outline-none"
                    value={mObjFactor}
                    onChange={e => setMObjFactor(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text2)] mb-1">
                    {TYPE_UNIT[mType] === 'st' ? 'Antal (st)' : `Mängd (${TYPE_UNIT[mType] || 'st'})`}
                  </label>
                  <input 
                    type="number" min="0" step="any"
                    className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm focus:border-[var(--blue)] outline-none"
                    value={mCount}
                    onChange={e => setMCount(e.target.value)}
                  />
                  <div className="mt-2 text-xs text-[var(--text3)]">
                    Beräknad total kvantitet: <strong className="text-[var(--blue)]">{modalCalcQty}</strong> {TYPE_UNIT[mType] || 'st'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text3)]">Dimensioner <span className="text-[9px] font-normal lowercase tracking-normal ml-2">används för automatisk mängdberäkning</span></div>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-1/3">
                <Suspense fallback={<div className="h-48 bg-gray-100 flex items-center justify-center rounded border text-sm text-gray-500">Laddar 3D-skiss...</div>}>
                  <ByggdelSketch mType={mType} dimensions={{ 
    length: Number(String(mLength).replace(',', '.')) || 0, 
    width: Number(String(mWidth).replace(',', '.')) || 0, 
    height: Number(String(mHeight).replace(',', '.')) || 0, 
    shaftWidth: Number(String(mShaftWidth).replace(',', '.')) || 0, 
    shaftHeight: Number(String(mShaftHeight).replace(',', '.')) || 0, 
    wallThickness: Number(String(mWallThickness).replace(',', '.')) || 0, 
    slabThickness: Number(String(mSlabThickness).replace(',', '.')) || 0,
    perimeter: Number(String(mPerimeter).replace(',', '.')) || 0, 
    area: Number(String(mArea).replace(',', '.')) || 0,
    stepCount: Number(String(mStepCount).replace(',', '.')) || 0, 
    stepWidth: Number(String(mStepWidth).replace(',', '.')) || 0, 
    stepHeight: Number(String(mStepHeight).replace(',', '.')) || 0, 
    stepDepth: Number(String(mStepDepth).replace(',', '.')) || 0, 
    rampThickness: Number(String(mRampThickness).replace(',', '.')) || 0 
                  }} />
                </Suspense>
              </div>
              <div className="w-full md:w-2/3 flex flex-col justify-center">
            {['27.1_PlattaMark', '34.1_Bjalklag', '36.1_Balkong', '43.1_Brofarbana', '48.1_Paldack'].includes(mType) ? (
               <div className="grid grid-cols-2 gap-3">
                 <div><label className="block text-xs font-semibold text-gray-600 mb-1">Tjocklek (m)</label><input type="number" min="0" step="any" className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--blue)]" value={mHeight} onChange={e => setMHeight(e.target.value)} /></div>
                 <div><label className="block text-xs font-semibold text-gray-600 mb-1">Omkrets kantform (m)</label><input type="number" min="0" step="any" className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--blue)]" value={mPerimeter} onChange={e => setMPerimeter(e.target.value)} /></div>
               </div>
            ) : mType === '44.1_Tunnelvalv' ? (
               <div className="grid grid-cols-3 gap-3">
                 <div><label className="block text-xs font-semibold text-gray-600 mb-1">Tunnel längd (m)</label><input type="number" min="0" step="any" className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--blue)]" value={mLength} onChange={e => setMLength(e.target.value)} /></div>
                 <div><label className="block text-xs font-semibold text-gray-600 mb-1">Omkrets innerbåge (m)</label><input type="number" min="0" step="any" className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--blue)]" value={mPerimeter} onChange={e => setMPerimeter(e.target.value)} /></div>
                 <div><label className="block text-xs font-semibold text-gray-600 mb-1">Tjocklek valv (m)</label><input type="number" min="0" step="any" className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--blue)]" value={mHeight} onChange={e => setMHeight(e.target.value)} /></div>
               </div>
            ) : mType.includes('Vagg') ? (
              <div className="grid grid-cols-1 gap-3">
                 <div><label className="block text-xs font-semibold text-gray-600 mb-1">Tjocklek vägg (m)</label><input type="number" min="0" step="any" className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--blue)]" value={mWidth} onChange={e => setMWidth(e.target.value)} /></div>
               </div>
            ) : mType === '35.1_Trappa' ? (
              <div className="grid gap-3">
                <div className="grid grid-cols-3 gap-3">
                   <div><label className="block text-xs font-semibold text-gray-600 mb-1">Antal Steg</label><input type="number" min="1" step="1" className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--blue)]" value={mStepCount} onChange={e => setMStepCount(e.target.value)} /></div>
                   <div><label className="block text-xs font-semibold text-gray-600 mb-1">Trappbredd (m)</label><input type="number" min="0" step="any" className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--blue)]" value={mStepWidth} onChange={e => setMStepWidth(e.target.value)} /></div>
                   <div><label className="block text-xs font-semibold text-gray-600 mb-1">Stegdjup (B) (m)</label><input type="number" min="0" step="any" className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--blue)]" value={mStepDepth} onChange={e => setMStepDepth(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2 border-t border-[var(--border)] pt-4">
                   <div><label className="block text-xs font-semibold text-gray-600 mb-1">Steghöjd (H) (m)</label><input type="number" min="0" step="any" className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--blue)]" value={mStepHeight} onChange={e => setMStepHeight(e.target.value)} /></div>
                   <div><label className="block text-xs font-semibold text-[var(--purple)] mb-1">Ramp under trappa (m)</label><input type="number" min="0" step="any" className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--purple)]" value={mRampThickness} onChange={e => setMRampThickness(e.target.value)} /></div>
                </div>
              </div>
            ) : ['24.2_Sula', '24.4_Grundbalk', '33.1_Balk'].includes(mType) ? (
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                   <div><label className="block text-xs font-semibold text-gray-600 mb-1">Bredd (B) m</label><input type="number" min="0" step="any" className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--blue)]" value={mWidth} onChange={e => setMWidth(parseFloat(e.target.value as string) || 0)} /></div>
                   <div><label className="block text-xs font-semibold text-gray-600 mb-1">Höjd (H) m</label><input type="number" min="0" step="any" className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--blue)]" value={mHeight} onChange={e => setMHeight(parseFloat(e.target.value as string) || 0)} /></div>
                </div>
                {mType === '24.2_Sula' && (
                <div className="grid grid-cols-2 gap-3 mt-2 border-t border-[var(--border)] pt-4">
                   <div><label className="block text-xs font-semibold text-[var(--purple)] mb-1">Skaft Bredd (m)</label><input type="number" min="0" step="any" className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--purple)]" value={mShaftWidth} onChange={e => setMShaftWidth(e.target.value)} /></div>
                   <div><label className="block text-xs font-semibold text-[var(--purple)] mb-1">Skaft Höjd (m)</label><input type="number" min="0" step="any" className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--purple)]" value={mShaftHeight} onChange={e => setMShaftHeight(e.target.value)} /></div>
                </div>
                )}
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="grid grid-cols-3 gap-3">
                   <div><label className="block text-xs font-semibold text-gray-600 mb-1">Längd (L) m</label><input type="number" min="0" step="any" className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--blue)]" value={mLength} onChange={e => setMLength(e.target.value)} /></div>
                   <div><label className="block text-xs font-semibold text-gray-600 mb-1">Bredd (B) m</label><input type="number" min="0" step="any" className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--blue)]" value={mWidth} onChange={e => setMWidth(e.target.value)} /></div>
                   <div><label className="block text-xs font-semibold text-gray-600 mb-1">Höjd (H) m</label><input type="number" min="0" step="any" className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--blue)]" value={mHeight} onChange={e => setMHeight(e.target.value)} /></div>
                </div>
                {['24.3_Grop', '41.1_Stodmur', '46.1_Vingmur', '47.1_Trog'].includes(mType) && (
                <div className="grid grid-cols-2 gap-3 mt-2 border-t border-[var(--border)] pt-4">
                   <div><label className="block text-xs font-semibold text-[var(--purple)] mb-1">Väggtjocklek (m)</label><input type="number" min="0" step="any" className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--purple)]" value={mWallThickness} onChange={e => setMWallThickness(e.target.value)} /></div>
                   <div><label className="block text-xs font-semibold text-[var(--purple)] mb-1">Plattjocklek (m)</label><input type="number" min="0" step="any" className="w-full border border-[var(--border)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[var(--purple)]" value={mSlabThickness} onChange={e => setMSlabThickness(e.target.value)} /></div>
                </div>
                )}
              </div>
            )}
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text3)]">Arbetsmoment för byggdel</div>
              <button 
                  className="px-3 py-1 text-[10px] bg-[var(--blue-lt)] text-[var(--blue-dk)] rounded hover:bg-blue-200 font-bold uppercase transition-colors"
                  onClick={() => setMMoments([...mMoments, { label: 'Nytt Moment', material: materials[0]?.name || '', arbetsmoment: '', amount: 0, timeUnit: 0, active: true }])}
                >
                  + Lägg till moment
              </button>
            </div>
            <div className="border border-[var(--border)] rounded-md overflow-x-auto bg-white">
              <table className="w-full text-left min-w-[1000px]">
                <thead className="bg-[var(--surface3)] text-[10px] uppercase text-[var(--text3)] border-b border-[var(--border)]">
                  <tr>
                    <th className="p-2 pl-3">Aktivitet</th>
                    <th className="p-2">Material / Resurs</th>
                    <th className="p-2">Arbetsmoment</th>
                    <th className="p-2 text-right w-20">Pris/enh (kr)</th>
                    <th className="p-2 text-right">Åtgång/enh</th>
                    <th className="p-2 text-right">Tid/enh (h)</th>
                    <th className="p-2 text-right">Tot Mängd</th>
                    <th className="p-2 text-right">Tot Tid (h)</th>
                    <th className="p-2 text-right font-bold text-gray-900">Kostnad (kr)</th>
                    <th className="p-2 pr-3 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {mMoments.map((m, mIdx) => {
                    const mat = materials.find(x => x.name === m.material) || materials[0];
                    const matIndex = mat ? materials.findIndex(x => x.name === mat.name) : -1;
                    const matPrice = mat ? mat.price : 0;
                    const spill = mat ? 1 + (mat.spill || 0) / 100 : 1;
                    
                    const qty = m.amount * modalCalcQty;
                    // Use string indexing to avoid issues, simplified here just using 1.0
                    const tf = INITIAL_TIDSFAKTORER.find((t: any) => t.type === mType) || { faktor: 1.0 };
                    const hrs = qty * m.timeUnit * tf.faktor;
                    const netMat = qty * matPrice * spill;
                    const bArb = hrs * settings.tRate;
                    const bCost = netMat + bArb;

                    return (
                      <tr key={mIdx} className="border-b last:border-b-0 border-[var(--border)] hover:bg-gray-50">
                        <td className="p-2 pl-3">
                          <input 
                            type="text" 
                            className="w-full border border-gray-200 hover:border-gray-300 focus:border-[var(--blue)] rounded px-2 py-1.5 text-xs outline-none min-w-[100px]"
                            value={m.label || ''}
                            onChange={e => {
                              const newM = [...mMoments];
                              newM[mIdx].label = e.target.value;
                              setMMoments(newM);
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <select 
                            className="w-full border border-gray-200 hover:border-gray-300 focus:border-[var(--blue)] rounded px-2 py-1.5 text-xs outline-none max-w-[150px] bg-transparent"
                            value={m.material || ''}
                            onChange={e => {
                              const newM = [...mMoments];
                              newM[mIdx].material = e.target.value;
                              setMMoments(newM);
                            }}
                          >
                            <option value="">Välj material...</option>
                            {materials.map((matOption, i) => (
                              <option key={i} value={matOption.name}>{matOption.name} ({matOption.unit})</option>
                            ))}
                            {m.material && !materials.find(tm => tm.name === m.material) && (
                              <option value={m.material}>{m.material}</option>
                            )}
                          </select>
                        </td>
                        <td className="p-2">
                          <select 
                            className="w-full border border-gray-200 hover:border-gray-300 focus:border-[var(--blue)] rounded px-2 py-1.5 text-xs outline-none max-w-[150px] bg-transparent"
                            value={m.arbetsmoment || ''}
                            onChange={e => {
                              const newM = [...mMoments];
                              const selectedVal = e.target.value;
                              newM[mIdx].arbetsmoment = selectedVal;
                              newM[mIdx].material = selectedVal;
                              
                              const arb = arbetsData.find(a => a.name === selectedVal);
                              if (arb) {
                                newM[mIdx].timeUnit = arb.tid;
                                // Create material if it doesn't exist
                                const matExists = materials.find(tm => tm.name === selectedVal);
                                if (!matExists && onAddMaterial && selectedVal) {
                                  onAddMaterial({
                                    cat: arb.cat || 'Övrigt',
                                    name: selectedVal,
                                    price: 0,
                                    unit: arb.unit || '',
                                    spill: 0,
                                    konto: ''
                                  });
                                }
                              }
                              setMMoments(newM);
                            }}
                          >
                            <option value="">Välj arbetsmoment...</option>
                            {Array.from(new Set(arbetsData.map(a => a.cat))).map(cat => (
                              <optgroup key={cat} label={cat}>
                                {arbetsData.filter(a => a.cat === cat).map((arbOption, i) => (
                                  <option key={i} value={arbOption.name}>{arbOption.name} ({arbOption.tid} h/{arbOption.unit})</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-right text-xs"> {/* REMOVED updateMaterial IN MODAL for simplicity */}
                          {matIndex !== -1 ? (
                              <span className="font-mono text-gray-700">{materials[matIndex].price ?? 0}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                            <input 
                              type="number" 
                              min="0"
                              className="w-16 border border-gray-200 hover:border-gray-300 focus:border-[var(--blue)] rounded px-2 py-1.5 text-xs text-right font-mono outline-none"
                              value={m.amount ?? 0}
                              onChange={e => {
                                const newM = [...mMoments];
                                newM[mIdx] = { ...newM[mIdx], amount: e.target.value as any };
                                setMMoments(newM);
                              }}
                              step="any"
                            />
                        </td>
                        <td className="p-2 text-right">
                            <input 
                              type="number" 
                              min="0"
                              className="w-16 border border-gray-200 hover:border-gray-300 focus:border-[var(--blue)] rounded px-2 py-1.5 text-xs text-right font-mono outline-none"
                              value={m.timeUnit ?? 0}
                              onChange={e => {
                                const newM = [...mMoments];
                                newM[mIdx] = { ...newM[mIdx], timeUnit: e.target.value as any };
                                setMMoments(newM);
                              }}
                              step="any"
                            />
                        </td>
                        <td className="p-2 text-right text-xs font-mono text-[var(--text2)]">
                          {qty > 0 ? (Math.round(qty * 100) / 100) : '—'}
                        </td>
                        <td className="p-2 text-right text-xs font-mono text-[var(--text2)]">
                          {hrs > 0 ? (Math.round(hrs * 100) / 100) : '—'}
                        </td>
                        <td className="p-2 text-right text-xs font-mono font-bold text-gray-900 bg-[var(--surface3)] rounded my-1 px-2">
                          {bCost > 0 ? formatKr(bCost) : '—'}
                        </td>
                        <td className="p-2 pr-3 text-right">
                          <button 
                            className="text-gray-400 hover:text-red-600 w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 transition-colors"
                            onClick={() => {
                              const newM = [...mMoments];
                              newM.splice(mIdx, 1);
                              setMMoments(newM);
                            }}
                            title="Ta bort rad"
                          ><i className="fa-solid fa-trash text-[0.65rem]"></i></button>
                        </td>
                      </tr>
                    );
                  })}
                  {mMoments.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-[var(--text3)] text-xs font-medium">Inga arbetsmoment. Klicka "+ Lägg till moment" ovan.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface2)] flex justify-end gap-3 rounded-b-xl">
          <button 
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--blue)] focus:ring-offset-1"
            onClick={onClose}
          >
            Avbryt
          </button>
          <button 
            className="px-6 py-2 bg-gradient-to-br from-[var(--blue)] to-[var(--blue-dk)] rounded-md text-sm font-bold text-white shadow-md hover:shadow-lg transform hover:-translate-y-px transition-all focus:outline-none focus:ring-2 focus:ring-[var(--blue)] focus:ring-offset-1"
            onClick={handleSave}
          >
            Spara till kalkyl
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Byggdel } from '../data';
import { calculateBaseMoments } from '../calculationHelpers';

export function useByggdelModal() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  const [mName, setMName] = useState('');
  const [mType, setMType] = useState('24.1_Fundament');
  const [mGroup, setMGroup] = useState('');
  const [mObjFactor, setMObjFactor] = useState<number | string>(1.0);
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
    if (modalOpen) {
      if (isOpeningModal.current) {
        isOpeningModal.current = false;
        return;
      }
      const sn = (val: string | number) => Number(String(val).replace(',', '.')) || 0;
      const { betongPerUnit, formPerUnit, armeringPerUnit } = calculateBaseMoments(mType, { 
        length: sn(mLength), width: sn(mWidth), height: sn(mHeight), 
        shaftWidth: sn(mShaftWidth), shaftHeight: sn(mShaftHeight), 
        wallThickness: sn(mWallThickness), slabThickness: sn(mSlabThickness), 
        qty: sn(mCount), perimeter: sn(mPerimeter), 
        stepCount: sn(mStepCount), stepWidth: sn(mStepWidth), 
        stepHeight: sn(mStepHeight), stepDepth: sn(mStepDepth), 
        rampThickness: sn(mRampThickness) 
      });
      
      setMMoments(prev => prev.map(m => {
        if (m.label === 'Betong') return { ...m, amount: parseFloat(betongPerUnit.toFixed(4)) };
        if (m.label === 'Form') return { ...m, amount: parseFloat(formPerUnit.toFixed(4)) };
        if (m.label === 'Armering') return { ...m, amount: parseFloat(armeringPerUnit.toFixed(4)) };
        return m;
      }));
    }
  }, [mType, mLength, mWidth, mHeight, mShaftWidth, mShaftHeight, mWallThickness, mSlabThickness, mCount, mArea, mPerimeter, mStepCount, mStepWidth, mStepHeight, mStepDepth, mRampThickness, modalOpen]);

  const resetModalState = () => {
    setMName('');
    setMType('24.1_Fundament');
    setMGroup('');
    setMObjFactor(1.0);
    setMLength(1.0);
    setMWidth(1.0);
    setMHeight(0.2);
    setMCount(1);
    setMArea(10.0);
    setMPerimeter(12.0);
    setMError(null);
  }

  return {
    modalOpen, setModalOpen,
    editId, setEditId,
    mName, setMName,
    mType, setMType,
    mGroup, setMGroup,
    mObjFactor, setMObjFactor,
    mLength, setMLength,
    mWidth, setMWidth,
    mHeight, setMHeight,
    mShaftWidth, setMShaftWidth,
    mShaftHeight, setMShaftHeight,
    mWallThickness, setMWallThickness,
    mSlabThickness, setMSlabThickness,
    mCount, setMCount,
    mArea, setMArea,
    mPerimeter, setMPerimeter,
    mStepCount, setMStepCount,
    mStepWidth, setMStepWidth,
    mStepHeight, setMStepHeight,
    mStepDepth, setMStepDepth,
    mRampThickness, setMRampThickness,
    mMoments, setMMoments,
    mError, setMError,
    isOpeningModal,
    resetModalState
  };
}

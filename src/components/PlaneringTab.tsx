import React, { useState, useMemo } from 'react';
import { CalculationResult } from '../useCalculation';
import { INITIAL_TIDSFAKTORER, Byggdel } from '../data';

interface Props {
  calcResult: CalculationResult;
  byggdelar: Byggdel[];
  reorderByggdelar: (dragIndex: number, dropIndex: number) => void;
  reorderMoment: (byggdelId: number, dragIndex: number, dropIndex: number) => void;
  updateStartDay: (byggdelId: number, startDay: number | null, mIndex?: number) => void;
}

export function PlaneringTab({ calcResult, byggdelar, reorderByggdelar, reorderMoment, updateStartDay, updatePlanDates, updateMomentWorkers, updateByggdelColor }: Props & { updatePlanDates?: (byggdelId: number, startDate: string | undefined, endDate: string | undefined, mIndex?: number) => void, updateMomentWorkers?: (byggdelId: number, mIndex: number, workers: number) => void, updateByggdelColor?: (byggdelId: number, color: string) => void }) {
  const [workers, setWorkers] = useState(1);
  const [dailyHours, setDailyHours] = useState(8);
  const [projectStartDate, setProjectStartDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [draggedPartIndex, setDraggedPartIndex] = useState<number | null>(null);
  const [dragOverPartIndex, setDragOverPartIndex] = useState<number | null>(null);

  const [draggedMomentInfo, setDraggedMomentInfo] = useState<{ partId: number, mIndex: number } | null>(null);
  const [dragOverMomentInfo, setDragOverMomentInfo] = useState<{ partId: number, mIndex: number } | null>(null);

  const [vacationStart, setVacationStart] = useState<string>('');
  const [vacationEnd, setVacationEnd] = useState<string>('');

  const getDaysDiff = (start: string, end: string) => {
     let dLocal = new Date(start);
     const dEnd = new Date(end);
     let vacS = vacationStart ? new Date(vacationStart).getTime() : null;
     let vacE = vacationEnd ? new Date(vacationEnd).getTime() : null;
     
     let days = 0;
     while (dLocal < dEnd) {
       const t = dLocal.getTime();
       const isWeekend = dLocal.getDay() === 0 || dLocal.getDay() === 6;
       const isVacation = vacS && vacE && t >= vacS && t <= vacE;
       if (!isWeekend && !isVacation) {
         days++;
       }
       dLocal.setDate(dLocal.getDate() + 1);
     }
     return days;
  };
  
  const addDays = (dateStr: string, days: number) => {
    let d = new Date(dateStr);
    let vacS = vacationStart ? new Date(vacationStart).getTime() : null;
    let vacE = vacationEnd ? new Date(vacationEnd).getTime() : null;
    
    let added = 0;
    if (days === 0) {
        while (true) {
            const t = d.getTime();
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const isVacation = vacS && vacE && t >= vacS && t <= vacE;
            if (!isWeekend && !isVacation) break;
            d.setDate(d.getDate() + 1);
        }
        return d.toISOString().split('T')[0];
    } else if (days > 0) {
      while (added < Math.ceil(days)) {
        d.setDate(d.getDate() + 1);
        const t = d.getTime();
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const isVacation = vacS && vacE && t >= vacS && t <= vacE;
        if (!isWeekend && !isVacation) {
          added++;
        }
      }
    } else {
      while (added > Math.floor(days)) {
        d.setDate(d.getDate() - 1);
        const t = d.getTime();
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const isVacation = vacS && vacE && t >= vacS && t <= vacE;
        if (!isWeekend && !isVacation) {
          added--;
        }
      }
    }
    return d.toISOString().split('T')[0];
  };

  const timelineRef = React.useRef<HTMLDivElement>(null);
  const [draggingBar, setDraggingBar] = useState<{ type: 'part' | 'moment', partId: number, mIndex?: number, startX: number, initialStartDate: string, currentOffsetDays: number, totalDays: number } | null>(null);

  React.useEffect(() => {
    if (!draggingBar) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      const pxPerDay = timelineRef.current.clientWidth / draggingBar.totalDays;
      const deltaX = e.clientX - draggingBar.startX;
      const deltaDays = Math.round(deltaX / pxPerDay);
      setDraggingBar(prev => prev ? { ...prev, currentOffsetDays: deltaDays } : null);
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (draggingBar && timelineRef.current) {
        const pxPerDay = timelineRef.current.clientWidth / draggingBar.totalDays;
        const deltaX = e.clientX - draggingBar.startX;
        const deltaDays = Math.round(deltaX / pxPerDay);
        
        if (deltaDays !== 0) {
           const newDate = addDays(draggingBar.initialStartDate, deltaDays);
           if (draggingBar.type === 'part') {
              const p = parts.find(x => x.id === draggingBar.partId);
              if (p) {
                 updatePlanDates?.(p.id, newDate, p.endDate);
              }
           } else if (draggingBar.type === 'moment' && draggingBar.mIndex !== undefined) {
              const p = parts.find(x => x.id === draggingBar.partId);
              if (p && p.moments[draggingBar.mIndex]) {
                 updatePlanDates?.(p.id, newDate, p.moments[draggingBar.mIndex].endDate, draggingBar.mIndex);
              }
           }
        }
      }
      setDraggingBar(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingBar, parts, updatePlanDates]);

  const parts = calcResult.parts.filter(p => p.active !== false);

  const schedule = useMemo(() => {
    let currentDayOffset = 0;

    const timelineItems: {
      type: 'part' | 'moment';
      id: string;
      label: string;
      subLabel?: string;
      hours: number;
      durationDays: number;
      startDay: number;
      endDay: number;
      isPart?: boolean;
    }[] = [];

    let totalHours = 0;
    let totalVol = 0;

    parts.forEach(p => {
      // Calculate part start
      let partStartDay = currentDayOffset;
      if (p.startDate) {
         partStartDay = Math.max(0, getDaysDiff(projectStartDate, p.startDate));
      } else if (p.startDay !== undefined && p.startDay !== null) {
         partStartDay = p.startDay;
      }
      
      const partHours = p.tim;
      totalHours += partHours;
      totalVol += p.vol;

      let momentOffset = partStartDay;
      let partEndDay = partStartDay;

      const partItem = {
        type: 'part' as const,
        id: `p-${p.id}`,
        label: p.name,
        subLabel: `${p.qty} ${p.unit}`,
        hours: partHours,
        durationDays: 0,
        startDay: partStartDay,
        endDay: partStartDay,
        isPart: true
      };
      
      timelineItems.push(partItem);

      let hasActiveMoments = false;
      p.moments.forEach((m, mId) => {
        if (m.active === false || !m.hrs) return;
        hasActiveMoments = true;
        
        // Compute moment start
        let startDay = momentOffset;
        if (m.startDate) {
          startDay = Math.max(0, getDaysDiff(projectStartDate, m.startDate));
        } else if (m.startDay !== undefined && m.startDay !== null) {
          startDay = m.startDay;
        }
        
        const mWorkers = m.workers || workers;
        let durationDays = (m.hrs / mWorkers) / dailyHours;
        
        let endDay = startDay + durationDays;
        if (m.endDate) {
          const manualEndDay = Math.max(0, getDaysDiff(projectStartDate, m.endDate));
          if (manualEndDay >= startDay) {
            endDay = manualEndDay;
            durationDays = endDay - startDay;
          }
        }
        
        timelineItems.push({
          type: 'moment',
          id: `p-${p.id}-m-${mId}`,
          label: m.label,
          hours: m.hrs,
          durationDays,
          startDay,
          endDay
        });
        
        momentOffset = endDay;
        partEndDay = Math.max(partEndDay, endDay);
      });

      // Override part end date if explicitly set
      if (p.endDate) {
         const manualPartEnd = Math.max(0, getDaysDiff(projectStartDate, p.endDate));
         if (manualPartEnd >= partStartDay) {
           partEndDay = manualPartEnd;
         }
      } else if (!hasActiveMoments) {
         // Default part duration if it overrides moments or has no moments
         partEndDay = partStartDay + (partHours > 0 ? (partHours / workers / dailyHours) : 0);
      }

      // Part's end day is after all its moments finish or overridden
      partItem.endDay = partEndDay;
      partItem.durationDays = partEndDay - partItem.startDay;
      currentDayOffset = Math.max(currentDayOffset, partEndDay);
    });

    const totalDurationDays = Math.max(...timelineItems.map(t => t.endDay), 0);
    const totalDurationWeeks = Math.ceil(totalDurationDays / 5) || 1; 
    
    return {
      timelineItems,
      totalDurationDays,
      totalDurationWeeks,
      totalHours,
      totalVol
    };
  }, [parts, workers, dailyHours, projectStartDate, vacationStart, vacationEnd]);

  // Drag and Drop Handlers for Parts
  const handlePartDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedPartIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePartDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPartIndex(index);
  };

  const handlePartDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedPartIndex !== null && draggedPartIndex !== dropIndex) {
      reorderByggdelar(draggedPartIndex, dropIndex);
    }
    setDraggedPartIndex(null);
    setDragOverPartIndex(null);
  };

  // Drag and drop handlers for Moments
  const handleMomentDragStart = (e: React.DragEvent, partId: number, mIndex: number) => {
    e.stopPropagation();
    setDraggedMomentInfo({ partId, mIndex });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleMomentDragOver = (e: React.DragEvent, partId: number, mIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedMomentInfo?.partId === partId) {
      setDragOverMomentInfo({ partId, mIndex });
    }
  };

  const handleMomentDrop = (e: React.DragEvent, partId: number, mIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedMomentInfo && draggedMomentInfo.partId === partId && draggedMomentInfo.mIndex !== mIndex) {
      reorderMoment(partId, draggedMomentInfo.mIndex, mIndex);
    }
    setDraggedMomentInfo(null);
    setDragOverMomentInfo(null);
  };

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 my-8">
      <div className="bg-white border border-[var(--border)] rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--surface2)] flex flex-wrap gap-4 items-center justify-between">
           <div className="flex items-center gap-3 text-lg font-bold">
             <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
               <i className="fa-solid fa-timeline text-sm"></i>
             </div>
             <span>Aktiv Resurs- & Produktionsplanering</span>
           </div>
           
           <div className="flex flex-wrap gap-4 items-center bg-white px-4 py-2 border border-[var(--border)] rounded-lg shadow-sm">
             <div className="flex items-center gap-2">
               <label className="text-xs font-bold text-[var(--text2)] uppercase">Projektstart:</label>
               <input 
                 type="date" 
                 value={projectStartDate}
                 onChange={e => setProjectStartDate(e.target.value)}
                 className="border border-[var(--border)] rounded px-2 py-1 text-center font-mono text-sm outline-none focus:border-[var(--blue)] text-gray-700 bg-white"
               />
             </div>
             <div className="w-px h-6 bg-[var(--border)] hidden sm:block"></div>
             <div className="flex items-center gap-2">
               <label className="text-xs font-bold text-[var(--text2)] uppercase">Antal Arbetare:</label>
               <input 
                 type="number" 
                 min="1" 
                 max="50" 
                 value={workers} 
                 onChange={e => setWorkers(Math.max(1, parseInt(e.target.value) || 1))} 
                 className="w-16 border border-[var(--border)] rounded px-2 py-1 text-center font-mono outline-none focus:border-[var(--blue)]"
               />
             </div>
             <div className="w-px h-6 bg-[var(--border)] hidden sm:block"></div>
             <div className="flex items-center gap-2">
               <label className="text-xs font-bold text-[var(--text2)] uppercase">Timmar / Dag:</label>
               <input 
                 type="number" 
                 min="4" 
                 max="12" 
                 value={dailyHours} 
                 onChange={e => setDailyHours(Math.max(1, parseInt(e.target.value) || 8))} 
                 className="w-16 border border-[var(--border)] rounded px-2 py-1 text-center font-mono outline-none focus:border-[var(--blue)]"
               />
             </div>
           </div>

           <div className="flex flex-wrap gap-4 items-center bg-white px-4 py-2 border border-[var(--border)] rounded-lg shadow-sm">
             <div className="flex items-center gap-2">
               <i className="fa-solid fa-umbrella-beach text-[var(--text3)]"></i>
               <label className="text-xs font-bold text-[var(--text2)] uppercase">Semester (fr.o.m):</label>
               <input 
                 type="date" 
                 value={vacationStart}
                 onChange={e => setVacationStart(e.target.value)}
                 className="border border-[var(--border)] rounded px-2 py-1 text-[11px] text-center font-mono outline-none focus:border-[var(--blue)] text-gray-700 bg-white"
               />
             </div>
             <div className="w-px h-6 bg-[var(--border)] hidden sm:block"></div>
             <div className="flex items-center gap-2">
               <label className="text-xs font-bold text-[var(--text2)] uppercase">T.o.m:</label>
               <input 
                 type="date" 
                 value={vacationEnd}
                 onChange={e => setVacationEnd(e.target.value)}
                 className="border border-[var(--border)] rounded px-2 py-1 text-[11px] text-center font-mono outline-none focus:border-[var(--blue)] text-gray-700 bg-white"
               />
             </div>
           </div>
        </div>
        
        <div className="p-6">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-[var(--surface2)] p-4 rounded-lg border border-[var(--border)] flex flex-col justify-center items-center text-center">
                 <div className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text3)] mb-1">Totalt Arbetsbehov</div>
                 <div className="text-2xl font-mono font-bold text-[var(--blue)]">{schedule.totalHours.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-xs text-[var(--text2)] ml-1">h</span></div>
              </div>
              <div className="bg-[var(--surface2)] p-4 rounded-lg border border-[var(--border)] flex flex-col justify-center items-center text-center">
                 <div className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text3)] mb-1">Total Volym</div>
                 <div className="text-2xl font-mono font-bold text-[var(--text)]">{schedule.totalVol.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-xs text-[var(--text2)] ml-1">m³</span></div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200 flex flex-col justify-center items-center text-center">
                 <div className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-700 mb-1">Effektiva Arbetsdagar</div>
                 <div className="text-2xl font-mono font-bold text-amber-600">{Math.ceil(schedule.totalDurationDays)} <span className="text-xs text-amber-700/60 ml-1">dagar</span></div>
              </div>
              <div className="bg-[var(--surface2)] p-4 rounded-lg border border-[var(--border)] flex flex-col justify-center items-center text-center">
                 <div className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text3)] mb-1">Kalenderveckor</div>
                 <div className="text-2xl font-mono font-bold text-[var(--text)]">~{schedule.totalDurationWeeks} <span className="text-xs text-[var(--text2)] ml-1">v.</span></div>
              </div>
           </div>

           <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text2)]">Sekvensplanering (Drag & Drop)</h3>
              <span className="text-[10px] text-[var(--text3)]"><i className="fa-solid fa-arrows-up-down mr-1"></i> Dra och släpp för att prioritera om</span>
           </div>
           
           {schedule.timelineItems.length > 0 ? (
             <div className="overflow-x-auto pb-4">
               <div className="min-w-[800px]">
                 {/* Gantt Header */}
                 <div className="flex border-b border-[var(--border)] pb-2 mb-4 text-[10px] uppercase font-bold text-[var(--text3)] sticky top-0 bg-white z-10 w-full">
                   <div className="w-[45%] flex items-center pr-4 pl-8">
                      <span className="flex-1">Byggdel / Arbetsmoment</span>
                      <span className="w-[95px] text-center mx-1">Startdatum</span>
                      <span className="w-[95px] text-center mx-1">Slutdatum</span>
                      <span className="w-14 text-center mx-1">Antal Man</span>
                      <span className="w-16 text-right">Arbetstid</span>
                   </div>
                   <div ref={timelineRef} className="w-[55%] relative flex">
                     {Array.from({ length: schedule.totalDurationWeeks }).map((_, i) => (
                       <div key={i} className="flex-1 border-l border-[var(--border)] pl-1">V {i + 1}</div>
                     ))}
                   </div>
                 </div>

                 {/* Editable Sequenced List */}
                 <div className="space-y-[2px]">
                   {parts.map((p, pIndex) => (
                      <div key={p.id} className="relative group">
                          {/* Part Header Layer (for DND) */}
                          <div 
                             draggable 
                             onDragStart={e => handlePartDragStart(e, byggdelar.findIndex(b => b.id === p.id))}
                             onDragOver={e => handlePartDragOver(e, byggdelar.findIndex(b => b.id === p.id))}
                             onDrop={e => handlePartDrop(e, byggdelar.findIndex(b => b.id === p.id))}
                             className={`flex items-center text-sm py-1.5 rounded transition-colors ${dragOverPartIndex === byggdelar.findIndex(b => b.id === p.id) ? 'bg-[var(--blue-lt)] ring-1 ring-[var(--blue)]' : 'hover:bg-[var(--surface2)]'}`}
                          >
                            <div className="w-[45%] flex items-center pr-4">
                               <div className="w-6 flex justify-center text-[var(--text3)] opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"><i className="fa-solid fa-grip-vertical text-xs"></i></div>
                               <input 
                                 type="color" 
                                 value={p.color || '#3b82f6'} 
                                 onChange={e => updateByggdelColor?.(p.id, e.target.value)} 
                                 className="w-5 h-5 p-0 border-0 rounded cursor-pointer mr-2 shrink-0 bg-transparent"
                                 onClick={e => e.stopPropagation()}
                               />
                               <div className="font-bold text-[var(--text)] text-[13px] truncate flex-1">{p.name} <span className="font-normal text-[11px] text-[var(--text3)] ml-2">({p.qty} {p.unit})</span></div>
                               <input
                                  type="date"
                                  value={p.startDate ?? ''}
                                  onChange={e => updatePlanDates?.(p.id, e.target.value || undefined, p.endDate)}
                                  className="w-[95px] border border-[var(--border)] rounded px-1 py-0.5 text-center text-[10px] uppercase font-mono outline-none focus:border-[var(--blue)] mx-1 text-gray-700 bg-white"
                                  onClick={e => e.stopPropagation()}
                               />
                               <div className="w-[95px] px-1 py-0.5 text-center text-[10px] uppercase font-mono text-gray-500 bg-gray-50 border border-transparent mx-1 rounded whitespace-nowrap overflow-hidden flex items-center justify-center">
                                  {(() => {
                                     const item = schedule.timelineItems.find(t => t.id === `p-${p.id}`);
                                     return item ? addDays(projectStartDate, item.endDay) : '';
                                  })()}
                               </div>
                               <div className="w-14 mx-1 text-center text-[11px] font-mono text-[var(--text3)] flex items-center justify-center">
                                  {(() => {
                                      let totalW = 0, count = 0;
                                      p.moments.forEach(m => { if (m.active !== false && m.hrs) { totalW += m.workers || workers; count++; } });
                                      return count ? (totalW/count).toFixed(1) : '-';
                                  })()}
                               </div>
                               <div className="w-12 text-right text-[11px] font-bold text-[var(--text2)] font-mono">{p.tim.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h</div>
                            </div>
                            <div className="w-[55%] relative h-6">
                               {/* Part background summary bar */}
                               <div className="absolute inset-0 flex pointer-events-none">
                                  {Array.from({ length: schedule.totalDurationWeeks }).map((_, i) => (
                                    <div key={i} className="flex-1 border-l border-[var(--border)]/30 first:border-l-0"></div>
                                  ))}
                               </div>
                               {/* Plotting matching timeline item */}
                                 {(() => {
                                 const item = schedule.timelineItems.find(t => t.id === `p-${p.id}`);
                                 if (!item) return null;
                                 const totalDaysScale = schedule.totalDurationWeeks * 5;
                                 const isDragging = draggingBar?.type === 'part' && draggingBar.partId === p.id;
                                 const startPercent = ((item.startDay + (isDragging ? draggingBar.currentOffsetDays : 0)) / totalDaysScale) * 100;
                                 const widthPercent = (item.durationDays / totalDaysScale) * 100;
                                 const bgColor = p.color ? p.color + '33' : 'var(--blue-lt)';
                                 const borderColor = p.color || 'var(--blue)';
                                 return (
                                   <div 
                                     onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDraggingBar({ type: 'part', partId: p.id, startX: e.clientX, initialStartDate: p.startDate || addDays(projectStartDate, item.startDay), currentOffsetDays: 0, totalDays: totalDaysScale });
                                     }}
                                     className={`absolute top-[4px] bottom-[4px] rounded-r border-l-4 transition-colors cursor-col-resize hover:opacity-80 active:opacity-100 ${isDragging ? 'shadow-lg z-10' : ''}`}
                                     style={{ left: `${startPercent}%`, width: `${Math.max(widthPercent, 0.2)}%`, backgroundColor: bgColor, borderColor: borderColor }}
                                     title={`${p.name}\nStart: ${addDays(projectStartDate, item.startDay)}\nSlut: ${addDays(projectStartDate, item.endDay)}\nLängd: ${item.durationDays.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} dagar`}
                                   >
                                      {widthPercent > 5 && <div className="text-[9px] font-bold w-full text-center whitespace-nowrap overflow-hidden text-ellipsis pointer-events-none" style={{ color: borderColor }}>{item.durationDays.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} dagar</div>}
                                   </div>
                                 );
                               })()}
                            </div>
                          </div>

                          {/* Moments underneath the Part */}
                          <div className="ml-6 border-l-2 border-[var(--border)] pl-1 mb-3 space-y-px">
                          {(p.moments || []).map((m, originalMIndex) => {
                              if (m.active === false || !m.hrs) return null;
                              return (
                               <div 
                                 key={originalMIndex} 
                                 draggable
                                 onDragStart={e => handleMomentDragStart(e, p.id, originalMIndex)}
                                 onDragOver={e => handleMomentDragOver(e, p.id, originalMIndex)}
                                 onDrop={e => handleMomentDrop(e, p.id, originalMIndex)}
                                 className={`flex items-center text-xs py-1 rounded group/mom transition-colors \${dragOverMomentInfo?.partId === p.id && dragOverMomentInfo?.mIndex === originalMIndex ? 'bg-[var(--blue-lt)] ring-1 ring-[var(--blue)]' : 'hover:bg-[var(--surface2)]'}`}
                               >
                                  <div className="w-[45%] flex items-center pr-4">
                                     <div className="w-5 flex justify-center text-[var(--text3)] opacity-0 group-hover/mom:opacity-100 cursor-grab active:cursor-grabbing">
                                        <i className="fa-solid fa-grip-lines text-[10px]"></i>
                                     </div>
                                     <div className="truncate text-[var(--text2)] flex-1">{m.label}</div>
                                     <input
                                        type="date"
                                        value={m.startDate ?? ''}
                                        onChange={e => updatePlanDates?.(p.id, e.target.value || undefined, m.endDate, originalMIndex)}
                                        className="w-[95px] border border-[var(--border)] rounded px-1 py-0 text-center text-[10px] uppercase font-mono outline-none focus:border-[var(--blue)] mx-1 text-gray-700 bg-white"
                                        onClick={e => e.stopPropagation()}
                                     />
                                     <div className="w-[95px] px-1 py-0 text-center text-[10px] uppercase font-mono text-gray-500 bg-gray-50 border border-transparent mx-1 rounded whitespace-nowrap overflow-hidden flex items-center justify-center">
                                        {(() => {
                                           const item = schedule.timelineItems.find(t => t.id === `p-${p.id}-m-${originalMIndex}`);
                                           return item ? addDays(projectStartDate, item.endDay) : '';
                                        })()}
                                     </div>
                                     <div className="w-14 mx-1 flex items-center justify-center">
                                        <input
                                           type="number"
                                           min="1"
                                           max="99"
                                           value={m.workers || workers}
                                           onChange={e => updateMomentWorkers?.(p.id, originalMIndex, parseInt(e.target.value) || 1)}
                                           className="w-10 border border-[var(--border)] rounded px-1 text-center text-[10px] font-mono outline-none focus:border-[var(--blue)] bg-white"
                                           onClick={e => e.stopPropagation()}
                                        />
                                     </div>
                                     <div className="w-12 text-right text-[10px] text-[var(--text3)] font-mono">{m.hrs!.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h</div>
                                  </div>
                                  <div className="w-[55%] relative h-5">
                                      <div className="absolute inset-0 flex pointer-events-none">
                                        {Array.from({ length: schedule.totalDurationWeeks }).map((_, i) => (
                                          <div key={i} className="flex-1 border-l border-[var(--border)]/30 first:border-l-0"></div>
                                        ))}
                                      </div>
                                      {/* Bar */}
                                      {(() => {
                                        const item = schedule.timelineItems.find(t => t.id === `p-${p.id}-m-${originalMIndex}`);
                                        if (!item) return null;
                                        const totalDaysScale = schedule.totalDurationWeeks * 5;
                                        const isDragging = draggingBar?.type === 'moment' && draggingBar.partId === p.id && draggingBar.mIndex === originalMIndex;
                                        const startPercent = ((item.startDay + (isDragging ? draggingBar.currentOffsetDays : 0)) / totalDaysScale) * 100;
                                        const widthPercent = (item.durationDays / totalDaysScale) * 100;
                                        const momentBgColor = p.color ? p.color : '#6366f1';
                                        return (
                                          <div 
                                            onMouseDown={(e) => {
                                               e.preventDefault();
                                               e.stopPropagation();
                                               setDraggingBar({ type: 'moment', partId: p.id, mIndex: originalMIndex, startX: e.clientX, initialStartDate: m.startDate || addDays(projectStartDate, item.startDay), currentOffsetDays: 0, totalDays: totalDaysScale });
                                            }}
                                            className={`absolute top-0.5 bottom-0.5 rounded shadow-sm flex items-center px-2 text-[9px] font-bold text-white overflow-hidden transition-colors cursor-col-resize hover:brightness-110 active:brightness-95 ${isDragging ? 'shadow-lg z-10 ring-2 ring-white' : ''}`}
                                            style={{ left: `${startPercent}%`, width: `${Math.max(widthPercent, 0.5)}%`, backgroundColor: momentBgColor, opacity: 0.9 }}
                                            title={`${m.label}: ${m.hrs!.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h\nStart: ${addDays(projectStartDate, item.startDay)}\nSlut: ${addDays(projectStartDate, item.endDay)}\nLängd: ${item.durationDays.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} dagar`}
                                          />
                                        );
                                      })()}
                                  </div>
                               </div>
                            )}
                          )}
                          </div>
                      </div>
                   ))}
                 </div>
               </div>
             </div>
           ) : (
             <div className="text-[var(--text3)] italic text-sm py-8 text-center border border-dashed border-[var(--border)] rounded-lg">
               Inga aktiva byggdelar för tidsplaneringen.
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

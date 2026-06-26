import { Byggdel, ProjectInfo, CompanyInfo } from './data';
import { CalculationResult } from './useCalculation';

export async function exportExcel(
  byggdelar: Byggdel[],
  calcResult: CalculationResult,
  projectInfo: ProjectInfo,
  companyInfo: CompanyInfo
) {
  const module = await import('xlsx');
  const XLSX = module.default || module;
  
  // We want: en rad per byggdel (typ/kod, mängd, enhet, à-pris material, à-pris arbete, summa), 
  // grupperat per kategori med delsummor och en totalrad. CO2 kolumn.
  
  const rows: any[] = [];
  
  // Header Info
  rows.push(["Mängdförteckning & Kalkyl", projectInfo.name || '']);
  rows.push(["Datum:", new Date().toLocaleDateString('sv-SE')]);
  rows.push(["Entreprenör:", companyInfo.name || '']);
  rows.push([]);

  // Table Headers
  const header = [
    "Byggdel / Kod",
    "Typ",
    "Mängd",
    "Enh",
    "á-pris Mat (kr)",
    "á-pris Arb (kr)",
    "Totalt (kr)",
    "CO2e (kg)"
  ];
  rows.push(header);

  let totalCost = 0;
  let totalCo2 = 0;

  // Group active byggdelar by type
  const activeByggdelar = byggdelar.filter(b => b.active !== false);
  const groups: Record<string, Byggdel[]> = {};
  
  activeByggdelar.forEach(b => {
    const type = b.type || 'Övrigt';
    if (!groups[type]) groups[type] = [];
    groups[type].push(b);
  });

  // Calculate CO2 map
  const co2Map = calcResult.co2.parts;

  for (const [type, parts] of Object.entries(groups)) {
    let groupCost = 0;
    let groupCo2 = 0;
    
    // Group header
    rows.push([`-- ${type} --`]);
    
    for (const p of parts) {
      const pRes = calcResult.parts.find(res => res.id === p.id);
      if (!pRes) continue;
      
      const qty = (p.qty || 1) * (p.antal || 1);
      const co2 = co2Map[p.id] || 0;
      
      const matPerUnit = qty > 0 ? (pRes.costNetto - pRes.tim * calcResult.hourlyRate) / qty : 0;
      const arbPerUnit = qty > 0 ? (pRes.tim * calcResult.hourlyRate) / qty : 0;
      
      rows.push([
        p.name,
        p.type,
        qty,
        p.unit || '',
        Math.round(matPerUnit),
        Math.round(arbPerUnit),
        Math.round(pRes.costNetto),
        Math.round(co2)
      ]);
      
      groupCost += pRes.costNetto;
      groupCo2 += co2;
    }
    
    // Group footer
    rows.push([
      "Delsumma",
      "",
      "",
      "",
      "",
      "",
      Math.round(groupCost),
      Math.round(groupCo2)
    ]);
    rows.push([]);
    
    totalCost += groupCost;
    totalCo2 += groupCo2;
  }
  
  // Total
  rows.push([
    "TOTALT",
    "",
    "",
    "",
    "",
    "",
    Math.round(totalCost),
    Math.round(totalCo2)
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Kalkyl");
  
  XLSX.writeFile(wb, `Kalkyl_${projectInfo.name || 'Projekt'}.xlsx`);
}

export async function exportPdf(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const module = await import('html2pdf.js');
  const html2pdf = module.default || module;

  const opt = {
    margin:       10,
    filename:     filename,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
}

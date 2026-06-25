export interface ProjectFolder {
  id: string;
  name: string;
}

export interface ProjectVersion {
  id: string;
  name: string;
  timestamp: string;
  byggdelar: Byggdel[];
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  details?: string;
}

export interface SavedProject {
  id: string;
  folderId: string | null;
  byggdelar: Byggdel[];
  projectInfo: ProjectInfo;
  settings: any;
  versions?: ProjectVersion[];
  activityLogs?: ActivityLog[];
}

export type ProjectInfo = {
  nr: string;
  name: string;
  client: string;
  clientOrgNr: string;
  clientContact: string;
  clientEmail: string;
  clientPhone: string;
  ort: string;
  lan: string;
  land: string;
  status?: string;
  contractType?: 'AB04' | 'ABT06' | string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  bta?: number;
};

export type UserSettings = {
  language: string;
  currency: string;
  defaultMargin: number;
};

export const INITIAL_USER_SETTINGS: UserSettings = {
  language: 'sv',
  currency: 'SEK',
  defaultMargin: 0.15
};

export type CompanyInfo = {
  name: string;
  orgNr: string;
  contactPerson: string;
  email: string;
  phone: string;
  ort: string;
  lan: string;
  land: string;
};

export const INITIAL_PROJECT_INFO: ProjectInfo = {
  nr: '',
  name: '',
  client: '',
  clientOrgNr: '',
  clientContact: '',
  clientEmail: '',
  clientPhone: '',
  ort: '',
  lan: '',
  land: 'Sverige',
  startDate: '',
  endDate: ''
};

export const INITIAL_COMPANY_INFO: CompanyInfo = {
  name: '',
  orgNr: '',
  contactPerson: '',
  email: '',
  phone: '',
  ort: '',
  lan: '',
  land: 'Sverige'
};

export type Material = {
  cat: string;
  name: string;
  unit: string;
  price: number;
  spill: number;
  konto: string;
  lev?: string;
  note?: string;
  priceHistory?: { date: string; price: number }[];
  co2PerUnit?: number;
  co2Source?: string;
  lcaIndicators?: { name: string; unit: string; amount: number }[];
};

export type ArbetsMoment = {
  id: number;
  cat: string;
  name: string;
  tid: number;
  unit: string;
  sv: number;
  note: string;
  timeHistory?: { date: string; tid: number }[];
};

export type Tidsfaktor = {
  type: string;
  label: string;
  faktor: number;
  note: string;
  timeHistory?: { date: string; faktor: number }[];
};

export type Dimensions = {
  length: number;
  width: number;
  height: number;
  weight?: number;
  shaftWidth?: number;
  shaftHeight?: number;
  wallThickness?: number;
  slabThickness?: number;
  qty?: number;
  area?: number;
  perimeter?: number;
  stepCount?: number;     // Number of steps
  stepWidth?: number;     // Width of each step (tread) usually same as whole stair width but sometimes asked separately
  stepHeight?: number;    // Height of each step (riser)
  stepDepth?: number;     // Depth of each step (tread)
  rampThickness?: number; // Ramp under stairs
};

export type Byggdel = {
  id: number;
  name: string;
  type: string;
  group?: string; // e.g. "Hus A", "Källare"
  revision?: string; // e.g. "Kopia 1", "Alternativ 2"
  material?: string; // e.g. from IFC extraction
  qty: number;
  antal?: number; // Antal instanser / Multiplier
  objFactor?: number;   // Object factor for time calculations
  dimensions?: Dimensions;
  comment: string;
  active: boolean;
  collapsed?: boolean;
  startDay?: number;
  startDate?: string;
  endDate?: string;
  color?: string; // Color for planning
  showPriceInOffer?: boolean; // Show price in offer table
  vMatP?: number; // Custom material margin
  vArbP?: number; // Custom labor margin
  timeFactor?: number; // Custom time factor
  moments: {
    label: string;
    material: string;
    arbetsmoment?: string;
    amount: number;
    timeUnit: number;
    active: boolean;
    startDay?: number;
    startDate?: string;
    endDate?: string;
    workers?: number; // Number of workers for this moment
    hrs?: number;
    cost?: number;
    matUnit?: string;
  }[];
};

export const DEFAULT_MATERIAL: Partial<Material> = {
  price: 0,
  spill: 5,
  konto: "4000",
  unit: "st"
};

export const INITIAL_MATERIALS: Material[] = [
  {cat:"Betong",name:"Betong C25/30",unit:"m³",price:1750,spill:5,konto:"4011", co2PerUnit: 250, co2Source: "Boverket", lcaIndicators: [{name: "GWP-total", unit: "kg CO2e", amount: 250}, {name: "Försurning (AP)", unit: "mol H+ eq", amount: 0.15}, {name: "Övergödning (EP)", unit: "kg P eq", amount: 0.05}], priceHistory: [
    { date: "2023-01-15", price: 1550 },
    { date: "2023-06-20", price: 1600 },
    { date: "2024-01-10", price: 1680 },
    { date: "2024-05-02", price: 1750 }
  ]},
  {cat:"Betong",name:"Betong C28/35",unit:"m³",price:1800,spill:5,konto:"4011"},
  {cat:"Betong",name:"Betong C30/37",unit:"m³",price:1850,spill:5,konto:"4011"},
  {cat:"Betong",name:"Betong C32/40",unit:"m³",price:1920,spill:5,konto:"4011"},
  {cat:"Betong",name:"Betong C35/45",unit:"m³",price:2000,spill:5,konto:"4011"},
  {cat:"Betong",name:"Betong C40/50",unit:"m³",price:2100,spill:5,konto:"4011"},
  {cat:"Betong",name:"Betong C45/55",unit:"m³",price:2200,spill:5,konto:"4011"},
  {cat:"Betong",name:"Betong C50/60",unit:"m³",price:2350,spill:5,konto:"4011"},
  {cat:"Betong",name:"Anläggningsbetong C35/45",unit:"m³",price:2100,spill:5,konto:"4012"},
  {cat:"Betong",name:"Anläggningsbetong C40/50",unit:"m³",price:2200,spill:5,konto:"4012"},
  {cat:"Armering",name:"Lösarmering",unit:"kg",price:13,spill:10,konto:"4021"},
  {cat:"Armering",name:"Armering ILF",unit:"kg",price:15,spill:5,konto:"4021"},
  {cat:"Armering",name:"Nätarmering #7100",unit:"m²",price:85,spill:10,konto:"4022"},
  {cat:"Armering",name:"Nätarmering #8100",unit:"m²",price:95,spill:10,konto:"4022"},
  {cat:"Armering",name:"Nätarmering #10100",unit:"m²",price:120,spill:10,konto:"4022"},
  {cat:"Armering",name:"Nätarmering #12100",unit:"m²",price:140,spill:10,konto:"4022"},
  {cat:"Isolering",name:"Cellplast S100",unit:"m²",price:115,spill:5,konto:"4031"},
  {cat:"Isolering",name:"Cellplast S150",unit:"m²",price:130,spill:5,konto:"4031"},
  {cat:"Isolering",name:"Cellplast S200",unit:"m²",price:150,spill:5,konto:"4031"},
  {cat:"Isolering",name:"Cellplast XPS200",unit:"m²",price:210,spill:5,konto:"4031"},
  {cat:"Isolering",name:"Cellplast XPS300",unit:"m²",price:250,spill:5,konto:"4031"},
  {cat:"Isolering",name:"Isodrän",unit:"m²",price:165,spill:5,konto:"4031"},
  {cat:"Komplettering",name:"Plastfolie",unit:"m²",price:15,spill:10,konto:"4041"},
  {cat:"Komplettering",name:"Tätmembran",unit:"m²",price:90,spill:5,konto:"4041"},
  {cat:"Komplettering",name:"Radonmembran",unit:"m²",price:125,spill:5,konto:"4041"},
  {cat:"Komplettering",name:"Distanser",unit:"st",price:6,spill:5,konto:"4051"},
  {cat:"Komplettering",name:"Avstängare",unit:"m",price:140,spill:5,konto:"4051"},
  {cat:"Komplettering",name:"Förtagningslåda",unit:"m",price:220,spill:0,konto:"4051"},
  {cat:"Komplettering",name:"Vattenband PVC",unit:"m",price:185,spill:5,konto:"4051"},
  {cat:"Komplettering",name:"Form virke",unit:"m²",price:450,spill:0,konto:"4061"},
  {cat:"Komplettering",name:"Systemform",unit:"m²",price:180,spill:0,konto:"4061"}
];

export const INITIAL_ARBETS_DATA: ArbetsMoment[] = [
  {id:6,  cat:'Formarbete',        name:'Form virke',              tid:0.40,  unit:'m²', sv:1.0,  note:'Bygga och riva träform', timeHistory: []},
  {id:7,  cat:'Formarbete',        name:'Systemform',              tid:0.25,  unit:'m²', sv:0.9,  note:'Snabbare systemlösning', timeHistory: []},
  {id:11, cat:'Formarbete',        name:'Form komplicerad',        tid:0.60,  unit:'m²', sv:1.2,  note:'Inklädnad, krökar, speciell form', timeHistory: []},
  {id:4,  cat:'Armeringsarbete',   name:'Lösarmering',             tid:0.020, unit:'kg', sv:1.0,  note:'Kapa, bocka, lägga lösarmering', timeHistory: []},
  {id:5,  cat:'Armeringsarbete',   name:'Nätarmering',             tid:0.080, unit:'m²', sv:1.0,  note:'Läggning av armeringsnät', timeHistory: []},
  {id:12, cat:'Armeringsarbete',   name:'Armering ILF',            tid:0.015, unit:'kg', sv:0.9,  note:'Industriellt färdigarmerat', timeHistory: []},
  {id:1,  cat:'Betongarbete',      name:'Gjutning betong',         tid:1.30,  unit:'m³', sv:1.0,  note:'Standard betonggjutning', timeHistory: []},
  {id:3,  cat:'Betongarbete',      name:'Gjutning platta',         tid:0.90,  unit:'m³', sv:1.0,  note:'Plan plattgjutning', timeHistory: []},
  {id:2,  cat:'Betongarbete',      name:'Gjutning svår form',      tid:1.80,  unit:'m³', sv:1.2,  note:'Trånga utrymmen / komplicerad form', timeHistory: []},
  {id:13, cat:'Betongarbete',      name:'Härdning & efterbehandling', tid:0.20, unit:'m³', sv:1.0, note:'Täckning, vattning, härdning', timeHistory: []},
  {id:8,  cat:'Isoleringsarbete',  name:'Cellplastläggning',       tid:0.15,  unit:'m²', sv:1.0,  note:'Läggning av cellplastisolering', timeHistory: []},
  {id:14, cat:'Isoleringsarbete',  name:'Isodrän läggning',        tid:0.12,  unit:'m²', sv:1.0,  note:'Dränerade isoleringsskivor', timeHistory: []},
  {id:9,  cat:'Komplettering',     name:'Plastfolie',              tid:0.050, unit:'m²', sv:1.0,  note:'Plastfolie under platta', timeHistory: []},
  {id:10, cat:'Komplettering',     name:'Tätmembran',              tid:0.120, unit:'m²', sv:1.0,  note:'Tätskikt / membran', timeHistory: []},
  {id:15, cat:'Komplettering',     name:'Radonmembran',            tid:0.100, unit:'m²', sv:1.0,  note:'Radonskyddande membran', timeHistory: []},
  {id:16, cat:'Komplettering',     name:'Distanser',               tid:0.005, unit:'st', sv:1.0,  note:'Betongdistanser', timeHistory: []},
  {id:17, cat:'Komplettering',     name:'Avstängare',              tid:0.100, unit:'m',  sv:1.0,  note:'Röravstängare / håltagning', timeHistory: []},
  {id:18, cat:'Komplettering',     name:'Förtagningslåda',         tid:0.150, unit:'m',  sv:1.0,  note:'Foga ihop sektioner', timeHistory: []},
  {id:19, cat:'Formarbete',        name:'Broform',                 tid:0.50,  unit:'m²', sv:1.1,  note:'Kraftig form för anläggning', timeHistory: []},
  {id:20, cat:'Formarbete',        name:'Tunnelform',              tid:0.60,  unit:'m²', sv:1.3,  note:'Valvform', timeHistory: []},
  {id:21, cat:'Armeringsarbete',   name:'Grov Armering',           tid:0.015, unit:'kg', sv:0.9,  note:'Grova dimensioner anläggning', timeHistory: []},
  {id:22, cat:'Komplettering',     name:'Montering Vattenband',    tid:0.12,  unit:'m',  sv:1.2,  note:'Vattentäta fogar anläggning', timeHistory: []}
];

export const INITIAL_TIDSFAKTORER: Tidsfaktor[] = [
  {type:'24.1_Fundament',   label:'24 - Fundament / Plint',             faktor:1.0,  note:'Standard', timeHistory: []},
  {type:'24.2_Sula',        label:'24 - Sula med skaft',                faktor:1.1,  note:'Skaft ökar komplexitet', timeHistory: []},
  {type:'24.3_Grop',        label:'24 - Grundgrop',                     faktor:1.25, note:'Vägg + platta, trängt', timeHistory: []},
  {type:'24.4_Grundbalk',   label:'24 - Grundbalk',                     faktor:1.15, note:'Kontinuerlig form', timeHistory: []},
  {type:'27.1_PlattaMark',  label:'27 - Bottenplatta / Platta på mark', faktor:0.95, note:'Effektiv plattgjutning', timeHistory: []},
  {type:'31.1_VaggEnkelsid',label:'31 - Vägg (Enkelsidig form)',        faktor:1.3,  note:'Mothåll mot spont/berg', timeHistory: []},
  {type:'31.2_Vagg',        label:'31 - Vägg (Tvåsidig form)',          faktor:1.2,  note:'Standard vägg', timeHistory: []},
  {type:'32.1_Pelare',      label:'32 - Pelare',                        faktor:1.3,  note:'Alla sidor, noggrann passning', timeHistory: []},
  {type:'33.1_Balk',        label:'33 - Balk',                          faktor:1.2,  note:'Höjdsidor + underkant', timeHistory: []},
  {type:'34.1_Bjalklag',    label:'34 - Bjälklag',                      faktor:1.0,  note:'Plan yta, effektiv form', timeHistory: []},
  {type:'35.1_Trappa',      label:'35 - Trappor / Vilplan',             faktor:1.5,  note:'Komplicerat formarbete', timeHistory: []},
  {type:'36.1_Balkong',     label:'36 - Balkonger / Skärmtak',          faktor:1.25, note:'Utkragande, understämpling', timeHistory: []},
  {type:'41.1_Stodmur',     label:'41 - Stödmur',                       faktor:1.4,  note:'Tung form, höga tryck', timeHistory: []},
  {type:'42.1_Bropelare',   label:'42 - Bropelare',                     faktor:1.5,  note:'Massiva konstruktioner', timeHistory: []},
  {type:'43.1_Brofarbana',  label:'43 - Brofarbana',                    faktor:1.5,  note:'Mycket ställning och form', timeHistory: []},
  {type:'44.1_Tunnelvalv',  label:'44 - Tunnelvalv',                    faktor:1.8,  note:'Tunnelform, special', timeHistory: []},
  {type:'45.1_Landfaste',   label:'45 - Landfäste',                     faktor:1.3,  note:'Grov konstruktion', timeHistory: []},
  {type:'46.1_Vingmur',     label:'46 - Vingmur',                       faktor:1.4,  note:'Stödmursliknande', timeHistory: []},
  {type:'47.1_Trog',        label:'47 - Betongtråg',                    faktor:1.3,  note:'Vattentät, platta och vägg', timeHistory: []},
  {type:'48.1_Paldack',     label:'48 - Påldäck',                       faktor:1.2,  note:'Grov platta', timeHistory: []},
];

export const TYPE_UNIT: Record<string, string> = { 
  '24.1_Fundament': 'st',
  '24.2_Sula': 'm',
  '24.3_Grop': 'st',
  '24.4_Grundbalk': 'm',
  '27.1_PlattaMark': 'm²',
  '31.1_VaggEnkelsid': 'm²',
  '31.2_Vagg': 'm²',
  '32.1_Pelare': 'st',
  '33.1_Balk': 'm',
  '34.1_Bjalklag': 'm²',
  '35.1_Trappa': 'm',
  '36.1_Balkong': 'm²',
  '41.1_Stodmur': 'm',
  '42.1_Bropelare': 'st',
  '43.1_Brofarbana': 'm²',
  '44.1_Tunnelvalv': 'm',
  '45.1_Landfaste': 'st',
  '46.1_Vingmur': 'st',
  '47.1_Trog': 'm',
  '48.1_Paldack': 'm²'
};

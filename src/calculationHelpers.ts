import { Byggdel } from "./data";

export function calculateBaseMoments(mType: string, dims: any) {
  const { qty: Q = 1, length: L = 1, width: W = 1, height: H = 0.2, shaftWidth: SW = 0.2, shaftHeight: SH = 0.5, wallThickness: WT = 0.2, slabThickness: ST = 0.2, perimeter: P = 12 } = dims;

  let formAreaTotal = 0;
  let volTotal = 0;

  if (mType === '24.1_Fundament' || mType === '32.1_Pelare') {
    volTotal = Q * (L * W * H);
    formAreaTotal = Q * (2 * (L + W) * H);
  } else if (mType === '24.2_Sula') {
    volTotal = Q * (W * H + SW * SH);
    formAreaTotal = Q * (2 * H + 2 * SH); // shaft form + sula form
  } else if (mType === '24.4_Grundbalk' || mType === '33.1_Balk') {
    volTotal = Q * (W * H);
    formAreaTotal = mType === '33.1_Balk' ? Q * (2 * H + W) : Q * (2 * H);
  } else if (mType === '35.1_Trappa') {
    const sC = dims.stepCount ?? 10;
    const sW = dims.stepWidth ?? W;
    const sH = dims.stepHeight ?? 0.16;
    const sD = dims.stepDepth ?? 0.28;
    const rT = dims.rampThickness ?? 0.20;

    const run = sD * sC;
    const rise = sH * sC;
    const rampLength = Math.sqrt(run * run + rise * rise);
    
    const volRamp = rampLength * sW * rT;
    const volSteps = sC * ((sD * sH) / 2) * sW;
    volTotal = Q * (volRamp + volSteps);

    const formRampSides = 2 * (rampLength * rT);
    const formStepsSides = 2 * (sC * (sD * sH) / 2);
    const formRampBottom = rampLength * sW;
    const formRisers = sC * sH * sW;
    formAreaTotal = Q * (formRampSides + formStepsSides + formRampBottom + formRisers);
  } else if (mType === '27.1_PlattaMark') {
    volTotal = Q * H;
    formAreaTotal = P * H;
  } else if (mType === '34.1_Bjalklag' || mType === '36.1_Balkong') {
    volTotal = Q * H; // Q is m2
    formAreaTotal = P * H + Q; // Edges + bottom form
  } else if (mType === '31.1_VaggEnkelsid' || mType === '31.2_Vagg') {
    volTotal = Q * W; // W is thickness
    formAreaTotal = mType === '31.2_Vagg' ? Q * 2 : Q;
  } else if (mType === '24.3_Grop') {
    const innerL = Math.max(0, L - 2 * WT);
    const innerW = Math.max(0, W - 2 * WT);
    const volPlatta = L * W * ST;
    const volVagg = (L * W - innerL * innerW) * H;
    volTotal = Q * (volPlatta + volVagg);
    
    const formPlatta = 2 * (L + W) * ST; // plattans kantform
    const formYtterVagg = 2 * (L + W) * H; // väggarnas ytterform
    const formInnerVagg = 2 * (innerL + innerW) * H; // väggarnas innerform, baserat på innermått efter väggtjocklek
    
    formAreaTotal = Q * (formPlatta + formYtterVagg + formInnerVagg);
  } else if (mType === '41.1_Stodmur' || mType === '46.1_Vingmur') {
    const volSula = L * W * ST;
    const volVagg = L * WT * Math.max(0, H - ST);
    volTotal = Q * (volSula + volVagg);
    const formSula = 2 * (L + W) * ST;
    const formVagg = 2 * L * Math.max(0, H - ST) + 2 * WT * Math.max(0, H - ST);
    formAreaTotal = Q * (formSula + formVagg);
  } else if (mType === '42.1_Bropelare' || mType === '45.1_Landfaste') {
    volTotal = Q * (L * W * H);
    formAreaTotal = Q * (2 * (L + W) * H);
  } else if (mType === '43.1_Brofarbana' || mType === '48.1_Paldack') {
    volTotal = Q * H; // Q is m2
    formAreaTotal = P * H + Q; // Edge form + bottom form
  } else if (mType === '44.1_Tunnelvalv') {
    volTotal = Q * (P * H); // P here acts as arch length
    formAreaTotal = Q * P; // inner arch form surface
  } else if (mType === '47.1_Trog') {
    const volBotten = L * W * ST;
    const volVaggBada = 2 * (L * WT * Math.max(0, H - ST));
    volTotal = Q * (volBotten + volVaggBada);
    const formBottenKant = 2 * (L + W) * ST;
    const formVaggBada = 4 * L * Math.max(0, H - ST) + 4 * WT * Math.max(0, H - ST);
    formAreaTotal = Q * (formBottenKant + formVaggBada);
  }

  const betongPerUnit = Q > 0 ? volTotal / Q : 0;
  const formPerUnit = Q > 0 ? formAreaTotal / Q : 0;
  // 80kg/m3 is standard for husbyggnad, 120kg/m3 for anläggning
  const armeringPerUnit = betongPerUnit * (mType.startsWith('4') ? 120 : 80);

  return { betongPerUnit, formPerUnit, armeringPerUnit };
}

export function calculateDefaultMoments(mType: string, dims: any) {
  const { betongPerUnit, formPerUnit, armeringPerUnit } = calculateBaseMoments(mType, dims);

  if (mType.startsWith('4')) { // Anläggning
      return [
        { label: 'Betong', material: 'Anläggningsbetong C35/45', arbetsmoment: 'Gjutning svår form', amount: parseFloat(betongPerUnit.toFixed(4)), timeUnit: 1.80, active: true },
        { label: 'Form', material: 'Form virke', arbetsmoment: mType === '44.1_Tunnelvalv' ? 'Tunnelform' : 'Broform', amount: parseFloat(formPerUnit.toFixed(4)), timeUnit: 0.50, active: true },
        { label: 'Armering', material: 'Lösarmering', arbetsmoment: 'Grov Armering', amount: parseFloat(armeringPerUnit.toFixed(4)), timeUnit: 0.015, active: true },
      ];
  }

  return [
    { label: 'Betong', material: 'Betong C30/37', arbetsmoment: 'Gjutning betong', amount: parseFloat(betongPerUnit.toFixed(4)), timeUnit: 1.30, active: true },
    { label: 'Form', material: 'Systemform', arbetsmoment: 'Systemform', amount: parseFloat(formPerUnit.toFixed(4)), timeUnit: 0.25, active: true },
    { label: 'Armering', material: 'Armering ILF', arbetsmoment: 'Armering ILF', amount: parseFloat(armeringPerUnit.toFixed(4)), timeUnit: 0.015, active: true },
  ];
}

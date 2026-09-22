// src/shared/utils/hvacCalculations.ts
// HVAC-R Thermodynamic Formulas & Refrigerant P-T Saturation Engine

export interface RefrigerantPTData {
  name: string;
  type: string;
  getSatTempFromPsig: (psig: number) => number;
  getSatPsigFromTemp: (tempC: number) => number;
  typicalEvapTD: number;
  typicalCondTD: number;
}

export const REFRIGERANTS_DATABASE: Record<string, RefrigerantPTData> = {
  "R-410A": {
    name: "R-410A",
    type: "HFC (Alta Presión / Ecológico)",
    typicalEvapTD: 8,
    typicalCondTD: 12,
    getSatTempFromPsig: (psig: number) => {
      if (psig <= 0) return -50;
      const p = Math.max(1, psig);
      return Number((17.2 * Math.log(p) - 78.5).toFixed(1));
    },
    getSatPsigFromTemp: (tempC: number) => {
      return Number(Math.exp((tempC + 78.5) / 17.2).toFixed(1));
    }
  },
  "R-22": {
    name: "R-22",
    type: "HCFC (Tradicional)",
    typicalEvapTD: 8,
    typicalCondTD: 14,
    getSatTempFromPsig: (psig: number) => {
      if (psig <= 0) return -40;
      const p = Math.max(1, psig);
      return Number((19.8 * Math.log(p) - 80.2).toFixed(1));
    },
    getSatPsigFromTemp: (tempC: number) => {
      return Number(Math.exp((tempC + 80.2) / 19.8).toFixed(1));
    }
  },
  "R-134a": {
    name: "R-134a",
    type: "HFC (Chillers / Med-Temp)",
    typicalEvapTD: 7,
    typicalCondTD: 15,
    getSatTempFromPsig: (psig: number) => {
      if (psig <= 0) return -30;
      const p = Math.max(1, psig);
      return Number((21.5 * Math.log(p) - 71.0).toFixed(1));
    },
    getSatPsigFromTemp: (tempC: number) => {
      return Number(Math.exp((tempC + 71.0) / 21.5).toFixed(1));
    }
  },
  "R-404A": {
    name: "R-404A",
    type: "HFC (Baja y Media Temperatura)",
    typicalEvapTD: 6,
    typicalCondTD: 12,
    getSatTempFromPsig: (psig: number) => {
      if (psig <= 0) return -45;
      const p = Math.max(1, psig);
      return Number((18.1 * Math.log(p) - 79.0).toFixed(1));
    },
    getSatPsigFromTemp: (tempC: number) => {
      return Number(Math.exp((tempC + 79.0) / 18.1).toFixed(1));
    }
  },
  "R-507": {
    name: "R-507",
    type: "HFC (Congelación / Cámaras)",
    typicalEvapTD: 6,
    typicalCondTD: 12,
    getSatTempFromPsig: (psig: number) => {
      if (psig <= 0) return -46;
      const p = Math.max(1, psig);
      return Number((17.9 * Math.log(p) - 79.2).toFixed(1));
    },
    getSatPsigFromTemp: (tempC: number) => {
      return Number(Math.exp((tempC + 79.2) / 17.9).toFixed(1));
    }
  },
  "R-407C": {
    name: "R-407C",
    type: "HFC (Reemplazo R-22)",
    typicalEvapTD: 8,
    typicalCondTD: 14,
    getSatTempFromPsig: (psig: number) => {
      if (psig <= 0) return -40;
      const p = Math.max(1, psig);
      return Number((19.2 * Math.log(p) - 79.0).toFixed(1));
    },
    getSatPsigFromTemp: (tempC: number) => {
      return Number(Math.exp((tempC + 79.0) / 19.2).toFixed(1));
    }
  },
  "R32": {
    name: "R32",
    type: "HFC (Alta Eficiencia)",
    typicalEvapTD: 8,
    typicalCondTD: 12,
    getSatTempFromPsig: (psig: number) => {
      if (psig <= 0) return -50;
      const p = Math.max(1, psig);
      return Number((16.8 * Math.log(p) - 77.2).toFixed(1));
    },
    getSatPsigFromTemp: (tempC: number) => {
      return Number(Math.exp((tempC + 77.2) / 16.8).toFixed(1));
    }
  },
  "R-290": {
    name: "R-290",
    type: "HC (Propano Natural)",
    typicalEvapTD: 7,
    typicalCondTD: 13,
    getSatTempFromPsig: (psig: number) => {
      if (psig <= 0) return -42;
      const p = Math.max(1, psig);
      return Number((20.1 * Math.log(p) - 80.8).toFixed(1));
    },
    getSatPsigFromTemp: (tempC: number) => {
      return Number(Math.exp((tempC + 80.8) / 20.1).toFixed(1));
    }
  }
};

export interface ThermodynamicInputs {
  refrigerant?: string;
  ambientTemp?: number | string | null;
  evaporatorOutletTemp?: number | string | null;
  roomTemp?: number | string | null;
  compressorDischargeTemp?: number | string | null;
  suctionPressure?: number | string | null;
  dischargePressure?: number | string | null;
  liquidLineTemp?: number | string | null;
}

export interface ThermodynamicCalculationResult {
  hasSufficientData: boolean;
  ambientTemp: number | null;
  evaporatorOutletTemp: number | null;
  roomTemp: number | null;
  compressorDischargeTemp: number | null;
  satEvapTemp: number | null;
  satCondTemp: number | null;
  superheat: number | null;
  superheatStatus: "Bajo" | "Óptimo" | "Alto" | "Indeterminado";
  superheatDiagnostic: string;
  subcooling: number | null;
  subcoolingStatus: "Bajo" | "Óptimo" | "Alto" | "Indeterminado";
  subcoolingDiagnostic: string;
  roomEvapDelta: number | null;
  roomEvapDeltaStatus: "Bajo" | "Óptimo" | "Alto" | "Indeterminado";
  compressorDelta: number | null;
  compressorDischargeStatus: "Normal" | "Elevado" | "Crítico" | "Indeterminado";
  summaryDiagnosis: string;
}

const parseNum = (val: any): number | null => {
  if (val === undefined || val === null || val === "") return null;
  const cleaned = String(val).replace(/,/g, ".").replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

export function calculateHVACThermodynamics(inputs: ThermodynamicInputs): ThermodynamicCalculationResult {
  const refKey = inputs.refrigerant && REFRIGERANTS_DATABASE[inputs.refrigerant]
    ? inputs.refrigerant
    : "R-410A";
  const refData = REFRIGERANTS_DATABASE[refKey] || REFRIGERANTS_DATABASE["R-410A"];

  const tAmb = parseNum(inputs.ambientTemp);
  const tEvapOut = parseNum(inputs.evaporatorOutletTemp);
  const tRoom = parseNum(inputs.roomTemp);
  const tCompDisch = parseNum(inputs.compressorDischargeTemp);
  const pSuction = parseNum(inputs.suctionPressure);
  const pDischarge = parseNum(inputs.dischargePressure);
  const tLiquid = parseNum(inputs.liquidLineTemp);

  let satEvap: number | null = null;
  if (pSuction !== null && pSuction > 0) {
    satEvap = refData.getSatTempFromPsig(pSuction);
  } else if (tRoom !== null) {
    satEvap = Number((tRoom - refData.typicalEvapTD).toFixed(1));
  } else if (tEvapOut !== null) {
    satEvap = Number((tEvapOut - 6.0).toFixed(1));
  }

  let satCond: number | null = null;
  if (pDischarge !== null && pDischarge > 0) {
    satCond = refData.getSatTempFromPsig(pDischarge);
  } else if (tAmb !== null) {
    satCond = Number((tAmb + refData.typicalCondTD).toFixed(1));
  } else if (tCompDisch !== null) {
    satCond = Number((tCompDisch - 30.0).toFixed(1));
  }

  let superheat: number | null = null;
  let superheatStatus: "Bajo" | "Óptimo" | "Alto" | "Indeterminado" = "Indeterminado";
  let superheatDiagnostic = "Ingrese temperatura de salida del evaporador y datos de recinto/presión.";

  if (tEvapOut !== null && satEvap !== null) {
    superheat = Number((tEvapOut - satEvap).toFixed(1));
    if (superheat < 3.5) {
      superheatStatus = "Bajo";
      superheatDiagnostic = "Sobrecalentamiento BAJO (< 4°C). Alto riesgo de retorno de líquido al compresor (TXV demasiado abierta o sobrealimentación).";
    } else if (superheat >= 3.5 && superheat <= 10.5) {
      superheatStatus = "Óptimo";
      superheatDiagnostic = `Sobrecalentamiento ÓPTIMO (${superheat}°C). Llenado eficiente del serpentín evaporador y retorno de gas 100% seguro.`;
    } else {
      superheatStatus = "Alto";
      superheatDiagnostic = `Sobrecalentamiento ELEVADO (${superheat}°C). Evaporador subalimentado (posible falta de refrigerante, filtro obstruido o TXV cerrada).`;
    }
  }

  let subcooling: number | null = null;
  let subcoolingStatus: "Bajo" | "Óptimo" | "Alto" | "Indeterminado" = "Indeterminado";
  let subcoolingDiagnostic = "Ingrese temperatura ambiente o línea de líquido y descarga del compresor.";

  const effectiveLiquidTemp = tLiquid !== null
    ? tLiquid
    : (tAmb !== null ? Number((tAmb + 4.0).toFixed(1)) : null);

  if (satCond !== null && effectiveLiquidTemp !== null) {
    subcooling = Number((satCond - effectiveLiquidTemp).toFixed(1));
    if (subcooling < 2.5) {
      subcoolingStatus = "Bajo";
      subcoolingDiagnostic = "Subenfriamiento BAJO (< 3°C). Falta de refrigerante en condensador o formación de burbujas en línea de líquido.";
    } else if (subcooling >= 2.5 && subcooling <= 8.5) {
      subcoolingStatus = "Óptimo";
      subcoolingDiagnostic = `Subenfriamiento ÓPTIMO (${subcooling}°C). Columna de líquido 100% condensada alimentando el elemento de expansión.`;
    } else {
      subcoolingStatus = "Alto";
      subcoolingDiagnostic = `Subenfriamiento ALTO (${subcooling}°C). Posible sobrecarga de refrigerante o condensador exterior sucio/obstruido.`;
    }
  }

  let roomEvapDelta: number | null = null;
  let roomEvapDeltaStatus: "Bajo" | "Óptimo" | "Alto" | "Indeterminado" = "Indeterminado";
  if (tRoom !== null && tEvapOut !== null) {
    roomEvapDelta = Number((tRoom - tEvapOut).toFixed(1));
    if (roomEvapDelta < 4.0) {
      roomEvapDeltaStatus = "Bajo";
    } else if (roomEvapDelta <= 14.0) {
      roomEvapDeltaStatus = "Óptimo";
    } else {
      roomEvapDeltaStatus = "Alto";
    }
  }

  let compressorDelta: number | null = null;
  let compressorDischargeStatus: "Normal" | "Elevado" | "Crítico" | "Indeterminado" = "Indeterminado";
  if (tCompDisch !== null) {
    if (tEvapOut !== null) {
      compressorDelta = Number((tCompDisch - tEvapOut).toFixed(1));
    }
    if (tCompDisch < 60) {
      compressorDischargeStatus = "Normal";
    } else if (tCompDisch <= 95) {
      compressorDischargeStatus = "Normal";
    } else if (tCompDisch <= 105) {
      compressorDischargeStatus = "Elevado";
    } else {
      compressorDischargeStatus = "Crítico";
    }
  }

  const hasSufficientData = (tAmb !== null || tEvapOut !== null || tRoom !== null || tCompDisch !== null);

  let summaryDiagnosis = "Parámetros frigoríficos estables.";
  if (superheatStatus === "Bajo") {
    summaryDiagnosis = "Alerta: Sobrecalentamiento bajo con riesgo de golpe de líquido en compresor. Ajustar recalentamiento.";
  } else if (superheatStatus === "Alto" && subcoolingStatus === "Bajo") {
    summaryDiagnosis = "Diagnóstico: Síntoma claro de falta de refrigerante en el circuito (SH alto + SC bajo). Revisar estanqueidad.";
  } else if (superheatStatus === "Alto" && subcoolingStatus === "Alto") {
    summaryDiagnosis = "Diagnóstico: Obstrucción en línea de líquido o válvula de expansión descalibrada/cerrada.";
  } else if (superheatStatus === "Óptimo" && subcoolingStatus === "Óptimo") {
    summaryDiagnosis = "Excelente: Ciclo frigorífico en balance termodinámico óptimo (Superheat y Subcooling en rango ideal).";
  } else if (compressorDischargeStatus === "Crítico") {
    summaryDiagnosis = "Alerta crítica: Temperatura de salida del compresor excesiva (> 105°C). Peligro de degradación de aceite.";
  }

  return {
    hasSufficientData,
    ambientTemp: tAmb,
    evaporatorOutletTemp: tEvapOut,
    roomTemp: tRoom,
    compressorDischargeTemp: tCompDisch,
    satEvapTemp: satEvap,
    satCondTemp: satCond,
    superheat,
    superheatStatus,
    superheatDiagnostic,
    subcooling,
    subcoolingStatus,
    subcoolingDiagnostic,
    roomEvapDelta,
    roomEvapDeltaStatus,
    compressorDelta,
    compressorDischargeStatus,
    summaryDiagnosis
  };
}

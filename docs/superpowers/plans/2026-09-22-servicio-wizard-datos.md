# Servicio — Datos y Wizard Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portar la capa de datos del módulo Servicio (tipos, fórmulas termodinámicas HVAC, reglas de seguridad, repositorio de visitas) y los primeros 6 de los 9 pasos del wizard de servicio de fsapp a fs_movil, saneando en el camino los hallazgos de seguridad y de fabricación de datos que el spec de diseño identificó en el código original.

**Architecture:** Módulo por feature (`src/features/service/`) sobre Expo Router, con un store de Zustand (`useServiceWizardStore`) como fuente de verdad del borrador del wizard (persistido en AsyncStorage), y Firestore (`onSnapshot`) como fuente de verdad de las visitas ya guardadas. Los pasos 1, 2, 3, 5 y 6 del wizard (Datos de Visita, Datos del Cliente, Datos del Equipo, Diagnóstico y Observaciones, Parámetros Técnicos) y el paso 4 (Evidencias Fotográficas, con captura local únicamente) quedan completamente funcionales. Los pasos 7 (Concepto de IA), 8 (Firmas de Conformidad) y 9 (Vista Previa PDF) quedan como pantallas "próximamente" explícitas, porque dependen de piezas que este plan no construye: el Worker de Cloudflare para IA, una librería de firma por canvas, `expo-print`, y la subida de fotos a Cloudinary. Esas piezas, junto con el guardado final de la visita (`status: "Completado"`) y el auto-registro/actualización de `HVACAsset`, se completan en un plan de seguimiento ("Servicio — Cierre y Multimedia").

**Tech Stack:** Expo Router, NativeWind, Zustand (`persist` + `@react-native-async-storage/async-storage`), Firebase JS SDK (Firestore), `expo-location`, `expo-image-picker`, Jest (`jest-expo` preset para componentes, proyecto Node aparte para reglas de Firestore con el emulador — convención ya establecida en el plan de Fundación).

**Spec:** `docs/superpowers/specs/2026-09-21-fs-app-mobile-port-design.md` (Secciones 6 y 8)

## Fuera de alcance de este plan

Explícitamente diferido al plan de seguimiento "Servicio — Cierre y Multimedia":
- Subida de fotos a Cloudinary (este plan guarda solo el URI local del dispositivo).
- Escaneo de QR para prellenar cliente/equipo (paso 3 queda de entrada manual únicamente).
- Firma digital por canvas (paso 8).
- Generación de concepto de IA contra el Worker de Cloudflare (paso 7).
- Generación de PDF con `expo-print` y guardado final de la visita (`saveVisit` con `status: "Completado"`) (paso 9).
- Auto-creación/actualización de `HVACAsset` al completar una visita, y el módulo Historial completo (ficha clínica, dashboard de activos) — se construye en el plan del módulo Historial.

## Hallazgos de fsapp saneados en este plan

- **GPS falso de respaldo**: `App.tsx` genera coordenadas de Santiago de Chile hardcodeadas (`{ latitude: -33.45694, longitude: -70.64827 }`) cuando el usuario niega el permiso de ubicación o el navegador no soporta geolocalización — literalmente comentado en el código como `// Fake realistic GPS coords as fallback`. Este plan captura GPS real con `expo-location` y, si falla o se deniega el permiso, deja `gps: null` con un mensaje de error real — nunca coordenadas inventadas.
- **Consecutivo con offset decorativo**: fsapp genera el consecutivo como `` `FS-2026-00${visits.length + 42}` `` — el `+42` es un offset arbitrario para que la demo "se vea" con historial. Este plan genera `FS-{año actual}-{secuencia real + 1}`, sin el offset falso, y usa el año actual en vez de `2026` hardcodeado.
- **Doble escritura sin reglas de seguridad**: fsapp escribe cada visita en `users/{uid}/visits/{id}` Y en `visits/{id}` (top-level), sin que ninguna regla de Firestore lo proteja (`allow read, write: if true` global). Este plan usa una única colección `visits/{visitId}` con campo `ownerId` obligatorio, y reglas reales que exigen `request.auth.uid == resource.data.ownerId`.

## Global Constraints

- Expo managed workflow — sin eject a bare React Native.
- NativeWind para todo el styling.
- Zustand para el borrador del wizard; Firestore (`onSnapshot`) es la fuente de verdad para visitas ya guardadas.
- El proyecto Firebase se mantiene en el plan Spark (gratuito) — sin Firebase Storage. Las fotos de este plan se guardan como URI local del dispositivo únicamente (la subida a Cloudinary es del plan de seguimiento).
- Ninguna colección de Firestore se usa desde la app sin reglas de seguridad reales que exijan `request.auth.uid` — nunca `allow read, write: if true`.
- El campo que identifica al dueño de un documento es siempre `ownerId` (= `request.auth.uid`), nunca `ownerEmail` ni un slug de email.
- `hvacCalculations.ts` se porta **byte-for-byte** desde fsapp — es el motor de física de refrigerantes; ningún coeficiente, fórmula o umbral se modifica en el port.
- Las validaciones de `nextStep()` del wizard (qué pasos bloquean "Siguiente" y por qué) se portan exactamente de la lógica de fsapp — ningún paso gana ni pierde una regla de validación en este port.
- Nunca se fabrican datos ni respuestas simuladas (coordenadas GPS falsas, IA falsa, etc.) — un paso que no está implementado todavía muestra "próximamente" honestamente, nunca un comportamiento que aparente funcionar sin funcionar de verdad.
- Tests de componentes RN viven bajo `src/**/__tests__/` (preset `jest-expo`); tests que hablan con el emulador de Firestore viven bajo `tests/` (proyecto Node de Jest) — convención establecida en el plan de Fundación.

---

### Task 1: Tipos compartidos de Visita

**Files:**
- Create: `src/shared/types/service.ts`
- Test: `src/shared/types/__tests__/service.test.ts`

**Interfaces:**
- Produces: `type ServiceStatus`, `type PhotoCategory`, `interface EvidencePhoto`, `interface CustomerData`, `interface EquipmentData`, `interface ServiceSignatures`, `interface TechnicalParameters`, `interface Visit`, `function createEmptyCustomerData(): CustomerData`, `function createEmptyEquipmentData(): EquipmentData`, `function createEmptyTechnicalParameters(): TechnicalParameters` — usados por todas las tareas siguientes de este plan.

- [ ] **Step 1: Escribir los tipos, sanitizados respecto a fsapp**

Respecto al `types.ts` de fsapp: se elimina el campo `id`/`ownerEmail` duplicado (se reemplaza por `ownerId`), se eliminan los alias legacy `customerData`/`equipmentData` (duplicados de `customer`/`equipment`), y se eliminan `comments`, `reminders`, `priority`, `improvedObservations` y `synced` (no forman parte de ningún módulo en alcance de este spec; el estado de sincronización real se deriva de metadata de Firestore, no de un campo manual, por §9 del spec de diseño):

```ts
// src/shared/types/service.ts
export type ServiceStatus = "Programado" | "En Proceso" | "Completado" | "Pendiente de Repuesto";

export type PhotoCategory = "Antes" | "Durante" | "Después" | "Placa" | "Daño" | "Repuesto";

export interface EvidencePhoto {
  id: string;
  url: string;
  category: PhotoCategory;
  comment: string;
}

export interface CustomerData {
  company: string;
  address: string;
  city: string;
  contactPerson: string;
  phone: string;
  email: string;
  nit: string;
}

export interface EquipmentData {
  type: string;
  brand: string;
  model: string;
  serial: string;
  location: string;
  refrigerant: string;
  capacity: string;
}

export interface ServiceSignatures {
  technicianName: string;
  technicianSignature: string;
  customerName: string;
  customerRole: string;
  customerSignature: string;
  date: string;
}

export interface TechnicalParameters {
  voltageBefore: string;
  voltageAfter: string;
  currentBefore: string;
  currentAfter: string;
  powerBefore: string;
  powerAfter: string;
  dryerFilterBefore: string;
  dryerFilterAfter: string;
  valveChange: string;
  valveChangeDetails: string;
  ambientTempBefore?: string;
  ambientTempAfter?: string;
  evaporatorOutletTempBefore?: string;
  evaporatorOutletTempAfter?: string;
  roomTempBefore?: string;
  roomTempAfter?: string;
  compressorDischargeTempBefore?: string;
  compressorDischargeTempAfter?: string;
  suctionPressureBefore?: string;
  suctionPressureAfter?: string;
  dischargePressureBefore?: string;
  dischargePressureAfter?: string;
  liquidLineTempBefore?: string;
  liquidLineTempAfter?: string;
  superheatBefore?: string;
  superheatAfter?: string;
  subcoolingBefore?: string;
  subcoolingAfter?: string;
  roomEvapDeltaBefore?: string;
  roomEvapDeltaAfter?: string;
  thermodynamicDiagnosis?: string;
}

export interface Visit {
  id: string;
  ownerId: string;
  consecutivo: string;
  date: string;
  startTime: string;
  endTime: string;
  gps: { latitude: number; longitude: number; accuracy?: number } | null;
  technicianName: string;
  status: ServiceStatus;
  customer: CustomerData;
  equipment: EquipmentData;
  photos: EvidencePhoto[];
  observations: string;
  technicalParams: TechnicalParameters;
  aiConcept: string;
  includeAiConcept: boolean;
  signatures: ServiceSignatures | null;
  nextSteps: string;
  createdAt: string;
}

export function createEmptyCustomerData(): CustomerData {
  return { company: "", address: "", city: "", contactPerson: "", phone: "", email: "", nit: "" };
}

export function createEmptyEquipmentData(): EquipmentData {
  return { type: "", brand: "", model: "", serial: "", location: "", refrigerant: "R-410A", capacity: "" };
}

export function createEmptyTechnicalParameters(): TechnicalParameters {
  return {
    voltageBefore: "",
    voltageAfter: "",
    currentBefore: "",
    currentAfter: "",
    powerBefore: "",
    powerAfter: "",
    dryerFilterBefore: "Bueno",
    dryerFilterAfter: "Bueno",
    valveChange: "No",
    valveChangeDetails: "",
  };
}
```

- [ ] **Step 2: Escribir la prueba**

```ts
// src/shared/types/__tests__/service.test.ts
import { createEmptyCustomerData, createEmptyEquipmentData, createEmptyTechnicalParameters } from "../service";

test("creates empty customer data with all fields blank", () => {
  expect(createEmptyCustomerData()).toEqual({
    company: "", address: "", city: "", contactPerson: "", phone: "", email: "", nit: "",
  });
});

test("creates empty equipment data defaulting refrigerant to R-410A", () => {
  expect(createEmptyEquipmentData()).toEqual({
    type: "", brand: "", model: "", serial: "", location: "", refrigerant: "R-410A", capacity: "",
  });
});

test("creates empty technical parameters with sensible defaults", () => {
  const params = createEmptyTechnicalParameters();
  expect(params.dryerFilterBefore).toBe("Bueno");
  expect(params.dryerFilterAfter).toBe("Bueno");
  expect(params.valveChange).toBe("No");
  expect(params.voltageBefore).toBe("");
});
```

- [ ] **Step 3: Correr los tests**

Run: `npm test -- service.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 4: Commit**

```bash
git add src/shared/types/service.ts src/shared/types/__tests__/service.test.ts
git commit -m "feat: add shared Visit types for the Servicio module"
```

---

### Task 2: Motor de cálculos termodinámicos HVAC

**Files:**
- Create: `src/shared/utils/hvacCalculations.ts`
- Test: `src/shared/utils/__tests__/hvacCalculations.test.ts`

**Interfaces:**
- Produces: `interface RefrigerantPTData`, `const REFRIGERANTS_DATABASE: Record<string, RefrigerantPTData>`, `interface ThermodynamicInputs`, `interface ThermodynamicCalculationResult`, `function calculateHVACThermodynamics(inputs: ThermodynamicInputs): ThermodynamicCalculationResult` — usados por el paso 3 (selector de refrigerante) y el paso 6 (parámetros técnicos) de este mismo plan.

- [ ] **Step 1: Copiar el archivo completo, sin modificaciones**

Este es un port byte-for-byte del archivo real de fsapp (`fsapp/src/utils/hvacCalculations.ts`) — es lógica pura de TypeScript sin dependencias de DOM, corre igual en React Native:

```ts
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
```

- [ ] **Step 2: Escribir las pruebas contra valores reales, calculados a mano a partir de las mismas fórmulas**

```ts
// src/shared/utils/__tests__/hvacCalculations.test.ts
import { calculateHVACThermodynamics, REFRIGERANTS_DATABASE } from "../hvacCalculations";

test("R-410A saturation curve round-trips within rounding tolerance", () => {
  const temp = REFRIGERANTS_DATABASE["R-410A"].getSatTempFromPsig(118);
  expect(temp).toBeCloseTo(3.6, 1);
  const psig = REFRIGERANTS_DATABASE["R-410A"].getSatPsigFromTemp(temp);
  expect(psig).toBeCloseTo(118, 0);
});

test("classifies superheat as Óptimo within the ideal band", () => {
  const result = calculateHVACThermodynamics({
    refrigerant: "R-410A",
    suctionPressure: 118,
    evaporatorOutletTemp: 10,
  });
  expect(result.superheat).toBeCloseTo(6.4, 1);
  expect(result.superheatStatus).toBe("Óptimo");
});

test("classifies superheat as Bajo when below the ideal band", () => {
  const result = calculateHVACThermodynamics({
    refrigerant: "R-410A",
    suctionPressure: 118,
    evaporatorOutletTemp: 5,
  });
  expect(result.superheat).toBeCloseTo(1.4, 1);
  expect(result.superheatStatus).toBe("Bajo");
});

test("classifies subcooling as Óptimo within the ideal band", () => {
  const result = calculateHVACThermodynamics({
    refrigerant: "R-410A",
    dischargePressure: 340,
    liquidLineTemp: 15,
  });
  expect(result.subcooling).toBeCloseTo(6.8, 1);
  expect(result.subcoolingStatus).toBe("Óptimo");
});

test("flags compressor discharge temperature as Elevado between 95 and 105 C", () => {
  const result = calculateHVACThermodynamics({ compressorDischargeTemp: 100 });
  expect(result.compressorDischargeStatus).toBe("Elevado");
});

test("flags compressor discharge temperature as Crítico above 105 C", () => {
  const result = calculateHVACThermodynamics({ compressorDischargeTemp: 110 });
  expect(result.compressorDischargeStatus).toBe("Crítico");
});

test("diagnoses a likely refrigerant shortage when superheat is high and subcooling is low", () => {
  const result = calculateHVACThermodynamics({
    refrigerant: "R-410A",
    roomTemp: 20,
    evaporatorOutletTemp: 25,
    ambientTemp: 30,
    liquidLineTemp: 40,
  });
  expect(result.superheatStatus).toBe("Alto");
  expect(result.subcoolingStatus).toBe("Bajo");
  expect(result.summaryDiagnosis).toContain("falta de refrigerante");
});

test("falls back to the R-410A curve for an unrecognized refrigerant", () => {
  const known = calculateHVACThermodynamics({ refrigerant: "R-410A", suctionPressure: 118, evaporatorOutletTemp: 10 });
  const unknown = calculateHVACThermodynamics({ refrigerant: "R-999", suctionPressure: 118, evaporatorOutletTemp: 10 });
  expect(unknown.satEvapTemp).toBe(known.satEvapTemp);
});

test("parses comma-decimal string inputs for temperatures", () => {
  const result = calculateHVACThermodynamics({ refrigerant: "R-410A", roomTemp: "20,5", evaporatorOutletTemp: "10" });
  expect(result.roomTemp).toBeCloseTo(20.5, 1);
});

test("reports insufficient data when no readings are provided", () => {
  const result = calculateHVACThermodynamics({});
  expect(result.hasSufficientData).toBe(false);
  expect(result.superheatStatus).toBe("Indeterminado");
});
```

- [ ] **Step 3: Correr los tests**

Run: `npm test -- hvacCalculations.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 4: Commit**

```bash
git add src/shared/utils/hvacCalculations.ts src/shared/utils/__tests__/hvacCalculations.test.ts
git commit -m "feat: port HVAC thermodynamics calculation engine byte-for-byte from fsapp"
```

---

### Task 3: Reglas de seguridad para `visits/{visitId}`

**Files:**
- Modify: `firestore.rules`
- Test: `tests/rules/visits.rules.test.ts`

**Interfaces:**
- Consumes: ninguno de tareas anteriores.
- Produces: reglas que exigen `ownerId == request.auth.uid` para leer/crear/actualizar/borrar una visita — la Tarea 4 (repositorio) y toda tarea futura que use la colección `visits` dependen de estas reglas ya estando activas.

- [ ] **Step 1: Extender `firestore.rules` con la colección `visits`**

Reglas separadas por operación: `create` valida contra `request.resource.data.ownerId` (el documento aún no existe, así que `resource.data` no está disponible), `read`/`delete` contra `resource.data.ownerId` (el documento ya existe), y `update` contra ambos a la vez — esto último impide que un usuario cambie el `ownerId` de una visita que ya le pertenece:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /visits/{visitId} {
      allow read, delete: if request.auth != null && request.auth.uid == resource.data.ownerId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.ownerId;
      allow update: if request.auth != null
        && request.auth.uid == resource.data.ownerId
        && request.auth.uid == request.resource.data.ownerId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 2: Escribir la prueba de reglas**

```ts
// tests/rules/visits.rules.test.ts
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import fs from "fs";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "fs-movil-test-visits-rules",
    firestore: { rules: fs.readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

test("a user can create and read their own visit", async () => {
  const aliceDb = testEnv.authenticatedContext("alice").firestore();
  await assertSucceeds(setDoc(doc(aliceDb, "visits/visit-1"), { ownerId: "alice", consecutivo: "FS-2026-0001" }));
  await assertSucceeds(getDoc(doc(aliceDb, "visits/visit-1")));
});

test("a user cannot create a visit tagged with someone else's ownerId", async () => {
  const aliceDb = testEnv.authenticatedContext("alice").firestore();
  await assertFails(setDoc(doc(aliceDb, "visits/visit-1"), { ownerId: "bob", consecutivo: "FS-2026-0001" }));
});

test("another user cannot read someone else's visit", async () => {
  const aliceDb = testEnv.authenticatedContext("alice").firestore();
  const bobDb = testEnv.authenticatedContext("bob").firestore();
  await assertSucceeds(setDoc(doc(aliceDb, "visits/visit-1"), { ownerId: "alice", consecutivo: "FS-2026-0001" }));
  await assertFails(getDoc(doc(bobDb, "visits/visit-1")));
});

test("an unauthenticated request is denied", async () => {
  const anonDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anonDb, "visits/visit-1")));
});

test("a user cannot change the ownerId of their own visit on update", async () => {
  const aliceDb = testEnv.authenticatedContext("alice").firestore();
  await assertSucceeds(setDoc(doc(aliceDb, "visits/visit-1"), { ownerId: "alice", consecutivo: "FS-2026-0001" }));
  await assertFails(updateDoc(doc(aliceDb, "visits/visit-1"), { ownerId: "bob" }));
});
```

- [ ] **Step 3: Correr las pruebas contra el emulador**

Run: `npx firebase-tools emulators:exec --only firestore "npx jest tests/rules/visits.rules.test.ts"`
Expected: 5 tests, PASS (requiere Java 21+ para el emulador — si no está disponible en esta máquina, documentar el gap igual que se hizo en la Tarea 5 del plan de Fundación, y confirmar al menos que `npx jest tests/rules/visits.rules.test.ts` sin emulador falla con un error de **conexión**, no de sintaxis/imports)

- [ ] **Step 4: Commit**

```bash
git add firestore.rules tests/rules/visits.rules.test.ts
git commit -m "feat: add real Firestore security rules for the visits collection"
```

---

### Task 4: Repositorio de visitas

**Files:**
- Create: `src/features/service/visitsRepository.ts`
- Test: `src/features/service/__tests__/visitsRepository.test.ts`

**Interfaces:**
- Consumes: `db` de `src/shared/lib/firebase.ts`, `type Visit` de `src/shared/types/service.ts`.
- Produces: `function saveVisit(visit: Visit): Promise<void>`, `function subscribeVisits(ownerId: string, callback: (visits: Visit[]) => void): Unsubscribe` — usados por la Tarea 6 (dashboard) de este plan y por el plan de seguimiento (guardado final).

- [ ] **Step 1: Escribir `visitsRepository.ts`**

Colección única `visits/{visitId}` con `ownerId`, sin el patrón de doble escritura de fsapp — sigue el mismo estilo que `src/features/profile/profileRepository.ts` ya establecido en el proyecto:

```ts
// src/features/service/visitsRepository.ts
import { collection, doc, onSnapshot, query, setDoc, where, type Unsubscribe } from "firebase/firestore";
import { db } from "../../shared/lib/firebase";
import type { Visit } from "../../shared/types/service";

export function saveVisit(visit: Visit): Promise<void> {
  return setDoc(doc(db, "visits", visit.id), visit);
}

export function subscribeVisits(ownerId: string, callback: (visits: Visit[]) => void): Unsubscribe {
  const visitsQuery = query(collection(db, "visits"), where("ownerId", "==", ownerId));
  return onSnapshot(visitsQuery, (snapshot) => {
    callback(snapshot.docs.map((docSnapshot) => docSnapshot.data() as Visit));
  });
}
```

- [ ] **Step 2: Escribir las pruebas (mockeando el SDK de Firestore)**

```ts
// src/features/service/__tests__/visitsRepository.test.ts
jest.mock("../../../shared/lib/firebase", () => ({ db: { mocked: "db" } }));

const mockUnsubscribe = jest.fn();
jest.mock("firebase/firestore", () => ({
  collection: jest.fn((_db, path) => ({ path })),
  doc: jest.fn((_db, path, id) => ({ path: `${path}/${id}` })),
  onSnapshot: jest.fn((_query, callback) => {
    callback({ docs: [{ data: () => ({ id: "visit-1", ownerId: "uid-1" }) }] });
    return mockUnsubscribe;
  }),
  query: jest.fn((collectionRef, whereClause) => ({ collectionRef, whereClause })),
  setDoc: jest.fn(),
  where: jest.fn((field, op, value) => ({ field, op, value })),
}));

import { doc, setDoc, where } from "firebase/firestore";
import { saveVisit, subscribeVisits } from "../visitsRepository";
import type { Visit } from "../../../shared/types/service";

const sampleVisit = { id: "visit-1", ownerId: "uid-1", consecutivo: "FS-2026-0001" } as Visit;

test("saveVisit writes the visit document by id", async () => {
  await saveVisit(sampleVisit);
  expect(doc).toHaveBeenCalledWith({ mocked: "db" }, "visits", "visit-1");
  expect(setDoc).toHaveBeenCalledWith({ path: "visits/visit-1" }, sampleVisit);
});

test("subscribeVisits queries by ownerId and forwards results", () => {
  const callback = jest.fn();
  const unsubscribe = subscribeVisits("uid-1", callback);
  expect(where).toHaveBeenCalledWith("ownerId", "==", "uid-1");
  expect(callback).toHaveBeenCalledWith([{ id: "visit-1", ownerId: "uid-1" }]);
  expect(unsubscribe).toBe(mockUnsubscribe);
});
```

- [ ] **Step 3: Correr los tests**

Run: `npm test -- visitsRepository.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 4: Commit**

```bash
git add src/features/service/visitsRepository.ts src/features/service/__tests__/visitsRepository.test.ts
git commit -m "feat: add sanitized single-collection visits repository"
```

---

### Task 5: Store de Zustand del wizard

**Files:**
- Create: `src/features/service/useServiceWizardStore.ts`
- Test: `src/features/service/__tests__/useServiceWizardStore.test.ts`

**Interfaces:**
- Consumes: `createEmptyCustomerData`, `createEmptyEquipmentData`, `createEmptyTechnicalParameters`, tipos de `src/shared/types/service.ts` (Tarea 1).
- Produces: hook `useServiceWizardStore()` con el estado `{ isActive, currentStep, draft, validationError }` y las acciones `startNewVisit(existingVisitsCount)`, `updateCustomer(patch)`, `updateEquipment(patch)`, `updateTechnicalParams(patch)`, `setGps(gps)`, `setDateTime(patch)`, `setObservations(text)`, `addPhoto(photo)`, `removePhoto(photoId)`, `nextStep(): boolean`, `prevStep()`, `resetDraft()`; constante `WIZARD_STEP_COUNT`; función `generateConsecutivo(existingVisitsCount, now?)`. Usado por todas las pantallas de wizard de las Tareas 6-12.

- [ ] **Step 1: Instalar Zustand persist ya está disponible — instalar la dependencia de AsyncStorage si falta**

`@react-native-async-storage/async-storage` ya está instalado desde el plan de Fundación (Tarea 4) — no requiere instalación nueva. `zustand` también ya está instalado (Tarea 8 de Fundación).

- [ ] **Step 2: Escribir el store**

El `generateConsecutivo` corrige el offset decorativo `+42` de fsapp — usa la cantidad real de visitas existentes más uno, y el año actual en vez de `"2026"` hardcodeado. La validación de `nextStep()` porta exactamente la lógica de `App.tsx` de fsapp: los pasos 1, 2, 3, 5 y 8 bloquean si falta algo; el paso 4 solo advierte (nunca bloquea, coincide con el comportamiento real de fsapp donde la validación de fotos es puramente informativa); los pasos 6, 7 y 9 no tienen validación:

```ts
// src/features/service/useServiceWizardStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createEmptyCustomerData,
  createEmptyEquipmentData,
  createEmptyTechnicalParameters,
  type CustomerData,
  type EquipmentData,
  type EvidencePhoto,
  type ServiceSignatures,
  type TechnicalParameters,
} from "../../shared/types/service";

export const WIZARD_STEP_COUNT = 9;

export function generateConsecutivo(existingVisitsCount: number, now: Date = new Date()): string {
  const sequence = String(existingVisitsCount + 1).padStart(4, "0");
  return `FS-${now.getFullYear()}-${sequence}`;
}

interface ServiceVisitDraft {
  consecutivo: string;
  date: string;
  startTime: string;
  endTime: string;
  gps: { latitude: number; longitude: number; accuracy?: number } | null;
  customer: CustomerData;
  equipment: EquipmentData;
  photos: EvidencePhoto[];
  observations: string;
  technicalParams: TechnicalParameters;
  aiConcept: string;
  includeAiConcept: boolean;
  signatures: ServiceSignatures | null;
  nextSteps: string;
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createEmptyDraft(consecutivo: string, now: Date = new Date()): ServiceVisitDraft {
  const date = toLocalDateString(now);
  const startTime = now.toTimeString().slice(0, 5);
  const endTime = new Date(now.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5);
  return {
    consecutivo,
    date,
    startTime,
    endTime,
    gps: null,
    customer: createEmptyCustomerData(),
    equipment: createEmptyEquipmentData(),
    photos: [],
    observations: "",
    technicalParams: createEmptyTechnicalParameters(),
    aiConcept: "",
    includeAiConcept: false,
    signatures: null,
    nextSteps: "",
  };
}

const MANDATORY_PHOTO_KEYS = [
  "manometro_baja",
  "manometro_alta",
  "etiqueta_equipo",
  "evaporador_antes",
  "evaporador_despues",
  "condensadora_antes",
  "condensadora_despues",
];

interface ServiceWizardState {
  isActive: boolean;
  currentStep: number;
  draft: ServiceVisitDraft;
  validationError: string | null;
  startNewVisit: (existingVisitsCount: number) => void;
  updateCustomer: (patch: Partial<CustomerData>) => void;
  updateEquipment: (patch: Partial<EquipmentData>) => void;
  updateTechnicalParams: (patch: Partial<TechnicalParameters>) => void;
  setGps: (gps: ServiceVisitDraft["gps"]) => void;
  setDateTime: (patch: Partial<Pick<ServiceVisitDraft, "date" | "startTime" | "endTime">>) => void;
  setObservations: (observations: string) => void;
  addPhoto: (photo: EvidencePhoto) => void;
  removePhoto: (photoId: string) => void;
  nextStep: () => boolean;
  prevStep: () => void;
  resetDraft: () => void;
}

export const useServiceWizardStore = create<ServiceWizardState>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentStep: 1,
      draft: createEmptyDraft(""),
      validationError: null,

      startNewVisit: (existingVisitsCount) => {
        set({
          isActive: true,
          currentStep: 1,
          draft: createEmptyDraft(generateConsecutivo(existingVisitsCount)),
          validationError: null,
        });
      },

      updateCustomer: (patch) =>
        set((state) => ({ draft: { ...state.draft, customer: { ...state.draft.customer, ...patch } } })),
      updateEquipment: (patch) =>
        set((state) => ({ draft: { ...state.draft, equipment: { ...state.draft.equipment, ...patch } } })),
      updateTechnicalParams: (patch) =>
        set((state) => ({ draft: { ...state.draft, technicalParams: { ...state.draft.technicalParams, ...patch } } })),
      setGps: (gps) => set((state) => ({ draft: { ...state.draft, gps } })),
      setDateTime: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
      setObservations: (observations) => set((state) => ({ draft: { ...state.draft, observations } })),
      addPhoto: (photo) =>
        set((state) => ({
          draft: { ...state.draft, photos: [...state.draft.photos.filter((p) => p.id !== photo.id), photo] },
        })),
      removePhoto: (photoId) =>
        set((state) => ({ draft: { ...state.draft, photos: state.draft.photos.filter((p) => p.id !== photoId) } })),

      nextStep: () => {
        const { currentStep, draft } = get();
        let error: string | null = null;

        if (currentStep === 1) {
          if (!draft.consecutivo) error = "El consecutivo es obligatorio.";
        } else if (currentStep === 2) {
          if (!draft.customer.company || !draft.customer.contactPerson) {
            error = "Ingrese la empresa y la persona de contacto.";
          }
        } else if (currentStep === 3) {
          if (!draft.equipment.type || !draft.equipment.brand) {
            error = "Ingrese o seleccione el tipo de equipo y la marca.";
          }
        } else if (currentStep === 4) {
          const missing = MANDATORY_PHOTO_KEYS.filter(
            (key) => !draft.photos.some((p) => p.id === `photo-${key}`)
          );
          if (missing.length > 0) {
            error = `Nota: faltan ${missing.length} fotos sugeridas, pero puede continuar.`;
          }
        } else if (currentStep === 5) {
          if (!draft.observations.trim()) error = "Escriba sus observaciones técnicas sobre el mantenimiento.";
        } else if (currentStep === 8) {
          if (!draft.signatures?.customerSignature || !draft.signatures?.technicianSignature) {
            error = "Falta firmar para continuar.";
          }
        }

        set({ validationError: error });

        const isBlocking = error !== null && currentStep !== 4;
        if (isBlocking) return false;

        set((state) => ({ currentStep: Math.min(WIZARD_STEP_COUNT, state.currentStep + 1) }));
        return true;
      },

      prevStep: () => set((state) => ({ currentStep: Math.max(1, state.currentStep - 1), validationError: null })),

      resetDraft: () => set({ isActive: false, currentStep: 1, draft: createEmptyDraft(""), validationError: null }),
    }),
    {
      name: "fs-movil-service-wizard-draft",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

- [ ] **Step 3: Escribir las pruebas**

Cada test que muta el `currentStep`/`draft` sin pasar por `startNewVisit` usa la forma funcional de `setState` para no pisar el resto del borrador — mismo patrón que `useAuthStore.setState(...)` ya usado en la Tarea 8 del plan de Fundación. `beforeEach` llama `resetDraft()` para evitar fugas de estado entre tests (incluyendo cualquier hidratación tardía de `persist` desde el mock de AsyncStorage):

```ts
// src/features/service/__tests__/useServiceWizardStore.test.ts
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import { useServiceWizardStore, generateConsecutivo, WIZARD_STEP_COUNT } from "../useServiceWizardStore";

beforeEach(() => {
  useServiceWizardStore.getState().resetDraft();
});

test("generateConsecutivo pads the sequence and uses the given year", () => {
  expect(generateConsecutivo(4, new Date(2026, 0, 1))).toBe("FS-2026-0005");
});

test("startNewVisit seeds a draft with an auto-generated consecutivo and no GPS", () => {
  useServiceWizardStore.getState().startNewVisit(9);
  const { draft, currentStep, isActive } = useServiceWizardStore.getState();
  expect(isActive).toBe(true);
  expect(currentStep).toBe(1);
  expect(draft.consecutivo).toMatch(/^FS-\d{4}-0010$/);
  expect(draft.gps).toBeNull();
  expect(draft.equipment.refrigerant).toBe("R-410A");
});

test("nextStep blocks on step 1 without a consecutivo", () => {
  useServiceWizardStore.setState((state) => ({ draft: { ...state.draft, consecutivo: "" }, currentStep: 1 }));
  const advanced = useServiceWizardStore.getState().nextStep();
  expect(advanced).toBe(false);
  expect(useServiceWizardStore.getState().currentStep).toBe(1);
  expect(useServiceWizardStore.getState().validationError).toBeTruthy();
});

test("nextStep blocks on step 2 without company and contact person", () => {
  useServiceWizardStore.getState().startNewVisit(0);
  useServiceWizardStore.setState({ currentStep: 2 });
  expect(useServiceWizardStore.getState().nextStep()).toBe(false);
});

test("nextStep blocks on step 3 without equipment type and brand", () => {
  useServiceWizardStore.getState().startNewVisit(0);
  useServiceWizardStore.setState({ currentStep: 3 });
  expect(useServiceWizardStore.getState().nextStep()).toBe(false);
});

test("nextStep on step 4 always advances, even with missing suggested photos", () => {
  useServiceWizardStore.getState().startNewVisit(0);
  useServiceWizardStore.setState({ currentStep: 4 });
  const advanced = useServiceWizardStore.getState().nextStep();
  expect(advanced).toBe(true);
  expect(useServiceWizardStore.getState().currentStep).toBe(5);
  expect(useServiceWizardStore.getState().validationError).toContain("fotos sugeridas");
});

test("nextStep blocks on step 5 without observations", () => {
  useServiceWizardStore.getState().startNewVisit(0);
  useServiceWizardStore.setState({ currentStep: 5 });
  expect(useServiceWizardStore.getState().nextStep()).toBe(false);
});

test("nextStep does not validate steps 6 and 7", () => {
  useServiceWizardStore.getState().startNewVisit(0);
  useServiceWizardStore.setState({ currentStep: 6 });
  expect(useServiceWizardStore.getState().nextStep()).toBe(true);
  expect(useServiceWizardStore.getState().nextStep()).toBe(true);
  expect(useServiceWizardStore.getState().currentStep).toBe(8);
});

test("nextStep blocks on step 8 without both signatures", () => {
  useServiceWizardStore.getState().startNewVisit(0);
  useServiceWizardStore.setState({ currentStep: 8 });
  expect(useServiceWizardStore.getState().nextStep()).toBe(false);
});

test("nextStep never advances past the last step", () => {
  useServiceWizardStore.getState().startNewVisit(0);
  useServiceWizardStore.setState({ currentStep: WIZARD_STEP_COUNT });
  useServiceWizardStore.getState().nextStep();
  expect(useServiceWizardStore.getState().currentStep).toBe(WIZARD_STEP_COUNT);
});

test("prevStep never goes below step 1 and clears the validation error", () => {
  useServiceWizardStore.getState().startNewVisit(0);
  useServiceWizardStore.setState({ currentStep: 1, validationError: "algo" });
  useServiceWizardStore.getState().prevStep();
  expect(useServiceWizardStore.getState().currentStep).toBe(1);
  expect(useServiceWizardStore.getState().validationError).toBeNull();
});

test("updateCustomer merges into the draft's customer data", () => {
  useServiceWizardStore.getState().startNewVisit(0);
  useServiceWizardStore.getState().updateCustomer({ company: "Delta S.A." });
  expect(useServiceWizardStore.getState().draft.customer.company).toBe("Delta S.A.");
});

test("addPhoto replaces an existing photo with the same id", () => {
  useServiceWizardStore.getState().startNewVisit(0);
  useServiceWizardStore.getState().addPhoto({ id: "photo-etiqueta_equipo", url: "uri-1", category: "Placa", comment: "" });
  useServiceWizardStore.getState().addPhoto({ id: "photo-etiqueta_equipo", url: "uri-2", category: "Placa", comment: "listo" });
  const photos = useServiceWizardStore.getState().draft.photos;
  expect(photos).toHaveLength(1);
  expect(photos[0].url).toBe("uri-2");
});

test("resetDraft clears the wizard back to an inactive empty state", () => {
  useServiceWizardStore.getState().startNewVisit(3);
  useServiceWizardStore.getState().resetDraft();
  const state = useServiceWizardStore.getState();
  expect(state.isActive).toBe(false);
  expect(state.currentStep).toBe(1);
  expect(state.draft.consecutivo).toBe("");
});
```

- [ ] **Step 4: Correr los tests**

Run: `npm test -- useServiceWizardStore.test.ts`
Expected: PASS (14 tests)

- [ ] **Step 5: Correr el type-check completo del proyecto**

Run: `npm run lint`
Expected: sin errores

- [ ] **Step 6: Commit**

```bash
git add src/features/service/useServiceWizardStore.ts src/features/service/__tests__/useServiceWizardStore.test.ts
git commit -m "feat: add service wizard Zustand store with ported validation gates"
```

---

### Task 6: Shell de navegación — dashboard y anfitrión del wizard

**Files:**
- Delete: `src/app/(tabs)/service.tsx` (se reemplaza por la carpeta `service/`)
- Create: `src/app/(tabs)/service/_layout.tsx`, `src/app/(tabs)/service/index.tsx`, `src/app/(tabs)/service/wizard.tsx`, `src/features/service/steps/StepPlaceholder.tsx`
- Test: `src/app/__tests__/service-dashboard.test.tsx`, `src/app/__tests__/service-wizard.test.tsx`

**Interfaces:**
- Consumes: `subscribeVisits` (Tarea 4), `useServiceWizardStore`/`WIZARD_STEP_COUNT` (Tarea 5), `useAuthStore` (Fundación Tarea 8), `Screen` (Fundación Tarea 2).
- Produces: ruta `/(tabs)/service` (dashboard) y `/(tabs)/service/wizard` (anfitrión de pasos), componente `StepPlaceholder` reutilizado por los pasos 7, 8 y 9 hasta que tengan su propia implementación. `wizard.tsx` expone `StepBody`, que las Tareas 7-12 modifican incrementalmente para reemplazar cada placeholder por su pantalla real.

Expo Router resuelve una carpeta con `index.tsx` igual que un único archivo con el mismo nombre — la pestaña "Servicio" en `(tabs)/_layout.tsx` no necesita ningún cambio.

- [ ] **Step 1: Borrar el placeholder plano y crear la carpeta del módulo**

```bash
rm src/app/\(tabs\)/service.tsx
mkdir -p "src/app/(tabs)/service"
```

- [ ] **Step 2: Layout de la sección Servicio (Stack simple — la guarda de auth ya la aplica el layout de `(tabs)` padre)**

```tsx
// src/app/(tabs)/service/_layout.tsx
import { Stack } from "expo-router";

export default function ServiceLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 3: Componente placeholder compartido por los pasos aún no implementados**

```tsx
// src/features/service/steps/StepPlaceholder.tsx
import { Text, View } from "react-native";

export function StepPlaceholder({ title }: { title: string }) {
  return (
    <View className="p-4">
      <Text className="text-neutral-500">{title} — próximamente</Text>
    </View>
  );
}
```

- [ ] **Step 4: Pantalla del anfitrión del wizard, con los 9 pasos como placeholder por ahora**

```tsx
// src/app/(tabs)/service/wizard.tsx
import { Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../../../shared/components/Screen";
import { useServiceWizardStore, WIZARD_STEP_COUNT } from "../../../features/service/useServiceWizardStore";
import { StepPlaceholder } from "../../../features/service/steps/StepPlaceholder";

const STEP_TITLES = [
  "Datos de Visita",
  "Datos del Cliente",
  "Datos del Equipo",
  "Evidencias Fotográficas",
  "Diagnóstico y Observaciones",
  "Parámetros Técnicos",
  "Concepto de IA",
  "Firmas de Conformidad",
  "Vista Previa PDF",
];

function StepBody({ step }: { step: number }) {
  return <StepPlaceholder title={STEP_TITLES[step - 1]} />;
}

export default function ServiceWizardScreen() {
  const router = useRouter();
  const currentStep = useServiceWizardStore((state) => state.currentStep);
  const validationError = useServiceWizardStore((state) => state.validationError);
  const nextStep = useServiceWizardStore((state) => state.nextStep);
  const prevStep = useServiceWizardStore((state) => state.prevStep);
  const isLastStep = currentStep === WIZARD_STEP_COUNT;

  return (
    <Screen>
      <View testID="wizard-progress-bar" className="h-1 bg-neutral-200">
        <View className="h-1 bg-blue-600" style={{ width: `${(currentStep / WIZARD_STEP_COUNT) * 100}%` }} />
      </View>
      <Text className="text-lg font-bold p-4">{STEP_TITLES[currentStep - 1]}</Text>
      <StepBody step={currentStep} />
      {validationError ? <Text className="mx-4 mb-2 text-red-600">{validationError}</Text> : null}
      <View className="flex-row justify-between p-4">
        <TouchableOpacity
          testID="wizard-prev-button"
          className="px-4 py-2 rounded-lg bg-neutral-200"
          onPress={() => (currentStep === 1 ? router.back() : prevStep())}
        >
          <Text>{currentStep === 1 ? "Cancelar" : "Atrás"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="wizard-next-button"
          disabled={isLastStep}
          className={`px-4 py-2 rounded-lg ${isLastStep ? "bg-neutral-300" : "bg-blue-600"}`}
          onPress={() => nextStep()}
        >
          <Text className={isLastStep ? "text-neutral-500 font-semibold" : "text-white font-semibold"}>
            {isLastStep ? "Guardar — próximamente" : "Siguiente"}
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}
```

- [ ] **Step 5: Dashboard de visitas**

```tsx
// src/app/(tabs)/service/index.tsx
import { useEffect, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../../../shared/components/Screen";
import { useAuthStore } from "../../../features/auth/useAuthStore";
import { subscribeVisits } from "../../../features/service/visitsRepository";
import { useServiceWizardStore } from "../../../features/service/useServiceWizardStore";
import type { Visit } from "../../../shared/types/service";

export default function ServiceDashboardScreen() {
  const router = useRouter();
  const uid = useAuthStore((state) => state.user?.uid);
  const startNewVisit = useServiceWizardStore((state) => state.startNewVisit);
  const [visits, setVisits] = useState<Visit[]>([]);

  useEffect(() => {
    if (!uid) return;
    return subscribeVisits(uid, setVisits);
  }, [uid]);

  return (
    <Screen>
      <View className="flex-row items-center justify-between p-4">
        <Text className="text-2xl font-bold">Servicio</Text>
        <TouchableOpacity
          testID="new-visit-button"
          className="bg-blue-600 rounded-lg px-4 py-2"
          onPress={() => {
            startNewVisit(visits.length);
            router.push("/(tabs)/service/wizard");
          }}
        >
          <Text className="text-white font-semibold">Nueva visita</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        testID="visits-list"
        data={visits}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text className="mx-4 text-neutral-500">Todavía no hay visitas registradas.</Text>}
        renderItem={({ item }) => (
          <View className="mx-4 mb-2 p-3 border border-neutral-200 rounded-lg">
            <Text className="font-semibold">{item.consecutivo}</Text>
            <Text className="text-neutral-500">{item.customer.company || "Sin cliente"} · {item.status}</Text>
          </View>
        )}
      />
    </Screen>
  );
}
```

- [ ] **Step 6: Prueba del dashboard**

```tsx
// src/app/__tests__/service-dashboard.test.tsx
import { render, screen, fireEvent } from "@testing-library/react-native";

jest.mock("../../shared/lib/firebase", () => ({ auth: {}, db: {} }));
jest.mock("firebase/auth", () => ({ onAuthStateChanged: jest.fn() }));

const mockSubscribeVisits = jest.fn();
jest.mock("../../features/service/visitsRepository", () => ({
  subscribeVisits: (...args: unknown[]) => mockSubscribeVisits(...args),
}));

const mockStartNewVisit = jest.fn();
jest.mock("../../features/service/useServiceWizardStore", () => ({
  useServiceWizardStore: (selector: (s: { startNewVisit: typeof mockStartNewVisit }) => unknown) =>
    selector({ startNewVisit: mockStartNewVisit }),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));

import { useAuthStore } from "../../features/auth/useAuthStore";
import ServiceDashboardScreen from "../(tabs)/service/index";

beforeEach(() => {
  mockSubscribeVisits.mockReset().mockReturnValue(jest.fn());
  mockStartNewVisit.mockClear();
  mockPush.mockClear();
  useAuthStore.setState({ user: { uid: "uid-1" } as never, isLoading: false });
});

test("shows an empty state when there are no visits", async () => {
  await render(<ServiceDashboardScreen />);
  expect(screen.getByText("Todavía no hay visitas registradas.")).toBeTruthy();
});

test("renders visits delivered by subscribeVisits", async () => {
  mockSubscribeVisits.mockImplementation((_uid, callback) => {
    callback([{ id: "v1", consecutivo: "FS-2026-0001", status: "Completado", customer: { company: "Delta S.A." } }]);
    return jest.fn();
  });
  await render(<ServiceDashboardScreen />);
  expect(screen.getByText("FS-2026-0001")).toBeTruthy();
});

test("starting a new visit resets the wizard and navigates to it", async () => {
  await render(<ServiceDashboardScreen />);
  fireEvent.press(screen.getByTestId("new-visit-button"));
  expect(mockStartNewVisit).toHaveBeenCalledWith(0);
  expect(mockPush).toHaveBeenCalledWith("/(tabs)/service/wizard");
});
```

- [ ] **Step 7: Prueba del anfitrión del wizard**

```tsx
// src/app/__tests__/service-wizard.test.tsx
import { render, screen, fireEvent } from "@testing-library/react-native";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ back: mockBack }) }));

const mockNextStep = jest.fn();
const mockPrevStep = jest.fn();
let mockState = { currentStep: 1, validationError: null as string | null };
jest.mock("../../features/service/useServiceWizardStore", () => ({
  useServiceWizardStore: (
    selector: (s: typeof mockState & { nextStep: typeof mockNextStep; prevStep: typeof mockPrevStep }) => unknown
  ) => selector({ ...mockState, nextStep: mockNextStep, prevStep: mockPrevStep }),
  WIZARD_STEP_COUNT: 9,
}));

import ServiceWizardScreen from "../(tabs)/service/wizard";

beforeEach(() => {
  mockBack.mockClear();
  mockNextStep.mockClear();
  mockPrevStep.mockClear();
  mockState = { currentStep: 1, validationError: null };
});

test("renders the current step's title and a placeholder body for unbuilt steps", async () => {
  mockState = { currentStep: 7, validationError: null };
  await render(<ServiceWizardScreen />);
  expect(screen.getByText("Concepto de IA")).toBeTruthy();
  expect(screen.getByText("Concepto de IA — próximamente")).toBeTruthy();
});

test("pressing Atrás calls prevStep on steps after the first", async () => {
  mockState = { currentStep: 3, validationError: null };
  await render(<ServiceWizardScreen />);
  fireEvent.press(screen.getByTestId("wizard-prev-button"));
  expect(mockPrevStep).toHaveBeenCalled();
});

test("pressing Cancelar on step 1 navigates back instead of calling prevStep", async () => {
  await render(<ServiceWizardScreen />);
  fireEvent.press(screen.getByTestId("wizard-prev-button"));
  expect(mockBack).toHaveBeenCalled();
  expect(mockPrevStep).not.toHaveBeenCalled();
});

test("pressing Siguiente calls nextStep", async () => {
  await render(<ServiceWizardScreen />);
  fireEvent.press(screen.getByTestId("wizard-next-button"));
  expect(mockNextStep).toHaveBeenCalled();
});

test("shows the validation error message when present", async () => {
  mockState = { currentStep: 5, validationError: "Escriba sus observaciones técnicas sobre el mantenimiento." };
  await render(<ServiceWizardScreen />);
  expect(screen.getByText("Escriba sus observaciones técnicas sobre el mantenimiento.")).toBeTruthy();
});

test("the last step's button is disabled and does not read Siguiente", async () => {
  mockState = { currentStep: 9, validationError: null };
  await render(<ServiceWizardScreen />);
  expect(screen.getByText("Guardar — próximamente")).toBeTruthy();
});
```

- [ ] **Step 8: Correr los tests**

Run: `npm test -- service-dashboard.test.tsx service-wizard.test.tsx`
Expected: PASS (9 tests)

- [ ] **Step 9: Correr el type-check y la suite completa**

Run: `npm run lint && npm test`
Expected: sin errores; toda la suite existente sigue en PASS (confirma que borrar `service.tsx` no rompió `tabs-layout.test.tsx`, que solo mockea `expo-router` y no importa la pantalla directamente)

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add service dashboard and wizard host shell with placeholder steps"
```

---

### Task 7: Paso 1 — Datos de Visita (con captura de GPS real)

**Files:**
- Create: `src/features/service/steps/Step1VisitData.tsx`
- Modify: `src/app/(tabs)/service/wizard.tsx` (reemplaza el placeholder del paso 1), `app.config.ts` (plugin de `expo-location`)
- Test: `src/features/service/steps/__tests__/Step1VisitData.test.tsx`

**Interfaces:**
- Consumes: `useServiceWizardStore` (Tarea 5).
- Produces: componente `Step1VisitData`, importado por `wizard.tsx`.

A diferencia de `MapLocationPicker.tsx` de fsapp (que devuelve coordenadas de Bogotá hardcodeadas si el permiso es denegado — ver "Hallazgos de fsapp saneados" al inicio de este plan), esta captura de GPS **nunca** inventa una coordenada: si el permiso se deniega o falla la lectura, `gps` queda en `null` y se muestra el error real.

- [ ] **Step 1: Instalar `expo-location`**

```bash
npx expo install expo-location
```

- [ ] **Step 2: Agregar el plugin de permisos, extendiendo el array existente**

```ts
// app.config.ts (reemplazar la línea "plugins" dentro del objeto expoConfig)
plugins: [
  ...(config.plugins ?? []),
  "@react-native-google-signin/google-signin",
  "expo-apple-authentication",
  [
    "expo-location",
    { locationWhenInUsePermission: "FS App necesita tu ubicación para registrar dónde se realizó el servicio." },
  ],
],
```

- [ ] **Step 3: Escribir el componente**

```tsx
// src/features/service/steps/Step1VisitData.tsx
import { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Location from "expo-location";
import { useServiceWizardStore } from "../useServiceWizardStore";

export function Step1VisitData() {
  const draft = useServiceWizardStore((state) => state.draft);
  const setDateTime = useServiceWizardStore((state) => state.setDateTime);
  const setGps = useServiceWizardStore((state) => state.setGps);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  async function handleCaptureLocation() {
    setIsLocating(true);
    setLocationError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationError("Permiso de ubicación denegado. Puede continuar sin ubicación GPS.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const gps = {
        latitude: Number(position.coords.latitude.toFixed(5)),
        longitude: Number(position.coords.longitude.toFixed(5)),
        accuracy: position.coords.accuracy ? Math.round(position.coords.accuracy) : undefined,
      };
      setGps(gps);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${gps.latitude}&lon=${gps.longitude}`
        );
        const data = await response.json();
        setAddress(data?.display_name ?? null);
      } catch {
        setAddress(null);
      }
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : "No se pudo obtener la ubicación GPS.");
    } finally {
      setIsLocating(false);
    }
  }

  return (
    <View className="px-4">
      <Text testID="consecutivo-display" className="text-lg font-semibold mb-2">{draft.consecutivo}</Text>
      <Text className="text-sm text-neutral-500">Fecha</Text>
      <TextInput
        testID="visit-date-input"
        className="mb-2 border border-neutral-300 rounded-lg p-3"
        value={draft.date}
        onChangeText={(date) => setDateTime({ date })}
      />
      <View className="flex-row mb-2">
        <View className="flex-1 mr-2">
          <Text className="text-sm text-neutral-500">Hora inicio</Text>
          <TextInput
            testID="visit-start-time-input"
            className="border border-neutral-300 rounded-lg p-3"
            value={draft.startTime}
            onChangeText={(startTime) => setDateTime({ startTime })}
          />
        </View>
        <View className="flex-1">
          <Text className="text-sm text-neutral-500">Hora fin</Text>
          <TextInput
            testID="visit-end-time-input"
            className="border border-neutral-300 rounded-lg p-3"
            value={draft.endTime}
            onChangeText={(endTime) => setDateTime({ endTime })}
          />
        </View>
      </View>

      <TouchableOpacity
        testID="capture-gps-button"
        className="bg-neutral-200 rounded-lg p-3 mb-2"
        onPress={handleCaptureLocation}
        disabled={isLocating}
      >
        {isLocating ? <ActivityIndicator /> : <Text className="text-center font-semibold">Capturar ubicación GPS</Text>}
      </TouchableOpacity>
      {locationError ? <Text className="text-red-600 mb-2">{locationError}</Text> : null}
      {draft.gps ? (
        <Text testID="gps-result" className="text-neutral-600 mb-2">
          {address ?? `${draft.gps.latitude}, ${draft.gps.longitude}`} (±{draft.gps.accuracy ?? "?"}m)
        </Text>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 4: Conectar el paso en `wizard.tsx`**

```tsx
// src/app/(tabs)/service/wizard.tsx (agregar el import y modificar StepBody)
import { Step1VisitData } from "../../../features/service/steps/Step1VisitData";

function StepBody({ step }: { step: number }) {
  if (step === 1) return <Step1VisitData />;
  return <StepPlaceholder title={STEP_TITLES[step - 1]} />;
}
```

- [ ] **Step 5: Escribir la prueba, incluyendo el caso que prueba la corrección del hallazgo de GPS falso**

```tsx
// src/features/service/steps/__tests__/Step1VisitData.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

let mockDraft = {
  consecutivo: "FS-2026-0001",
  date: "2026-09-22",
  startTime: "08:00",
  endTime: "09:00",
  gps: null as null | { latitude: number; longitude: number; accuracy?: number },
};
const mockSetDateTime = jest.fn();
const mockSetGps = jest.fn();
jest.mock("../../useServiceWizardStore", () => ({
  useServiceWizardStore: (selector: (s: { draft: typeof mockDraft; setDateTime: typeof mockSetDateTime; setGps: typeof mockSetGps }) => unknown) =>
    selector({ draft: mockDraft, setDateTime: mockSetDateTime, setGps: mockSetGps }),
}));

import * as Location from "expo-location";
import { Step1VisitData } from "../Step1VisitData";

beforeEach(() => {
  mockDraft = { consecutivo: "FS-2026-0001", date: "2026-09-22", startTime: "08:00", endTime: "09:00", gps: null };
  mockSetDateTime.mockClear();
  mockSetGps.mockClear();
  global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ display_name: "Calle Falsa 123" }) }) as never;
});

test("shows the auto-generated consecutivo", async () => {
  await render(<Step1VisitData />);
  expect(screen.getByTestId("consecutivo-display")).toHaveTextContent("FS-2026-0001");
});

test("editing the date field calls setDateTime", async () => {
  await render(<Step1VisitData />);
  fireEvent.changeText(screen.getByTestId("visit-date-input"), "2026-09-23");
  expect(mockSetDateTime).toHaveBeenCalledWith({ date: "2026-09-23" });
});

test("capturing location stores the real GPS coordinates on success", async () => {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
    coords: { latitude: 4.60971, longitude: -74.08175, accuracy: 12.3 },
  });
  await render(<Step1VisitData />);
  fireEvent.press(screen.getByTestId("capture-gps-button"));
  await waitFor(() =>
    expect(mockSetGps).toHaveBeenCalledWith({ latitude: 4.60971, longitude: -74.08175, accuracy: 12 })
  );
});

test("shows a real error and never fabricates coordinates when permission is denied", async () => {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
  await render(<Step1VisitData />);
  fireEvent.press(screen.getByTestId("capture-gps-button"));
  await waitFor(() => expect(screen.getByText(/Permiso de ubicación denegado/)).toBeTruthy());
  expect(mockSetGps).not.toHaveBeenCalled();
});
```

- [ ] **Step 6: Correr los tests**

Run: `npm test -- Step1VisitData.test.tsx service-wizard.test.tsx`
Expected: PASS (7 tests — 4 nuevos + los 3 de `service-wizard.test.tsx` que siguen intactos porque ese archivo prueba el paso 7, no el 1)

- [ ] **Step 7: Commit**

```bash
git add src/features/service/steps/Step1VisitData.tsx src/features/service/steps/__tests__/Step1VisitData.test.tsx src/app/\(tabs\)/service/wizard.tsx app.config.ts
git commit -m "feat: implement wizard step 1 with real GPS capture, no fake fallback coordinates"
```

---

### Task 8: Paso 2 — Datos del Cliente

**Files:**
- Create: `src/features/service/steps/Step2CustomerData.tsx`
- Modify: `src/app/(tabs)/service/wizard.tsx`
- Test: `src/features/service/steps/__tests__/Step2CustomerData.test.tsx`

**Interfaces:**
- Consumes: `useServiceWizardStore` (Tarea 5), `type CustomerData` (Tarea 1).
- Produces: componente `Step2CustomerData`, importado por `wizard.tsx`.

- [ ] **Step 1: Escribir el componente**

```tsx
// src/features/service/steps/Step2CustomerData.tsx
import { Text, TextInput, View } from "react-native";
import { useServiceWizardStore } from "../useServiceWizardStore";

export function Step2CustomerData() {
  const customer = useServiceWizardStore((state) => state.draft.customer);
  const updateCustomer = useServiceWizardStore((state) => state.updateCustomer);

  return (
    <View className="px-4">
      <TextInput testID="customer-company-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Empresa" value={customer.company} onChangeText={(company) => updateCustomer({ company })} />
      <TextInput testID="customer-contact-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Persona de contacto" value={customer.contactPerson} onChangeText={(contactPerson) => updateCustomer({ contactPerson })} />
      <TextInput testID="customer-address-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Dirección" value={customer.address} onChangeText={(address) => updateCustomer({ address })} />
      <TextInput testID="customer-city-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Ciudad" value={customer.city} onChangeText={(city) => updateCustomer({ city })} />
      <TextInput testID="customer-phone-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Teléfono" keyboardType="phone-pad" value={customer.phone} onChangeText={(phone) => updateCustomer({ phone })} />
      <TextInput testID="customer-email-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Correo" autoCapitalize="none" keyboardType="email-address" value={customer.email} onChangeText={(email) => updateCustomer({ email })} />
      <TextInput testID="customer-nit-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="NIT (opcional)" value={customer.nit} onChangeText={(nit) => updateCustomer({ nit })} />
    </View>
  );
}
```

- [ ] **Step 2: Conectar el paso en `wizard.tsx`**

```tsx
// src/app/(tabs)/service/wizard.tsx (agregar el import y ampliar StepBody)
import { Step2CustomerData } from "../../../features/service/steps/Step2CustomerData";

function StepBody({ step }: { step: number }) {
  if (step === 1) return <Step1VisitData />;
  if (step === 2) return <Step2CustomerData />;
  return <StepPlaceholder title={STEP_TITLES[step - 1]} />;
}
```

- [ ] **Step 3: Escribir la prueba**

```tsx
// src/features/service/steps/__tests__/Step2CustomerData.test.tsx
import { render, screen, fireEvent } from "@testing-library/react-native";

let mockCustomer = { company: "", address: "", city: "", contactPerson: "", phone: "", email: "", nit: "" };
const mockUpdateCustomer = jest.fn();
jest.mock("../../useServiceWizardStore", () => ({
  useServiceWizardStore: (selector: (s: { draft: { customer: typeof mockCustomer }; updateCustomer: typeof mockUpdateCustomer }) => unknown) =>
    selector({ draft: { customer: mockCustomer }, updateCustomer: mockUpdateCustomer }),
}));

import { Step2CustomerData } from "../Step2CustomerData";

beforeEach(() => {
  mockCustomer = { company: "", address: "", city: "", contactPerson: "", phone: "", email: "", nit: "" };
  mockUpdateCustomer.mockClear();
});

test("typing in the company field updates the customer draft", async () => {
  await render(<Step2CustomerData />);
  fireEvent.changeText(screen.getByTestId("customer-company-input"), "Delta S.A.");
  expect(mockUpdateCustomer).toHaveBeenCalledWith({ company: "Delta S.A." });
});

test("typing in the contact person field updates the customer draft", async () => {
  await render(<Step2CustomerData />);
  fireEvent.changeText(screen.getByTestId("customer-contact-input"), "Ing. Mauricio Benítez");
  expect(mockUpdateCustomer).toHaveBeenCalledWith({ contactPerson: "Ing. Mauricio Benítez" });
});
```

- [ ] **Step 4: Correr los tests**

Run: `npm test -- Step2CustomerData.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/service/steps/Step2CustomerData.tsx src/features/service/steps/__tests__/Step2CustomerData.test.tsx src/app/\(tabs\)/service/wizard.tsx
git commit -m "feat: implement wizard step 2 (customer data)"
```

---

### Task 9: Paso 3 — Datos del Equipo (con selector de refrigerante y chips de zona)

**Files:**
- Create: `src/features/service/steps/Step3EquipmentData.tsx`
- Modify: `src/app/(tabs)/service/wizard.tsx`
- Test: `src/features/service/steps/__tests__/Step3EquipmentData.test.tsx`

**Interfaces:**
- Consumes: `useServiceWizardStore` (Tarea 5), `REFRIGERANTS_DATABASE` (Tarea 2).
- Produces: componente `Step3EquipmentData`, importado por `wizard.tsx`.

Los 6 chips de zona se portan literalmente de `MapLocationPicker.tsx` de fsapp. El escaneo de QR para prellenar estos campos (botón "Escanear QR" en fsapp) queda explícitamente fuera de este plan — ver "Fuera de alcance" al inicio.

- [ ] **Step 1: Escribir el componente**

```tsx
// src/features/service/steps/Step3EquipmentData.tsx
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useServiceWizardStore } from "../useServiceWizardStore";
import { REFRIGERANTS_DATABASE } from "../../../shared/utils/hvacCalculations";

const ZONE_PRESETS = [
  "Azotea / Techo Técnico",
  "Piso 1 - Cuarto de Máquinas",
  "Sótano 1 - Chiller Plant",
  "Nivel 4 - Sala de Servidores",
  "Cuarto Manejadoras (UMA)",
  "Paseo Exterior - Condensadores",
];

export function Step3EquipmentData() {
  const equipment = useServiceWizardStore((state) => state.draft.equipment);
  const updateEquipment = useServiceWizardStore((state) => state.updateEquipment);

  return (
    <ScrollView className="px-4">
      <TextInput testID="equipment-type-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Tipo de equipo" value={equipment.type} onChangeText={(type) => updateEquipment({ type })} />
      <TextInput testID="equipment-brand-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Marca" value={equipment.brand} onChangeText={(brand) => updateEquipment({ brand })} />
      <TextInput testID="equipment-model-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Modelo" value={equipment.model} onChangeText={(model) => updateEquipment({ model })} />
      <TextInput testID="equipment-serial-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Número de serie" value={equipment.serial} onChangeText={(serial) => updateEquipment({ serial })} />
      <TextInput testID="equipment-capacity-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Capacidad" value={equipment.capacity} onChangeText={(capacity) => updateEquipment({ capacity })} />

      <Text className="mb-1 font-semibold">Refrigerante</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
        {Object.keys(REFRIGERANTS_DATABASE).map((key) => (
          <TouchableOpacity
            key={key}
            testID={`refrigerant-chip-${key}`}
            className={`mr-2 px-3 py-2 rounded-full ${equipment.refrigerant === key ? "bg-blue-600" : "bg-neutral-200"}`}
            onPress={() => updateEquipment({ refrigerant: key })}
          >
            <Text className={equipment.refrigerant === key ? "text-white" : "text-neutral-700"}>{key}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text className="mb-1 font-semibold">Ubicación</Text>
      <TextInput testID="equipment-location-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Ubicación específica" value={equipment.location} onChangeText={(location) => updateEquipment({ location })} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
        {ZONE_PRESETS.map((zone) => (
          <TouchableOpacity key={zone} className="mr-2 px-3 py-2 rounded-full bg-neutral-200" onPress={() => updateEquipment({ location: zone })}>
            <Text className="text-neutral-700">{zone}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Conectar el paso en `wizard.tsx`**

```tsx
// src/app/(tabs)/service/wizard.tsx (agregar el import y ampliar StepBody)
import { Step3EquipmentData } from "../../../features/service/steps/Step3EquipmentData";

function StepBody({ step }: { step: number }) {
  if (step === 1) return <Step1VisitData />;
  if (step === 2) return <Step2CustomerData />;
  if (step === 3) return <Step3EquipmentData />;
  return <StepPlaceholder title={STEP_TITLES[step - 1]} />;
}
```

- [ ] **Step 3: Escribir la prueba**

```tsx
// src/features/service/steps/__tests__/Step3EquipmentData.test.tsx
import { render, screen, fireEvent } from "@testing-library/react-native";

let mockEquipment = { type: "", brand: "", model: "", serial: "", location: "", refrigerant: "R-410A", capacity: "" };
const mockUpdateEquipment = jest.fn();
jest.mock("../../useServiceWizardStore", () => ({
  useServiceWizardStore: (selector: (s: { draft: { equipment: typeof mockEquipment }; updateEquipment: typeof mockUpdateEquipment }) => unknown) =>
    selector({ draft: { equipment: mockEquipment }, updateEquipment: mockUpdateEquipment }),
}));

import { Step3EquipmentData } from "../Step3EquipmentData";

beforeEach(() => {
  mockEquipment = { type: "", brand: "", model: "", serial: "", location: "", refrigerant: "R-410A", capacity: "" };
  mockUpdateEquipment.mockClear();
});

test("typing in the type field updates the equipment draft", async () => {
  await render(<Step3EquipmentData />);
  fireEvent.changeText(screen.getByTestId("equipment-type-input"), "Chiller");
  expect(mockUpdateEquipment).toHaveBeenCalledWith({ type: "Chiller" });
});

test("selecting a refrigerant chip updates the equipment draft", async () => {
  await render(<Step3EquipmentData />);
  fireEvent.press(screen.getByTestId("refrigerant-chip-R-22"));
  expect(mockUpdateEquipment).toHaveBeenCalledWith({ refrigerant: "R-22" });
});

test("selecting a zone preset fills the location field", async () => {
  await render(<Step3EquipmentData />);
  fireEvent.press(screen.getByText("Azotea / Techo Técnico"));
  expect(mockUpdateEquipment).toHaveBeenCalledWith({ location: "Azotea / Techo Técnico" });
});
```

- [ ] **Step 4: Correr los tests**

Run: `npm test -- Step3EquipmentData.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/service/steps/Step3EquipmentData.tsx src/features/service/steps/__tests__/Step3EquipmentData.test.tsx src/app/\(tabs\)/service/wizard.tsx
git commit -m "feat: implement wizard step 3 (equipment data, refrigerant picker, zone presets)"
```

---

### Task 10: Paso 4 — Evidencias Fotográficas (captura local)

**Files:**
- Create: `src/features/service/photoSlots.ts`, `src/features/service/steps/Step4Photos.tsx`
- Modify: `src/app/(tabs)/service/wizard.tsx`, `app.config.ts` (plugin de `expo-image-picker`)
- Test: `src/features/service/steps/__tests__/Step4Photos.test.tsx`

**Interfaces:**
- Consumes: `useServiceWizardStore` (Tarea 5), `type PhotoCategory` (Tarea 1).
- Produces: `const PHOTO_SLOTS: PhotoSlot[]`, componente `Step4Photos`, importado por `wizard.tsx`.

Las fotos se guardan con el URI local del dispositivo (`file://...`) — la subida a Cloudinary y la conversión a URL pública es del plan de seguimiento. Esto es intencional y no bloquea el resto del wizard, porque (igual que en fsapp) la validación del paso 4 es solo informativa, nunca bloqueante.

- [ ] **Step 1: Instalar `expo-image-picker`**

```bash
npx expo install expo-image-picker
```

- [ ] **Step 2: Agregar el plugin de permisos**

```ts
// app.config.ts (extender el array "plugins" agregado en la Tarea 7)
plugins: [
  ...(config.plugins ?? []),
  "@react-native-google-signin/google-signin",
  "expo-apple-authentication",
  [
    "expo-location",
    { locationWhenInUsePermission: "FS App necesita tu ubicación para registrar dónde se realizó el servicio." },
  ],
  [
    "expo-image-picker",
    { cameraPermission: "FS App necesita acceso a la cámara para fotografiar evidencias de servicio." },
  ],
],
```

- [ ] **Step 3: Portar la constante `PHOTO_SLOTS` (los 7 slots exactos de `App.tsx` de fsapp)**

```ts
// src/features/service/photoSlots.ts
import type { PhotoCategory } from "../../shared/types/service";

export interface PhotoSlot {
  key: string;
  label: string;
  category: PhotoCategory;
  description: string;
  placeholderComment: string;
  color: string;
}

export const PHOTO_SLOTS: PhotoSlot[] = [
  { key: "manometro_baja", label: "Manómetro de Baja (Sugerido)", category: "Durante", description: "Lectura de presión en línea de succión / retorno.", placeholderComment: "Ej. Marcando 118 PSI estables, parámetros operativos térmicos ideales.", color: "sky" },
  { key: "manometro_alta", label: "Manómetro de Alta (Sugerido)", category: "Durante", description: "Lectura de presión en línea de líquido / descarga.", placeholderComment: "Ej. Marcando 340 PSI estables, intercambio térmico adecuado.", color: "rose" },
  { key: "etiqueta_equipo", label: "Etiqueta / Placa de Datos (Sugerido)", category: "Placa", description: "Placa de características técnica legible del fabricante.", placeholderComment: "Ej. Modelo 39HQ-012-G, serie UMA-CR-2024-89021A.", color: "slate" },
  { key: "evaporador_antes", label: "Evaporador - Antes (Sugerido)", category: "Antes", description: "Estado inicial del serpentín evaporador y bandeja.", placeholderComment: "Ej. Presencia de biofilm orgánico y lodo leve en bandeja de condensado.", color: "amber" },
  { key: "evaporador_despues", label: "Evaporador - Después (Sugerido)", category: "Después", description: "Serpentín desinfectado y bandeja libre de biofilm.", placeholderComment: "Ej. Serpentín hidrolavado químicamente con espuma desinfectante.", color: "emerald" },
  { key: "condensadora_antes", label: "Condensadora - Antes (Sugerido)", category: "Antes", description: "Estado inicial del serpentín condensador exterior.", placeholderComment: "Ej. Obstrucción severa por acumulación de polvo y hollín en aletas.", color: "amber" },
  { key: "condensadora_despues", label: "Condensadora - Después (Sugerido)", category: "Después", description: "Serpentín exterior libre de hollín e impurezas.", placeholderComment: "Ej. Disipación hidrolavada, aletas restauradas, paso de aire al 100%.", color: "emerald" },
];
```

- [ ] **Step 4: Escribir el componente**

```tsx
// src/features/service/steps/Step4Photos.tsx
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useServiceWizardStore } from "../useServiceWizardStore";
import { PHOTO_SLOTS, type PhotoSlot } from "../photoSlots";

type PhotoSlotCategory = PhotoSlot["category"];

export function Step4Photos() {
  const photos = useServiceWizardStore((state) => state.draft.photos);
  const addPhoto = useServiceWizardStore((state) => state.addPhoto);

  async function handleCapture(slotKey: string, category: PhotoSlotCategory) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    const existing = photos.find((p) => p.id === `photo-${slotKey}`);
    addPhoto({ id: `photo-${slotKey}`, url: result.assets[0].uri, category, comment: existing?.comment ?? "" });
  }

  function handleComment(slotKey: string, category: PhotoSlotCategory, comment: string) {
    const existing = photos.find((p) => p.id === `photo-${slotKey}`);
    addPhoto({ id: `photo-${slotKey}`, url: existing?.url ?? "", category, comment });
  }

  return (
    <ScrollView className="px-4">
      {PHOTO_SLOTS.map((slot) => {
        const photo = photos.find((p) => p.id === `photo-${slot.key}`);
        return (
          <View key={slot.key} className="mb-4 border border-neutral-200 rounded-lg p-3">
            <Text className="font-semibold">{slot.label}</Text>
            <Text className="text-neutral-500 mb-2">{slot.description}</Text>
            {photo?.url ? (
              <Image testID={`photo-preview-${slot.key}`} source={{ uri: photo.url }} className="w-full h-40 rounded-lg mb-2" />
            ) : null}
            <TouchableOpacity
              testID={`capture-button-${slot.key}`}
              className="bg-neutral-200 rounded-lg p-2 mb-2"
              onPress={() => handleCapture(slot.key, slot.category)}
            >
              <Text className="text-center">{photo?.url ? "Volver a tomar" : "Tomar foto"}</Text>
            </TouchableOpacity>
            <TextInput
              testID={`photo-comment-${slot.key}`}
              className="border border-neutral-300 rounded-lg p-2"
              placeholder={slot.placeholderComment}
              value={photo?.comment ?? ""}
              onChangeText={(comment) => handleComment(slot.key, slot.category, comment)}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}
```

- [ ] **Step 5: Conectar el paso en `wizard.tsx`**

```tsx
// src/app/(tabs)/service/wizard.tsx (agregar el import y ampliar StepBody)
import { Step4Photos } from "../../../features/service/steps/Step4Photos";

function StepBody({ step }: { step: number }) {
  if (step === 1) return <Step1VisitData />;
  if (step === 2) return <Step2CustomerData />;
  if (step === 3) return <Step3EquipmentData />;
  if (step === 4) return <Step4Photos />;
  return <StepPlaceholder title={STEP_TITLES[step - 1]} />;
}
```

- [ ] **Step 6: Escribir la prueba**

```tsx
// src/features/service/steps/__tests__/Step4Photos.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

let mockPhotos: { id: string; url: string; category: string; comment: string }[] = [];
const mockAddPhoto = jest.fn();
jest.mock("../../useServiceWizardStore", () => ({
  useServiceWizardStore: (selector: (s: { draft: { photos: typeof mockPhotos }; addPhoto: typeof mockAddPhoto }) => unknown) =>
    selector({ draft: { photos: mockPhotos }, addPhoto: mockAddPhoto }),
}));

import * as ImagePicker from "expo-image-picker";
import { Step4Photos } from "../Step4Photos";

beforeEach(() => {
  mockPhotos = [];
  mockAddPhoto.mockClear();
});

test("renders all seven suggested photo slots", async () => {
  await render(<Step4Photos />);
  expect(screen.getByText("Manómetro de Baja (Sugerido)")).toBeTruthy();
  expect(screen.getByText("Condensadora - Después (Sugerido)")).toBeTruthy();
});

test("capturing a photo for a slot stores it against that slot's id", async () => {
  (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///photo1.jpg" }],
  });
  await render(<Step4Photos />);
  fireEvent.press(screen.getByTestId("capture-button-etiqueta_equipo"));
  await waitFor(() =>
    expect(mockAddPhoto).toHaveBeenCalledWith({ id: "photo-etiqueta_equipo", url: "file:///photo1.jpg", category: "Placa", comment: "" })
  );
});

test("denied camera permission does not add a photo", async () => {
  (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
  await render(<Step4Photos />);
  fireEvent.press(screen.getByTestId("capture-button-etiqueta_equipo"));
  await waitFor(() => expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled());
  expect(mockAddPhoto).not.toHaveBeenCalled();
});
```

- [ ] **Step 7: Correr los tests**

Run: `npm test -- Step4Photos.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 8: Commit**

```bash
git add src/features/service/photoSlots.ts src/features/service/steps/Step4Photos.tsx src/features/service/steps/__tests__/Step4Photos.test.tsx src/app/\(tabs\)/service/wizard.tsx app.config.ts
git commit -m "feat: implement wizard step 4 (local photo capture across the 7 suggested slots)"
```

---

### Task 11: Paso 5 — Diagnóstico y Observaciones

**Files:**
- Create: `src/features/service/steps/Step5Observations.tsx`
- Modify: `src/app/(tabs)/service/wizard.tsx`
- Test: `src/features/service/steps/__tests__/Step5Observations.test.tsx`

**Interfaces:**
- Consumes: `useServiceWizardStore` (Tarea 5).
- Produces: componente `Step5Observations`, importado por `wizard.tsx`.

- [ ] **Step 1: Escribir el componente**

```tsx
// src/features/service/steps/Step5Observations.tsx
import { TextInput, View } from "react-native";
import { useServiceWizardStore } from "../useServiceWizardStore";

export function Step5Observations() {
  const observations = useServiceWizardStore((state) => state.draft.observations);
  const setObservations = useServiceWizardStore((state) => state.setObservations);

  return (
    <View className="px-4">
      <TextInput
        testID="observations-input"
        className="border border-neutral-300 rounded-lg p-3 h-40"
        placeholder="Describa el diagnóstico y las observaciones técnicas del mantenimiento..."
        multiline
        textAlignVertical="top"
        value={observations}
        onChangeText={setObservations}
      />
    </View>
  );
}
```

- [ ] **Step 2: Conectar el paso en `wizard.tsx`**

```tsx
// src/app/(tabs)/service/wizard.tsx (agregar el import y ampliar StepBody)
import { Step5Observations } from "../../../features/service/steps/Step5Observations";

function StepBody({ step }: { step: number }) {
  if (step === 1) return <Step1VisitData />;
  if (step === 2) return <Step2CustomerData />;
  if (step === 3) return <Step3EquipmentData />;
  if (step === 4) return <Step4Photos />;
  if (step === 5) return <Step5Observations />;
  return <StepPlaceholder title={STEP_TITLES[step - 1]} />;
}
```

- [ ] **Step 3: Escribir la prueba**

```tsx
// src/features/service/steps/__tests__/Step5Observations.test.tsx
import { render, screen, fireEvent } from "@testing-library/react-native";

const mockSetObservations = jest.fn();
jest.mock("../../useServiceWizardStore", () => ({
  useServiceWizardStore: (selector: (s: { draft: { observations: string }; setObservations: typeof mockSetObservations }) => unknown) =>
    selector({ draft: { observations: "" }, setObservations: mockSetObservations }),
}));

import { Step5Observations } from "../Step5Observations";

test("typing observations calls setObservations", async () => {
  await render(<Step5Observations />);
  fireEvent.changeText(screen.getByTestId("observations-input"), "Se realizó limpieza de serpentines.");
  expect(mockSetObservations).toHaveBeenCalledWith("Se realizó limpieza de serpentines.");
});
```

- [ ] **Step 4: Correr los tests**

Run: `npm test -- Step5Observations.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/features/service/steps/Step5Observations.tsx src/features/service/steps/__tests__/Step5Observations.test.tsx src/app/\(tabs\)/service/wizard.tsx
git commit -m "feat: implement wizard step 5 (diagnosis and observations)"
```

---

### Task 12: Paso 6 — Parámetros Técnicos (con cálculo termodinámico en vivo)

**Files:**
- Create: `src/features/service/steps/Step6TechnicalParameters.tsx`
- Modify: `src/app/(tabs)/service/wizard.tsx`
- Test: `src/features/service/steps/__tests__/Step6TechnicalParameters.test.tsx`

**Interfaces:**
- Consumes: `useServiceWizardStore` (Tarea 5), `calculateHVACThermodynamics` (Tarea 2), `type TechnicalParameters` (Tarea 1).
- Produces: componente `Step6TechnicalParameters`, importado por `wizard.tsx`. Con esto, el `StepBody` de `wizard.tsx` queda completo para los 6 pasos en alcance de este plan.

Cubre los 7 campos que `calculateHVACThermodynamics` realmente consume (temperatura ambiente, temperatura de recinto, salida de evaporador, descarga de compresor, presión de succión, presión de descarga, línea de líquido — antes y después), más los campos simples que no participan del cálculo pero sí del reporte (voltaje, amperaje, potencia, filtro secador, cambio de válvula). Se omiten deliberadamente los campos opcionales de desglose trifásico (`voltageL1-L3`, `currentL1-L3` de `TechnicalParameters`) — no los consume ningún cálculo y duplican en granularidad los campos simples ya cubiertos; si se necesitan más adelante, se agregan en un task propio.

- [ ] **Step 1: Escribir el componente**

```tsx
// src/features/service/steps/Step6TechnicalParameters.tsx
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useServiceWizardStore } from "../useServiceWizardStore";
import { calculateHVACThermodynamics } from "../../../shared/utils/hvacCalculations";
import type { TechnicalParameters } from "../../../shared/types/service";

function LabeledInput({
  testID,
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  testID: string;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View className="flex-1 mr-2">
      <Text className="text-xs text-neutral-500">{label}</Text>
      <TextInput
        testID={testID}
        className="border border-neutral-300 rounded-lg p-2"
        keyboardType={keyboardType ?? "default"}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const CALC_FIELDS: { beforeKey: keyof TechnicalParameters; afterKey: keyof TechnicalParameters; label: string }[] = [
  { beforeKey: "ambientTempBefore", afterKey: "ambientTempAfter", label: "T. Ambiente (°C)" },
  { beforeKey: "roomTempBefore", afterKey: "roomTempAfter", label: "T. Interior / Cuarto Frío (°C)" },
  { beforeKey: "evaporatorOutletTempBefore", afterKey: "evaporatorOutletTempAfter", label: "T. Salida Evaporador (°C)" },
  { beforeKey: "compressorDischargeTempBefore", afterKey: "compressorDischargeTempAfter", label: "T. Descarga Compresor (°C)" },
  { beforeKey: "suctionPressureBefore", afterKey: "suctionPressureAfter", label: "Presión Succión (PSIG)" },
  { beforeKey: "dischargePressureBefore", afterKey: "dischargePressureAfter", label: "Presión Descarga (PSIG)" },
  { beforeKey: "liquidLineTempBefore", afterKey: "liquidLineTempAfter", label: "T. Línea Líquido (°C)" },
];

const DRYER_FILTER_OPTIONS = ["Bueno", "Regular", "Obstruido"];

export function Step6TechnicalParameters() {
  const params = useServiceWizardStore((state) => state.draft.technicalParams);
  const refrigerant = useServiceWizardStore((state) => state.draft.equipment.refrigerant);
  const updateTechnicalParams = useServiceWizardStore((state) => state.updateTechnicalParams);

  function update(field: keyof TechnicalParameters, value: string) {
    const nextParams = { ...params, [field]: value };

    const before = calculateHVACThermodynamics({
      refrigerant,
      ambientTemp: nextParams.ambientTempBefore,
      roomTemp: nextParams.roomTempBefore,
      evaporatorOutletTemp: nextParams.evaporatorOutletTempBefore,
      compressorDischargeTemp: nextParams.compressorDischargeTempBefore,
      suctionPressure: nextParams.suctionPressureBefore,
      dischargePressure: nextParams.dischargePressureBefore,
      liquidLineTemp: nextParams.liquidLineTempBefore,
    });
    const after = calculateHVACThermodynamics({
      refrigerant,
      ambientTemp: nextParams.ambientTempAfter,
      roomTemp: nextParams.roomTempAfter,
      evaporatorOutletTemp: nextParams.evaporatorOutletTempAfter,
      compressorDischargeTemp: nextParams.compressorDischargeTempAfter,
      suctionPressure: nextParams.suctionPressureAfter,
      dischargePressure: nextParams.dischargePressureAfter,
      liquidLineTemp: nextParams.liquidLineTempAfter,
    });

    updateTechnicalParams({
      [field]: value,
      superheatBefore: before.superheat !== null ? String(before.superheat) : "",
      subcoolingBefore: before.subcooling !== null ? String(before.subcooling) : "",
      roomEvapDeltaBefore: before.roomEvapDelta !== null ? String(before.roomEvapDelta) : "",
      superheatAfter: after.superheat !== null ? String(after.superheat) : "",
      subcoolingAfter: after.subcooling !== null ? String(after.subcooling) : "",
      roomEvapDeltaAfter: after.roomEvapDelta !== null ? String(after.roomEvapDelta) : "",
      thermodynamicDiagnosis: after.hasSufficientData ? after.summaryDiagnosis : before.summaryDiagnosis,
    });
  }

  const diagnosis = calculateHVACThermodynamics({
    refrigerant,
    ambientTemp: params.ambientTempAfter,
    roomTemp: params.roomTempAfter,
    evaporatorOutletTemp: params.evaporatorOutletTempAfter,
    compressorDischargeTemp: params.compressorDischargeTempAfter,
    suctionPressure: params.suctionPressureAfter,
    dischargePressure: params.dischargePressureAfter,
    liquidLineTemp: params.liquidLineTempAfter,
  });

  return (
    <ScrollView className="px-4">
      {CALC_FIELDS.map((field) => (
        <View key={field.beforeKey} className="mb-2">
          <Text className="text-sm font-semibold mb-1">{field.label}</Text>
          <View className="flex-row">
            <LabeledInput testID={`param-${field.beforeKey}`} label="Antes" keyboardType="numeric" value={(params[field.beforeKey] as string) ?? ""} onChangeText={(v) => update(field.beforeKey, v)} />
            <LabeledInput testID={`param-${field.afterKey}`} label="Después" keyboardType="numeric" value={(params[field.afterKey] as string) ?? ""} onChangeText={(v) => update(field.afterKey, v)} />
          </View>
        </View>
      ))}

      <View className="mb-2 flex-row">
        <LabeledInput testID="param-voltageBefore" label="Voltaje Antes (V)" keyboardType="numeric" value={params.voltageBefore} onChangeText={(v) => update("voltageBefore", v)} />
        <LabeledInput testID="param-voltageAfter" label="Voltaje Después (V)" keyboardType="numeric" value={params.voltageAfter} onChangeText={(v) => update("voltageAfter", v)} />
      </View>
      <View className="mb-2 flex-row">
        <LabeledInput testID="param-currentBefore" label="Amperaje Antes (A)" keyboardType="numeric" value={params.currentBefore} onChangeText={(v) => update("currentBefore", v)} />
        <LabeledInput testID="param-currentAfter" label="Amperaje Después (A)" keyboardType="numeric" value={params.currentAfter} onChangeText={(v) => update("currentAfter", v)} />
      </View>
      <View className="mb-2 flex-row">
        <LabeledInput testID="param-powerBefore" label="Potencia Antes" value={params.powerBefore} onChangeText={(v) => update("powerBefore", v)} />
        <LabeledInput testID="param-powerAfter" label="Potencia Después" value={params.powerAfter} onChangeText={(v) => update("powerAfter", v)} />
      </View>

      <Text className="text-sm font-semibold mb-1">Filtro Secador — Antes</Text>
      <View className="flex-row mb-2">
        {DRYER_FILTER_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            testID={`dryer-filter-before-${option}`}
            className={`mr-2 px-3 py-2 rounded-full ${params.dryerFilterBefore === option ? "bg-blue-600" : "bg-neutral-200"}`}
            onPress={() => updateTechnicalParams({ dryerFilterBefore: option })}
          >
            <Text className={params.dryerFilterBefore === option ? "text-white" : "text-neutral-700"}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text className="text-sm font-semibold mb-1">Filtro Secador — Después</Text>
      <View className="flex-row mb-2">
        {DRYER_FILTER_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            testID={`dryer-filter-after-${option}`}
            className={`mr-2 px-3 py-2 rounded-full ${params.dryerFilterAfter === option ? "bg-blue-600" : "bg-neutral-200"}`}
            onPress={() => updateTechnicalParams({ dryerFilterAfter: option })}
          >
            <Text className={params.dryerFilterAfter === option ? "text-white" : "text-neutral-700"}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-sm font-semibold mb-1">¿Cambio de válvula?</Text>
      <View className="flex-row mb-2">
        {["No", "Sí"].map((option) => (
          <TouchableOpacity
            key={option}
            testID={`valve-change-${option}`}
            className={`mr-2 px-3 py-2 rounded-full ${params.valveChange === option ? "bg-blue-600" : "bg-neutral-200"}`}
            onPress={() => updateTechnicalParams({ valveChange: option })}
          >
            <Text className={params.valveChange === option ? "text-white" : "text-neutral-700"}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {params.valveChange === "Sí" ? (
        <TextInput
          testID="valve-change-details-input"
          className="border border-neutral-300 rounded-lg p-2 mb-2"
          placeholder="Detalle del cambio de válvula"
          value={params.valveChangeDetails}
          onChangeText={(v) => updateTechnicalParams({ valveChangeDetails: v })}
        />
      ) : null}

      {diagnosis.hasSufficientData ? (
        <View testID="thermodynamic-diagnosis" className="p-3 bg-sky-50 rounded-lg mb-4">
          <Text className="font-semibold">Diagnóstico automático</Text>
          <Text>{diagnosis.summaryDiagnosis}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
```

- [ ] **Step 2: Conectar el paso en `wizard.tsx` (último reemplazo de placeholder de este plan)**

```tsx
// src/app/(tabs)/service/wizard.tsx (agregar el import y ampliar StepBody)
import { Step6TechnicalParameters } from "../../../features/service/steps/Step6TechnicalParameters";

function StepBody({ step }: { step: number }) {
  if (step === 1) return <Step1VisitData />;
  if (step === 2) return <Step2CustomerData />;
  if (step === 3) return <Step3EquipmentData />;
  if (step === 4) return <Step4Photos />;
  if (step === 5) return <Step5Observations />;
  if (step === 6) return <Step6TechnicalParameters />;
  return <StepPlaceholder title={STEP_TITLES[step - 1]} />;
}
```

- [ ] **Step 3: Escribir la prueba**

Cada test que dependa de un valor calculado a partir de otro campo ya escrito arma ese campo directamente en `mockParams` dentro del test (en vez de encadenar dos `fireEvent` sobre el mismo render) — el store mockeado no es reactivo entre renders, así que dos `fireEvent` seguidos leerían ambos el mismo `params` inicial y el segundo pisaría el cálculo del primero:

```tsx
// src/features/service/steps/__tests__/Step6TechnicalParameters.test.tsx
import { render, screen, fireEvent } from "@testing-library/react-native";
import { createEmptyTechnicalParameters, createEmptyEquipmentData } from "../../../../shared/types/service";

let mockParams: ReturnType<typeof createEmptyTechnicalParameters>;
let mockEquipment: ReturnType<typeof createEmptyEquipmentData>;
const mockUpdateTechnicalParams = jest.fn();

jest.mock("../../useServiceWizardStore", () => ({
  useServiceWizardStore: (
    selector: (s: {
      draft: { technicalParams: typeof mockParams; equipment: typeof mockEquipment };
      updateTechnicalParams: typeof mockUpdateTechnicalParams;
    }) => unknown
  ) => selector({ draft: { technicalParams: mockParams, equipment: mockEquipment }, updateTechnicalParams: mockUpdateTechnicalParams }),
}));

import { Step6TechnicalParameters } from "../Step6TechnicalParameters";

beforeEach(() => {
  mockParams = createEmptyTechnicalParameters();
  mockEquipment = createEmptyEquipmentData();
  mockUpdateTechnicalParams.mockClear();
});

test("entering suction pressure computes superheat against the already-set outlet temperature", async () => {
  mockParams = { ...createEmptyTechnicalParameters(), evaporatorOutletTempBefore: "10" };
  await render(<Step6TechnicalParameters />);
  fireEvent.changeText(screen.getByTestId("param-suctionPressureBefore"), "118");
  expect(mockUpdateTechnicalParams).toHaveBeenCalledWith(
    expect.objectContaining({ suctionPressureBefore: "118", superheatBefore: "6.4" })
  );
});

test("selecting a dryer filter chip updates the value directly", async () => {
  await render(<Step6TechnicalParameters />);
  fireEvent.press(screen.getByTestId("dryer-filter-before-Regular"));
  expect(mockUpdateTechnicalParams).toHaveBeenCalledWith({ dryerFilterBefore: "Regular" });
});

test("choosing valve change Sí calls updateTechnicalParams with the new value", async () => {
  await render(<Step6TechnicalParameters />);
  fireEvent.press(screen.getByTestId("valve-change-Sí"));
  expect(mockUpdateTechnicalParams).toHaveBeenCalledWith({ valveChange: "Sí" });
});

test("shows the automatic diagnosis once enough 'después' readings are present", async () => {
  mockParams = { ...createEmptyTechnicalParameters(), roomTempAfter: "20", evaporatorOutletTempAfter: "10" };
  await render(<Step6TechnicalParameters />);
  expect(screen.getByTestId("thermodynamic-diagnosis")).toBeTruthy();
});
```

- [ ] **Step 4: Correr los tests**

Run: `npm test -- Step6TechnicalParameters.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Correr la suite completa y el type-check del proyecto**

Run: `npm run lint && npm test`
Expected: sin errores; toda la suite en PASS (confirma que los 6 pasos conectados en `wizard.tsx` no rompieron ninguna prueba anterior de este plan ni del plan de Fundación)

- [ ] **Step 6: Commit**

```bash
git add src/features/service/steps/Step6TechnicalParameters.tsx src/features/service/steps/__tests__/Step6TechnicalParameters.test.tsx src/app/\(tabs\)/service/wizard.tsx
git commit -m "feat: implement wizard step 6 (technical parameters with live thermodynamic diagnosis)"
```

---

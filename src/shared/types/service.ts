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

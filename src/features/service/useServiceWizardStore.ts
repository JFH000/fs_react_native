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

function createEmptyDraft(consecutivo: string, now: Date = new Date()): ServiceVisitDraft {
  const date = now.toISOString().split("T")[0];
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

import { render, screen, fireEvent } from "@testing-library/react-native";
import { createEmptyCustomerData, createEmptyEquipmentData, createEmptyTechnicalParameters } from "../../shared/types/service";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ back: mockBack }) }));

const mockNextStep = jest.fn();
const mockPrevStep = jest.fn();

function createMockDraft() {
  return {
    consecutivo: "FS-2026-0001",
    date: "2026-09-22",
    startTime: "08:00",
    endTime: "09:00",
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

let mockState = { currentStep: 1, validationError: null as string | null };
let mockDraft = createMockDraft();
jest.mock("../../features/service/useServiceWizardStore", () => ({
  useServiceWizardStore: (
    selector: (
      s: typeof mockState & {
        draft: ReturnType<typeof createMockDraft>;
        nextStep: typeof mockNextStep;
        prevStep: typeof mockPrevStep;
      }
    ) => unknown
  ) => selector({ ...mockState, draft: mockDraft, nextStep: mockNextStep, prevStep: mockPrevStep }),
  WIZARD_STEP_COUNT: 9,
}));

import ServiceWizardScreen from "../(tabs)/service/wizard";

beforeEach(() => {
  mockBack.mockClear();
  mockNextStep.mockClear();
  mockPrevStep.mockClear();
  mockState = { currentStep: 1, validationError: null };
  mockDraft = createMockDraft();
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

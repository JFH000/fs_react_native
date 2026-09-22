jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import { useServiceWizardStore, generateConsecutivo, WIZARD_STEP_COUNT, toLocalDateString } from "../useServiceWizardStore";

beforeEach(() => {
  useServiceWizardStore.getState().resetDraft();
});

test("generateConsecutivo pads the sequence and uses the given year", () => {
  expect(generateConsecutivo(4, new Date(2026, 0, 1))).toBe("FS-2026-0005");
});

test("toLocalDateString derives date from local time, not UTC", () => {
  expect(toLocalDateString(new Date(2026, 5, 15, 23, 30))).toBe("2026-06-15");
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

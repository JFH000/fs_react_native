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

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

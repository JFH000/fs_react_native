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

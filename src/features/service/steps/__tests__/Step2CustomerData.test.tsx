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

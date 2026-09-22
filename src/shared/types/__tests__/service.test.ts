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

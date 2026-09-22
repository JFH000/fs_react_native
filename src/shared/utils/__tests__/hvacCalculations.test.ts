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

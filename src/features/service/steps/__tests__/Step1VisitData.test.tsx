import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

let mockDraft = {
  consecutivo: "FS-2026-0001",
  date: "2026-09-22",
  startTime: "08:00",
  endTime: "09:00",
  gps: null as null | { latitude: number; longitude: number; accuracy?: number },
};
const mockSetDateTime = jest.fn();
const mockSetGps = jest.fn();
jest.mock("../../useServiceWizardStore", () => ({
  useServiceWizardStore: (selector: (s: { draft: typeof mockDraft; setDateTime: typeof mockSetDateTime; setGps: typeof mockSetGps }) => unknown) =>
    selector({ draft: mockDraft, setDateTime: mockSetDateTime, setGps: mockSetGps }),
}));

import * as Location from "expo-location";
import { Step1VisitData } from "../Step1VisitData";

beforeEach(() => {
  mockDraft = { consecutivo: "FS-2026-0001", date: "2026-09-22", startTime: "08:00", endTime: "09:00", gps: null };
  mockSetDateTime.mockClear();
  mockSetGps.mockClear();
  global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ display_name: "Calle Falsa 123" }) }) as never;
});

test("shows the auto-generated consecutivo", async () => {
  await render(<Step1VisitData />);
  expect(screen.getByTestId("consecutivo-display")).toHaveTextContent("FS-2026-0001");
});

test("editing the date field calls setDateTime", async () => {
  await render(<Step1VisitData />);
  fireEvent.changeText(screen.getByTestId("visit-date-input"), "2026-09-23");
  expect(mockSetDateTime).toHaveBeenCalledWith({ date: "2026-09-23" });
});

test("capturing location stores the real GPS coordinates on success", async () => {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
    coords: { latitude: 4.60971, longitude: -74.08175, accuracy: 12.3 },
  });
  await render(<Step1VisitData />);
  fireEvent.press(screen.getByTestId("capture-gps-button"));
  await waitFor(() =>
    expect(mockSetGps).toHaveBeenCalledWith({ latitude: 4.60971, longitude: -74.08175, accuracy: 12 })
  );
});

test("shows a real error and never fabricates coordinates when permission is denied", async () => {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
  await render(<Step1VisitData />);
  fireEvent.press(screen.getByTestId("capture-gps-button"));
  await waitFor(() => expect(screen.getByText(/Permiso de ubicación denegado/)).toBeTruthy());
  expect(mockSetGps).not.toHaveBeenCalled();
});

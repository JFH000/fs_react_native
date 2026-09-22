import { render, screen, fireEvent } from "@testing-library/react-native";

jest.mock("../../shared/lib/firebase", () => ({ auth: {}, db: {} }));
jest.mock("firebase/auth", () => ({ onAuthStateChanged: jest.fn() }));

const mockSubscribeVisits = jest.fn();
jest.mock("../../features/service/visitsRepository", () => ({
  subscribeVisits: (...args: unknown[]) => mockSubscribeVisits(...args),
}));

const mockStartNewVisit = jest.fn();
jest.mock("../../features/service/useServiceWizardStore", () => ({
  useServiceWizardStore: (selector: (s: { startNewVisit: typeof mockStartNewVisit }) => unknown) =>
    selector({ startNewVisit: mockStartNewVisit }),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));

import { useAuthStore } from "../../features/auth/useAuthStore";
import ServiceDashboardScreen from "../(tabs)/service/index";

beforeEach(() => {
  mockSubscribeVisits.mockReset().mockReturnValue(jest.fn());
  mockStartNewVisit.mockClear();
  mockPush.mockClear();
  useAuthStore.setState({ user: { uid: "uid-1" } as never, isLoading: false });
});

test("shows an empty state when there are no visits", async () => {
  await render(<ServiceDashboardScreen />);
  expect(screen.getByText("Todavía no hay visitas registradas.")).toBeTruthy();
});

test("renders visits delivered by subscribeVisits", async () => {
  mockSubscribeVisits.mockImplementation((_uid, callback) => {
    callback([{ id: "v1", consecutivo: "FS-2026-0001", status: "Completado", customer: { company: "Delta S.A." } }]);
    return jest.fn();
  });
  await render(<ServiceDashboardScreen />);
  expect(screen.getByText("FS-2026-0001")).toBeTruthy();
});

test("starting a new visit resets the wizard and navigates to it", async () => {
  await render(<ServiceDashboardScreen />);
  fireEvent.press(screen.getByTestId("new-visit-button"));
  expect(mockStartNewVisit).toHaveBeenCalledWith(0);
  expect(mockPush).toHaveBeenCalledWith("/(tabs)/service/wizard");
});

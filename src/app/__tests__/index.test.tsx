import { render } from "@testing-library/react-native";

jest.mock("../../shared/lib/firebase", () => ({ auth: {} }));
jest.mock("firebase/auth", () => ({ onAuthStateChanged: jest.fn() }));

const mockRedirect = jest.fn((_href: string) => null);
jest.mock("expo-router", () => ({
  Redirect: (props: { href: string }) => mockRedirect(props.href),
}));

import { useAuthStore } from "../../features/auth/useAuthStore";
import IndexScreen from "../index";

beforeEach(() => {
  mockRedirect.mockClear();
});

test("redirects to sign-in when there is no user", async () => {
  useAuthStore.setState({ user: null, isLoading: false });
  await render(<IndexScreen />);
  expect(mockRedirect).toHaveBeenCalledWith("/(auth)/sign-in");
});

test("redirects to the service tab when a user is present", async () => {
  useAuthStore.setState({ user: { uid: "uid-1" } as never, isLoading: false });
  await render(<IndexScreen />);
  expect(mockRedirect).toHaveBeenCalledWith("/(tabs)/service");
});

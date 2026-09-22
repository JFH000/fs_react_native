import { render } from "@testing-library/react-native";

jest.mock("../../shared/lib/firebase", () => ({ auth: {} }));
jest.mock("firebase/auth", () => ({ onAuthStateChanged: jest.fn() }));

const mockRedirect = jest.fn((_href: string) => null);
jest.mock("expo-router", () => ({
  Redirect: (props: { href: string }) => mockRedirect(props.href),
  Stack: () => null,
  Tabs: Object.assign(() => null, { Screen: () => null }),
}));

import { useAuthStore } from "../../features/auth/useAuthStore";
import TabsLayout from "../(tabs)/_layout";
import AuthLayout from "../(auth)/_layout";

beforeEach(() => {
  mockRedirect.mockClear();
});

test("tabs layout redirects to sign-in when there is no user", async () => {
  useAuthStore.setState({ user: null, isLoading: false });
  await render(<TabsLayout />);
  expect(mockRedirect).toHaveBeenCalledWith("/(auth)/sign-in");
});

test("auth layout redirects to the service tab when a user is present", async () => {
  useAuthStore.setState({ user: { uid: "uid-1" } as never, isLoading: false });
  await render(<AuthLayout />);
  expect(mockRedirect).toHaveBeenCalledWith("/(tabs)/service");
});

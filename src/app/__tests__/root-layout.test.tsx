import { render } from "@testing-library/react-native";
import { create } from "zustand";

jest.mock("expo-router", () => ({ Slot: () => null }));

const mockEnsureUserProfile = jest.fn((..._args: unknown[]) => Promise.resolve());
jest.mock("../../features/profile/profileRepository", () => ({
  ensureUserProfile: (...args: unknown[]) => mockEnsureUserProfile(...args),
}));

jest.mock("../../features/auth/useAuthStore", () => ({ useAuthStore: undefined }));

const mockAuthStore = create<{ user: unknown; isLoading: boolean }>(() => ({
  user: null,
  isLoading: false,
}));
jest.requireMock("../../features/auth/useAuthStore").useAuthStore = mockAuthStore;

import RootLayout from "../_layout";

beforeEach(() => {
  mockEnsureUserProfile.mockClear();
  mockAuthStore.setState({ user: null, isLoading: false });
});

test("does not create a profile while there is no user", async () => {
  await render(<RootLayout />);
  expect(mockEnsureUserProfile).not.toHaveBeenCalled();
});

test("ensures a profile once a user is present", async () => {
  const view = await render(<RootLayout />);
  mockAuthStore.setState({
    user: { uid: "uid-1", email: "tech@fsapp.com", providerData: [{ providerId: "google.com" }] },
    isLoading: false,
  });
  await view.rerender(<RootLayout />);
  expect(mockEnsureUserProfile).toHaveBeenCalledWith("uid-1", "tech@fsapp.com", "google");
});

let mockAuthStateCallback: (user: unknown) => void;

jest.mock("../../../shared/lib/firebase", () => ({ auth: {} }));
jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn((_auth, callback) => {
    mockAuthStateCallback = callback;
  }),
}));

import { useAuthStore } from "../useAuthStore";

test("starts in a loading state with no user", () => {
  expect(useAuthStore.getState().isLoading).toBe(true);
  expect(useAuthStore.getState().user).toBeNull();
});

test("updates the store when Firebase reports an auth state change", () => {
  const fakeUser = { uid: "uid-1" };
  mockAuthStateCallback(fakeUser);
  expect(useAuthStore.getState().isLoading).toBe(false);
  expect(useAuthStore.getState().user).toBe(fakeUser);
});

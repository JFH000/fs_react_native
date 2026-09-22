jest.mock("../../../shared/lib/firebase", () => ({ auth: { mocked: "auth" } }));
jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signInWithCredential: jest.fn(),
  signOut: jest.fn(),
  GoogleAuthProvider: { credential: jest.fn(() => ({ providerId: "google.com" })) },
  OAuthProvider: jest.fn().mockImplementation(() => ({
    credential: jest.fn(() => ({ providerId: "apple.com" })),
  })),
}));
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: { hasPlayServices: jest.fn(), signIn: jest.fn() },
}));
jest.mock("expo-apple-authentication", () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
} from "firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signInWithApple,
} from "../authService";

test("signUpWithEmail delegates to Firebase with the given credentials", async () => {
  await signUpWithEmail("tech@fsapp.com", "secret123");
  expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
    { mocked: "auth" },
    "tech@fsapp.com",
    "secret123"
  );
});

test("signInWithEmail delegates to Firebase with the given credentials", async () => {
  await signInWithEmail("tech@fsapp.com", "secret123");
  expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
    { mocked: "auth" },
    "tech@fsapp.com",
    "secret123"
  );
});

test("signInWithGoogle exchanges the Google idToken for a Firebase credential", async () => {
  (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
    type: "success",
    data: { idToken: "google-id-token" },
  });
  await signInWithGoogle();
  expect(signInWithCredential).toHaveBeenCalledWith(
    { mocked: "auth" },
    { providerId: "google.com" }
  );
});

test("signInWithGoogle throws if a completed sign-in does not return an idToken", async () => {
  (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
    type: "success",
    data: { idToken: null },
  });
  await expect(signInWithGoogle()).rejects.toThrow("idToken");
});

test("signInWithGoogle resolves to null when the user cancels the account picker", async () => {
  (GoogleSignin.signIn as jest.Mock).mockResolvedValue({ type: "cancelled", data: null });
  (signInWithCredential as jest.Mock).mockClear();
  await expect(signInWithGoogle()).resolves.toBeNull();
  expect(signInWithCredential).not.toHaveBeenCalled();
});

test("signInWithApple resolves to null when the user cancels the native dialog", async () => {
  (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValue(
    Object.assign(new Error("The user canceled the authorization attempt."), {
      code: "ERR_REQUEST_CANCELED",
    })
  );
  (signInWithCredential as jest.Mock).mockClear();
  await expect(signInWithApple()).resolves.toBeNull();
  expect(signInWithCredential).not.toHaveBeenCalled();
});

test("signInWithApple exchanges the Apple identityToken for a Firebase credential", async () => {
  (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
    identityToken: "apple-identity-token",
  });
  await signInWithApple();
  expect(signInWithCredential).toHaveBeenCalledWith(
    { mocked: "auth" },
    { providerId: "apple.com" }
  );
});

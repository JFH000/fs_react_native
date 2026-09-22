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
  (GoogleSignin.signIn as jest.Mock).mockResolvedValue({ idToken: "google-id-token" });
  await signInWithGoogle();
  expect(signInWithCredential).toHaveBeenCalledWith(
    { mocked: "auth" },
    { providerId: "google.com" }
  );
});

test("signInWithGoogle throws if Google does not return an idToken", async () => {
  (GoogleSignin.signIn as jest.Mock).mockResolvedValue({ idToken: null });
  await expect(signInWithGoogle()).rejects.toThrow("idToken");
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

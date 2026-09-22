jest.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {
        firebaseApiKey: "test-api-key",
        firebaseAuthDomain: "test-auth-domain",
        firebaseProjectId: "test-project-id",
        firebaseStorageBucket: "test-storage-bucket",
        firebaseMessagingSenderId: "test-sender-id",
        firebaseAppId: "test-app-id",
      },
    },
  },
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));
jest.mock("firebase/app", () => ({
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
  initializeApp: jest.fn(() => ({ name: "[DEFAULT]" })),
}));
jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({ mocked: "auth" })),
  initializeAuth: jest.fn(() => ({ mocked: "auth" })),
  getReactNativePersistence: jest.fn(),
}));
jest.mock("firebase/firestore", () => ({
  initializeFirestore: jest.fn(() => ({ mocked: "firestore" })),
  persistentLocalCache: jest.fn(),
}));
jest.mock("firebase/storage", () => ({
  getStorage: jest.fn(() => ({ mocked: "storage" })),
}));

import { app, auth, db, storage } from "../firebase";

test("initializes app, auth, firestore and storage", () => {
  expect(app).toBeDefined();
  expect(auth).toEqual({ mocked: "auth" });
  expect(db).toEqual({ mocked: "firestore" });
  expect(storage).toEqual({ mocked: "storage" });
});

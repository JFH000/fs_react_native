jest.mock("firebase/app", () => ({
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
  initializeApp: jest.fn(() => ({ name: "[DEFAULT]" })),
}));
jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({ mocked: "auth" })),
}));
jest.mock("firebase/firestore", () => ({
  initializeFirestore: jest.fn(() => ({ mocked: "firestore" })),
  persistentLocalCache: jest.fn(),
}));

import { app, auth, db } from "../firebase";

test("initializes app, auth and firestore", () => {
  expect(app).toBeDefined();
  expect(auth).toEqual({ mocked: "auth" });
  expect(db).toEqual({ mocked: "firestore" });
});

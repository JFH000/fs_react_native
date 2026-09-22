import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import fs from "fs";
import { ensureUserProfile } from "../../src/features/profile/profileRepository";

jest.mock("../../src/shared/lib/firebase", () => ({ db: undefined }));

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "fs-movil-test",
    firestore: { rules: fs.readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

test("creates a profile document on first login", async () => {
  const aliceDb = testEnv.authenticatedContext("alice").firestore();
  jest.requireMock("../../src/shared/lib/firebase").db = aliceDb;

  const profile = await ensureUserProfile("alice", "alice@example.com", "password");

  expect(profile.uid).toBe("alice");
  expect(profile.email).toBe("alice@example.com");
});

test("does not overwrite an existing profile document", async () => {
  const aliceDb = testEnv.authenticatedContext("alice").firestore();
  jest.requireMock("../../src/shared/lib/firebase").db = aliceDb;
  await setDoc(doc(aliceDb, "users/alice"), {
    uid: "alice",
    email: "alice@example.com",
    technicianName: "Alice Técnica",
  });

  const profile = await ensureUserProfile("alice", "alice@example.com", "password");

  expect(profile.technicianName).toBe("Alice Técnica");
});

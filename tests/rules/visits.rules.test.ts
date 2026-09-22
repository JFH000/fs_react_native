import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import fs from "fs";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "fs-movil-test-visits-rules",
    firestore: { rules: fs.readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

test("a user can create and read their own visit", async () => {
  const aliceDb = testEnv.authenticatedContext("alice").firestore();
  await assertSucceeds(setDoc(doc(aliceDb, "visits/visit-1"), { ownerId: "alice", consecutivo: "FS-2026-0001" }));
  await assertSucceeds(getDoc(doc(aliceDb, "visits/visit-1")));
});

test("a user cannot create a visit tagged with someone else's ownerId", async () => {
  const aliceDb = testEnv.authenticatedContext("alice").firestore();
  await assertFails(setDoc(doc(aliceDb, "visits/visit-1"), { ownerId: "bob", consecutivo: "FS-2026-0001" }));
});

test("another user cannot read someone else's visit", async () => {
  const aliceDb = testEnv.authenticatedContext("alice").firestore();
  const bobDb = testEnv.authenticatedContext("bob").firestore();
  await assertSucceeds(setDoc(doc(aliceDb, "visits/visit-1"), { ownerId: "alice", consecutivo: "FS-2026-0001" }));
  await assertFails(getDoc(doc(bobDb, "visits/visit-1")));
});

test("an unauthenticated request is denied", async () => {
  const anonDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anonDb, "visits/visit-1")));
});

test("a user cannot change the ownerId of their own visit on update", async () => {
  const aliceDb = testEnv.authenticatedContext("alice").firestore();
  await assertSucceeds(setDoc(doc(aliceDb, "visits/visit-1"), { ownerId: "alice", consecutivo: "FS-2026-0001" }));
  await assertFails(updateDoc(doc(aliceDb, "visits/visit-1"), { ownerId: "bob" }));
});

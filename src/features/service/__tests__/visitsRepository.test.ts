jest.mock("../../../shared/lib/firebase", () => ({ db: { mocked: "db" } }));

const mockUnsubscribe = jest.fn();
jest.mock("firebase/firestore", () => ({
  collection: jest.fn((_db, path) => ({ path })),
  doc: jest.fn((_db, path, id) => ({ path: `${path}/${id}` })),
  onSnapshot: jest.fn((_query, callback) => {
    callback({ docs: [{ data: () => ({ id: "visit-1", ownerId: "uid-1" }) }] });
    return mockUnsubscribe;
  }),
  query: jest.fn((collectionRef, whereClause) => ({ collectionRef, whereClause })),
  setDoc: jest.fn(),
  where: jest.fn((field, op, value) => ({ field, op, value })),
}));

import { doc, setDoc, where } from "firebase/firestore";
import { saveVisit, subscribeVisits } from "../visitsRepository";
import type { Visit } from "../../../shared/types/service";

const sampleVisit = { id: "visit-1", ownerId: "uid-1", consecutivo: "FS-2026-0001" } as Visit;

test("saveVisit writes the visit document by id", async () => {
  await saveVisit(sampleVisit);
  expect(doc).toHaveBeenCalledWith({ mocked: "db" }, "visits", "visit-1");
  expect(setDoc).toHaveBeenCalledWith({ path: "visits/visit-1" }, sampleVisit);
});

test("subscribeVisits queries by ownerId and forwards results", () => {
  const callback = jest.fn();
  const unsubscribe = subscribeVisits("uid-1", callback);
  expect(where).toHaveBeenCalledWith("ownerId", "==", "uid-1");
  expect(callback).toHaveBeenCalledWith([{ id: "visit-1", ownerId: "uid-1" }]);
  expect(unsubscribe).toBe(mockUnsubscribe);
});

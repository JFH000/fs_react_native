import { collection, doc, onSnapshot, query, setDoc, where, type Unsubscribe } from "firebase/firestore";
import { db } from "../../shared/lib/firebase";
import type { Visit } from "../../shared/types/service";

export function saveVisit(visit: Visit): Promise<void> {
  return setDoc(doc(db, "visits", visit.id), visit);
}

export function subscribeVisits(ownerId: string, callback: (visits: Visit[]) => void): Unsubscribe {
  const visitsQuery = query(collection(db, "visits"), where("ownerId", "==", ownerId));
  return onSnapshot(visitsQuery, (snapshot) => {
    callback(snapshot.docs.map((docSnapshot) => docSnapshot.data() as Visit));
  });
}

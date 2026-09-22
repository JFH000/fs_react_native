import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../shared/lib/firebase";
import { createEmptyUserProfile, type AuthProvider, type UserProfile } from "../../shared/types/user";

export async function ensureUserProfile(
  uid: string,
  email: string,
  authProvider: AuthProvider
): Promise<UserProfile> {
  const ref = doc(db, "users", uid);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    return snapshot.data() as UserProfile;
  }

  const profile = createEmptyUserProfile(uid, email, authProvider);
  await setDoc(ref, profile);
  return profile;
}

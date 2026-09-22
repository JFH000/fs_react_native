export type AuthProvider = "password" | "google" | "apple";

export interface UserProfile {
  uid: string;
  email: string;
  technicianName: string;
  phone: string;
  photoUrl: string | null;
  signatureUrl: string | null;
  autoSignReports: boolean;
  company: string;
  position: string;
  specialty: string;
  authProvider: AuthProvider;
  darkModeEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export function createEmptyUserProfile(
  uid: string,
  email: string,
  authProvider: AuthProvider
): UserProfile {
  const now = new Date().toISOString();
  return {
    uid,
    email,
    technicianName: "",
    phone: "",
    photoUrl: null,
    signatureUrl: null,
    autoSignReports: false,
    company: "",
    position: "",
    specialty: "",
    authProvider,
    darkModeEnabled: false,
    createdAt: now,
    updatedAt: now,
  };
}

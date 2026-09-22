import "../global.css";
import { useEffect } from "react";
import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "../features/auth/useAuthStore";
import { ensureUserProfile } from "../features/profile/profileRepository";
import type { AuthProvider } from "../shared/types/user";

function resolveAuthProvider(providerId: string | undefined): AuthProvider {
  if (providerId?.includes("google")) return "google";
  if (providerId?.includes("apple")) return "apple";
  return "password";
}

export default function RootLayout() {
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) return;
    const provider = resolveAuthProvider(user.providerData[0]?.providerId);
    void ensureUserProfile(user.uid, user.email ?? "", provider);
  }, [user]);

  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}

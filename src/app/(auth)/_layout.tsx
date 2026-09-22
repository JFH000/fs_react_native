import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "../../features/auth/useAuthStore";

export default function AuthLayout() {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return null;
  if (user) return <Redirect href="/(tabs)/service" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}

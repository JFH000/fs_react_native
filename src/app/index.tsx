import { Redirect } from "expo-router";
import { useAuthStore } from "../features/auth/useAuthStore";

export default function Index() {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return null;
  return <Redirect href={user ? "/(tabs)/service" : "/(auth)/sign-in"} />;
}

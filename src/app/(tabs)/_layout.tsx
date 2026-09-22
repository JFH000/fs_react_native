import { Redirect, Tabs } from "expo-router";
import { useAuthStore } from "../../features/auth/useAuthStore";

export default function TabsLayout() {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return null;
  if (!user) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="service" options={{ title: "Servicio" }} />
      <Tabs.Screen name="history" options={{ title: "Historial" }} />
      <Tabs.Screen name="parts" options={{ title: "Repuestos" }} />
      <Tabs.Screen name="ai" options={{ title: "IA" }} />
      <Tabs.Screen name="academy" options={{ title: "Academia" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
  );
}

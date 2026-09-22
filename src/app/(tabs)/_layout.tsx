import { Tabs } from "expo-router";

export default function TabsLayout() {
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

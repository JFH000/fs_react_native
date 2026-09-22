import { useEffect, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../../../shared/components/Screen";
import { useAuthStore } from "../../../features/auth/useAuthStore";
import { subscribeVisits } from "../../../features/service/visitsRepository";
import { useServiceWizardStore } from "../../../features/service/useServiceWizardStore";
import type { Visit } from "../../../shared/types/service";

export default function ServiceDashboardScreen() {
  const router = useRouter();
  const uid = useAuthStore((state) => state.user?.uid);
  const startNewVisit = useServiceWizardStore((state) => state.startNewVisit);
  const [visits, setVisits] = useState<Visit[]>([]);

  useEffect(() => {
    if (!uid) return;
    return subscribeVisits(uid, setVisits);
  }, [uid]);

  return (
    <Screen>
      <View className="flex-row items-center justify-between p-4">
        <Text className="text-2xl font-bold">Servicio</Text>
        <TouchableOpacity
          testID="new-visit-button"
          className="bg-blue-600 rounded-lg px-4 py-2"
          onPress={() => {
            startNewVisit(visits.length);
            router.push("/(tabs)/service/wizard");
          }}
        >
          <Text className="text-white font-semibold">Nueva visita</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        testID="visits-list"
        className="flex-1"
        data={visits}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text className="mx-4 text-neutral-500">Todavía no hay visitas registradas.</Text>}
        renderItem={({ item }) => (
          <View className="mx-4 mb-2 p-3 border border-neutral-200 rounded-lg">
            <Text className="font-semibold">{item.consecutivo}</Text>
            <Text className="text-neutral-500">{item.customer.company || "Sin cliente"} · {item.status}</Text>
          </View>
        )}
      />
    </Screen>
  );
}

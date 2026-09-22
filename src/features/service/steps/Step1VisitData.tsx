import { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Location from "expo-location";
import { useServiceWizardStore } from "../useServiceWizardStore";

export function Step1VisitData() {
  const draft = useServiceWizardStore((state) => state.draft);
  const setDateTime = useServiceWizardStore((state) => state.setDateTime);
  const setGps = useServiceWizardStore((state) => state.setGps);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  async function handleCaptureLocation() {
    setIsLocating(true);
    setLocationError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationError("Permiso de ubicación denegado. Puede continuar sin ubicación GPS.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const gps = {
        latitude: Number(position.coords.latitude.toFixed(5)),
        longitude: Number(position.coords.longitude.toFixed(5)),
        ...(typeof position.coords.accuracy === "number" && position.coords.accuracy > 0
          ? { accuracy: Math.round(position.coords.accuracy) }
          : {}),
      };
      setGps(gps);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${gps.latitude}&lon=${gps.longitude}`
        );
        const data = await response.json();
        setAddress(data?.display_name ?? null);
      } catch {
        setAddress(null);
      }
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : "No se pudo obtener la ubicación GPS.");
    } finally {
      setIsLocating(false);
    }
  }

  return (
    <View className="px-4">
      <Text testID="consecutivo-display" className="text-lg font-semibold mb-2">{draft.consecutivo}</Text>
      <Text className="text-sm text-neutral-500">Fecha</Text>
      <TextInput
        testID="visit-date-input"
        className="mb-2 border border-neutral-300 rounded-lg p-3"
        value={draft.date}
        onChangeText={(date) => setDateTime({ date })}
      />
      <View className="flex-row mb-2">
        <View className="flex-1 mr-2">
          <Text className="text-sm text-neutral-500">Hora inicio</Text>
          <TextInput
            testID="visit-start-time-input"
            className="border border-neutral-300 rounded-lg p-3"
            value={draft.startTime}
            onChangeText={(startTime) => setDateTime({ startTime })}
          />
        </View>
        <View className="flex-1">
          <Text className="text-sm text-neutral-500">Hora fin</Text>
          <TextInput
            testID="visit-end-time-input"
            className="border border-neutral-300 rounded-lg p-3"
            value={draft.endTime}
            onChangeText={(endTime) => setDateTime({ endTime })}
          />
        </View>
      </View>

      <TouchableOpacity
        testID="capture-gps-button"
        className="bg-neutral-200 rounded-lg p-3 mb-2"
        onPress={handleCaptureLocation}
        disabled={isLocating}
      >
        {isLocating ? <ActivityIndicator /> : <Text className="text-center font-semibold">Capturar ubicación GPS</Text>}
      </TouchableOpacity>
      {locationError ? <Text className="text-red-600 mb-2">{locationError}</Text> : null}
      {draft.gps ? (
        <Text testID="gps-result" className="text-neutral-600 mb-2">
          {address ?? `${draft.gps.latitude}, ${draft.gps.longitude}`} (±{draft.gps.accuracy ?? "?"}m)
        </Text>
      ) : null}
    </View>
  );
}

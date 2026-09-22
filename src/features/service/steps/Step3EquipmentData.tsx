import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useServiceWizardStore } from "../useServiceWizardStore";
import { REFRIGERANTS_DATABASE } from "../../../shared/utils/hvacCalculations";

const ZONE_PRESETS = [
  "Azotea / Techo Técnico",
  "Piso 1 - Cuarto de Máquinas",
  "Sótano 1 - Chiller Plant",
  "Nivel 4 - Sala de Servidores",
  "Cuarto Manejadoras (UMA)",
  "Paseo Exterior - Condensadores",
];

export function Step3EquipmentData() {
  const equipment = useServiceWizardStore((state) => state.draft.equipment);
  const updateEquipment = useServiceWizardStore((state) => state.updateEquipment);

  return (
    <ScrollView className="flex-1 px-4">
      <TextInput testID="equipment-type-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Tipo de equipo" value={equipment.type} onChangeText={(type) => updateEquipment({ type })} />
      <TextInput testID="equipment-brand-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Marca" value={equipment.brand} onChangeText={(brand) => updateEquipment({ brand })} />
      <TextInput testID="equipment-model-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Modelo" value={equipment.model} onChangeText={(model) => updateEquipment({ model })} />
      <TextInput testID="equipment-serial-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Número de serie" value={equipment.serial} onChangeText={(serial) => updateEquipment({ serial })} />
      <TextInput testID="equipment-capacity-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Capacidad" value={equipment.capacity} onChangeText={(capacity) => updateEquipment({ capacity })} />

      <Text className="mb-1 font-semibold">Refrigerante</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
        {Object.keys(REFRIGERANTS_DATABASE).map((key) => (
          <TouchableOpacity
            key={key}
            testID={`refrigerant-chip-${key}`}
            className={`mr-2 px-3 py-2 rounded-full ${equipment.refrigerant === key ? "bg-blue-600" : "bg-neutral-200"}`}
            onPress={() => updateEquipment({ refrigerant: key })}
          >
            <Text className={equipment.refrigerant === key ? "text-white" : "text-neutral-700"}>{key}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text className="mb-1 font-semibold">Ubicación</Text>
      <TextInput testID="equipment-location-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Ubicación específica" value={equipment.location} onChangeText={(location) => updateEquipment({ location })} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
        {ZONE_PRESETS.map((zone) => (
          <TouchableOpacity key={zone} className="mr-2 px-3 py-2 rounded-full bg-neutral-200" onPress={() => updateEquipment({ location: zone })}>
            <Text className="text-neutral-700">{zone}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ScrollView>
  );
}

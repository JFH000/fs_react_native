import { TextInput, View } from "react-native";
import { useServiceWizardStore } from "../useServiceWizardStore";

export function Step5Observations() {
  const observations = useServiceWizardStore((state) => state.draft.observations);
  const setObservations = useServiceWizardStore((state) => state.setObservations);

  return (
    <View className="px-4">
      <TextInput
        testID="observations-input"
        className="border border-neutral-300 rounded-lg p-3 h-40"
        placeholder="Describa el diagnóstico y las observaciones técnicas del mantenimiento..."
        multiline
        textAlignVertical="top"
        value={observations}
        onChangeText={setObservations}
      />
    </View>
  );
}

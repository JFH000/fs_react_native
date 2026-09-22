import { Text, View } from "react-native";

export function StepPlaceholder({ title }: { title: string }) {
  return (
    <View className="p-4">
      <Text className="text-neutral-500">{title} — próximamente</Text>
    </View>
  );
}

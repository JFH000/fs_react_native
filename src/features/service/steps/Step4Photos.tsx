import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useServiceWizardStore } from "../useServiceWizardStore";
import { PHOTO_SLOTS, type PhotoSlot } from "../photoSlots";

type PhotoSlotCategory = PhotoSlot["category"];

export function Step4Photos() {
  const photos = useServiceWizardStore((state) => state.draft.photos);
  const addPhoto = useServiceWizardStore((state) => state.addPhoto);

  async function handleCapture(slotKey: string, category: PhotoSlotCategory) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    const existing = photos.find((p) => p.id === `photo-${slotKey}`);
    addPhoto({ id: `photo-${slotKey}`, url: result.assets[0].uri, category, comment: existing?.comment ?? "" });
  }

  function handleComment(slotKey: string, category: PhotoSlotCategory, comment: string) {
    const existing = photos.find((p) => p.id === `photo-${slotKey}`);
    addPhoto({ id: `photo-${slotKey}`, url: existing?.url ?? "", category, comment });
  }

  return (
    <ScrollView className="px-4">
      {PHOTO_SLOTS.map((slot) => {
        const photo = photos.find((p) => p.id === `photo-${slot.key}`);
        return (
          <View key={slot.key} className="mb-4 border border-neutral-200 rounded-lg p-3">
            <Text className="font-semibold">{slot.label}</Text>
            <Text className="text-neutral-500 mb-2">{slot.description}</Text>
            {photo?.url ? (
              <Image testID={`photo-preview-${slot.key}`} source={{ uri: photo.url }} className="w-full h-40 rounded-lg mb-2" />
            ) : null}
            <TouchableOpacity
              testID={`capture-button-${slot.key}`}
              className="bg-neutral-200 rounded-lg p-2 mb-2"
              onPress={() => handleCapture(slot.key, slot.category)}
            >
              <Text className="text-center">{photo?.url ? "Volver a tomar" : "Tomar foto"}</Text>
            </TouchableOpacity>
            <TextInput
              testID={`photo-comment-${slot.key}`}
              className="border border-neutral-300 rounded-lg p-2"
              placeholder={slot.placeholderComment}
              value={photo?.comment ?? ""}
              onChangeText={(comment) => handleComment(slot.key, slot.category, comment)}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

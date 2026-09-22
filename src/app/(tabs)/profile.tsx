import { Text, TouchableOpacity } from "react-native";
import { Screen } from "../../shared/components/Screen";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { signOutUser } from "../../features/auth/authService";

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);

  return (
    <Screen>
      <Text className="text-lg font-semibold p-4">{user?.email}</Text>
      <TouchableOpacity
        testID="sign-out-button"
        className="mx-4 bg-neutral-200 rounded-lg p-3"
        onPress={() => signOutUser()}
      >
        <Text className="text-center font-semibold">Cerrar sesión</Text>
      </TouchableOpacity>
    </Screen>
  );
}

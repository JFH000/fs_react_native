import { useState } from "react";
import { Text, TextInput, TouchableOpacity } from "react-native";
import { Screen } from "../../shared/components/Screen";
import { signUpWithEmail } from "../../features/auth/authService";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSignUp() {
    setError(null);
    try {
      await signUpWithEmail(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta");
    }
  }

  return (
    <Screen>
      <Text className="text-2xl font-bold p-4">Crear cuenta</Text>
      <TextInput
        testID="email-input"
        className="mx-4 mb-2 border border-neutral-300 rounded-lg p-3"
        placeholder="Correo electrónico"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        testID="password-input"
        className="mx-4 mb-2 border border-neutral-300 rounded-lg p-3"
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text className="mx-4 mb-2 text-red-600">{error}</Text> : null}
      <TouchableOpacity
        testID="sign-up-button"
        className="mx-4 mb-2 bg-blue-600 rounded-lg p-3"
        onPress={handleSignUp}
      >
        <Text className="text-white text-center font-semibold">Registrarme</Text>
      </TouchableOpacity>
    </Screen>
  );
}

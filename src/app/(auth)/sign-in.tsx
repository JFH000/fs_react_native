import { useState } from "react";
import { Platform, Text, TextInput, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import { Screen } from "../../shared/components/Screen";
import { signInWithEmail, signInWithGoogle, signInWithApple } from "../../features/auth/authService";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleEmailSignIn() {
    setError(null);
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    }
  }

  return (
    <Screen>
      <Text className="text-2xl font-bold p-4">Iniciar sesión</Text>
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
        testID="email-sign-in-button"
        className="mx-4 mb-2 bg-blue-600 rounded-lg p-3"
        onPress={handleEmailSignIn}
      >
        <Text className="text-white text-center font-semibold">Entrar</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="google-sign-in-button"
        className="mx-4 mb-2 bg-neutral-100 rounded-lg p-3"
        onPress={() => signInWithGoogle().catch((err) => setError(err.message))}
      >
        <Text className="text-center font-semibold">Continuar con Google</Text>
      </TouchableOpacity>
      {Platform.OS === "ios" ? (
        <TouchableOpacity
          testID="apple-sign-in-button"
          className="mx-4 mb-2 bg-black rounded-lg p-3"
          onPress={() => signInWithApple().catch((err) => setError(err.message))}
        >
          <Text className="text-white text-center font-semibold">Continuar con Apple</Text>
        </TouchableOpacity>
      ) : null}
      <Link href="/(auth)/sign-up" className="mx-4 text-center text-blue-600">
        Crear una cuenta nueva
      </Link>
    </Screen>
  );
}

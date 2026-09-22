import "dotenv/config";
import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const expoConfig = {
    ...config,
    extra: {
      ...config.extra,
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
    },
    plugins: [
      ...(config.plugins ?? []),
      "@react-native-google-signin/google-signin",
      "expo-apple-authentication",
      [
        "expo-location",
        { locationWhenInUsePermission: "FS App necesita tu ubicación para registrar dónde se realizó el servicio." },
      ],
      [
        "expo-image-picker",
        { cameraPermission: "FS App necesita acceso a la cámara para fotografiar evidencias de servicio." },
      ],
    ],
  } as ExpoConfig;
  return expoConfig;
};

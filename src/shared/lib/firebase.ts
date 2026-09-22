import Constants from "expo-constants";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const extra = Constants.expoConfig?.extra ?? {};

const firebaseConfig = {
  apiKey: extra.firebaseApiKey as string,
  authDomain: extra.firebaseAuthDomain as string,
  projectId: extra.firebaseProjectId as string,
  storageBucket: extra.firebaseStorageBucket as string,
  messagingSenderId: extra.firebaseMessagingSenderId as string,
  appId: extra.firebaseAppId as string,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});

export const storage = getStorage(app);

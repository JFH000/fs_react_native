import Constants from "expo-constants";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";

const extra = Constants.expoConfig?.extra ?? {};

const firebaseConfig = {
  apiKey: extra.firebaseApiKey as string,
  authDomain: extra.firebaseAuthDomain as string,
  projectId: extra.firebaseProjectId as string,
  messagingSenderId: extra.firebaseMessagingSenderId as string,
  appId: extra.firebaseAppId as string,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});

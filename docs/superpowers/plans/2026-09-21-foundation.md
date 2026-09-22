# Fundación (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levantar el proyecto Expo de fs_movil con navegación, estilos, y autenticación real (email/password, Google, Apple) contra un proyecto Firebase nuevo y separado, con el modelo de datos y las reglas de seguridad del perfil de usuario ya funcionando de punta a punta.

**Architecture:** Proyecto Expo (managed workflow) con Expo Router para navegación basada en archivos, NativeWind para estilos, Zustand para estado de auth, y Firebase (Auth + Firestore + Storage) con persistencia offline del SDK. Estructura por features (`src/features/*`) y utilidades compartidas (`src/shared/*`), separada de las rutas de Expo Router (`src/app/*`).

**Tech Stack:** Expo SDK (managed), TypeScript, Expo Router, NativeWind + Tailwind CSS, Zustand, Firebase JS SDK (`firebase` v10+), `@react-native-google-signin/google-signin`, `expo-apple-authentication`, Jest (`jest-expo` preset) + `@testing-library/react-native`, `@firebase/rules-unit-testing` + Firebase Emulator Suite para las reglas.

**Spec:** `docs/superpowers/specs/2026-09-21-fs-app-mobile-port-design.md`

## Global Constraints

- Expo managed workflow — sin eject a bare React Native.
- NativeWind para todo el styling (no StyleSheet plano salvo casos que NativeWind no cubra).
- Expo Router para toda la navegación (rutas basadas en archivos bajo `src/app/`).
- Zustand para estado de UI por feature; Firestore (`onSnapshot`) es la fuente de verdad para datos remotos, no estado local duplicado.
- Firestore debe inicializarse con `persistentLocalCache` (offline habilitado desde el día uno).
- El proyecto Firebase de fs_movil es **nuevo y separado** del proyecto Firebase de fsapp — no se reutilizan credenciales ni datos.
- Métodos de autenticación permitidos: email/password (con verificación real de contraseña), Google Sign-In, Sign in with Apple. Ningún otro proveedor social.
- El `docId` de cualquier documento propiedad de un usuario es siempre `request.auth.uid` de Firebase Auth, sin excepción.
- Ninguna colección de Firestore/Storage se usa desde la app sin tener antes reglas de seguridad reales que exigan `request.auth.uid` (no `allow read, write: if true`).

---

### Task 1: Scaffold del proyecto Expo con TypeScript y testing

**Files:**
- Create: todo lo generado por `create-expo-app` (`src/app/`, `assets/`, `package.json`, `tsconfig.json`, `app.json`, etc.)
- Modify: `package.json` (scripts de test y lint)
- Test: `src/shared/__tests__/sanity.test.ts`

**Interfaces:**
- Produces: script `npm test` (Jest) y `npm run lint` (`tsc --noEmit`) disponibles para todas las tareas siguientes.

- [ ] **Step 1: Generar el proyecto Expo en el directorio actual**

```bash
npx create-expo-app@latest . --template default
```

Si pregunta por confirmar que el directorio no está vacío (ya existen `README.md` y `.git`), confirmar que sí continúe.

- [ ] **Step 2: Instalar dependencias de testing**

`jest-expo` está pineado a la versión del SDK de Expo, así que se instala con `expo install`; el resto son dependencias de desarrollo normales:

```bash
npx expo install jest-expo
npm install --save-dev jest @testing-library/react-native @types/jest
```

- [ ] **Step 3: Configurar Jest en `package.json`**

```json
{
  "scripts": {
    "test": "jest",
    "lint": "tsc --noEmit"
  },
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
    ]
  }
}
```

- [ ] **Step 4: Escribir una prueba de humo**

```ts
// src/shared/__tests__/sanity.test.ts
describe('project setup', () => {
  it('runs tests', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Correr los tests y verificar que pasan**

Run: `npm test`
Expected: 1 suite, 1 test, PASS

- [ ] **Step 6: Correr el type-check**

Run: `npm run lint`
Expected: sin errores

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Expo project with TypeScript and Jest"
```

---

### Task 2: Configurar NativeWind

**Files:**
- Create: `tailwind.config.js`, `babel.config.js`, `metro.config.js` (el scaffold de Task 1 no generó estos dos — el SDK actual de Expo no los requiere hasta que algo como NativeWind los necesita)
- Modify: `src/global.css` (Task 1 ya generó uno con variables de fuente para web — se reemplaza por las directivas de Tailwind), `src/app/_layout.tsx`
- Test: `src/shared/components/__tests__/Screen.test.tsx`

**Interfaces:**
- Produces: componente `src/shared/components/Screen.tsx` (`<Screen>` — wrapper con `className` de NativeWind), usable por cualquier pantalla futura.

- [ ] **Step 1: Instalar NativeWind y Tailwind**

```bash
npx expo install nativewind tailwindcss react-native-reanimated react-native-safe-area-context
```

- [ ] **Step 2: Inicializar Tailwind**

```bash
npx tailwindcss init
```

```js
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 3: Reemplazar el contenido de `src/global.css` por las directivas de Tailwind**

Task 1 generó `src/global.css` con variables de fuente para la variante web del scaffold — se reemplaza por completo, ya no se necesitan esas variables:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Configurar Babel y Metro**

```js
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
  };
};
```

```js
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./src/global.css" });
```

- [ ] **Step 5: Declarar los tipos de NativeWind para que `className` type-checke en componentes RN**

Sin esto, `tsc --noEmit` falla en cualquier componente que use `className` (TypeScript no conoce esa prop en los componentes de React Native):

```ts
// nativewind-env.d.ts (en la raíz del proyecto)
/// <reference types="nativewind/types" />
```

- [ ] **Step 6: Escribir el componente `Screen` con NativeWind**

```tsx
// src/shared/components/Screen.tsx
import { SafeAreaView } from "react-native-safe-area-context";
import type { PropsWithChildren } from "react";

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900" testID="screen-root">
      {children}
    </SafeAreaView>
  );
}
```

- [ ] **Step 7: Escribir la prueba**

`@testing-library/react-native` (la versión instalada en Task 1, v14) tiene `render()` async — hay que usar `await`:

```tsx
// src/shared/components/__tests__/Screen.test.tsx
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { Screen } from "../Screen";

test("renders its children inside the safe area", async () => {
  await render(
    <Screen>
      <Text>contenido</Text>
    </Screen>
  );
  expect(screen.getByText("contenido")).toBeTruthy();
  expect(screen.getByTestId("screen-root")).toBeTruthy();
});
```

- [ ] **Step 8: Importar `global.css` en el layout raíz y envolverlo en `SafeAreaProvider`**

`SafeAreaView` de `react-native-safe-area-context` necesita un `SafeAreaProvider` ancestro para calcular los insets correctamente en dispositivos con notch/isla dinámica — sin él, `Screen` funcionaría mal en el dispositivo real aunque su prueba unitaria pase. Después de la limpieza de Task 1, `src/app/_layout.tsx` es un `RootLayout` mínimo (`return <Slot />;`) — envolver ese `<Slot />` en `<SafeAreaProvider>`:

```tsx
// src/app/_layout.tsx
import "../global.css";
import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 8: Correr los tests**

Run: `npm test -- Screen.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: configure NativeWind and add Screen wrapper component"
```

---

### Task 3: Estructura de carpetas y shell de navegación (tabs vacíos)

**Files:**
- Create: `src/app/(auth)/sign-in.tsx`, `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/service.tsx`, `src/app/(tabs)/history.tsx`, `src/app/(tabs)/parts.tsx`, `src/app/(tabs)/ai.tsx`, `src/app/(tabs)/academy.tsx`, `src/app/(tabs)/profile.tsx`
- Create: `src/features/{auth,service,history,parts,ai,academy,profile,notifications}/.gitkeep`
- Create: `src/shared/types/.gitkeep`, `src/shared/utils/.gitkeep`, `src/shared/lib/.gitkeep`
- Test: `src/app/__tests__/tabs-layout.test.tsx`

**Interfaces:**
- Produces: 6 rutas de tabs navegables (`/(tabs)/service`, `/(tabs)/history`, `/(tabs)/parts`, `/(tabs)/ai`, `/(tabs)/academy`, `/(tabs)/profile`), cada una con un placeholder de texto.

- [ ] **Step 1: Crear las carpetas de features y shared (con `.gitkeep` para que git las trackee vacías)**

```bash
mkdir -p src/features/auth src/features/service src/features/history src/features/parts src/features/ai src/features/academy src/features/profile src/features/notifications
mkdir -p src/shared/types src/shared/utils src/shared/lib
touch src/features/auth/.gitkeep src/features/service/.gitkeep src/features/history/.gitkeep src/features/parts/.gitkeep src/features/ai/.gitkeep src/features/academy/.gitkeep src/features/profile/.gitkeep src/features/notifications/.gitkeep
touch src/shared/types/.gitkeep src/shared/utils/.gitkeep src/shared/lib/.gitkeep
```

- [ ] **Step 2: Crear las 6 pantallas placeholder**

```tsx
// src/app/(tabs)/service.tsx (repetir el patrón para history.tsx, parts.tsx, ai.tsx, academy.tsx, profile.tsx cambiando el texto)
import { Text } from "react-native";
import { Screen } from "../../shared/components/Screen";

export default function ServiceScreen() {
  return (
    <Screen>
      <Text className="text-lg font-semibold p-4">Servicio — próximamente</Text>
    </Screen>
  );
}
```

Repetir para `history.tsx` ("Historial — próximamente"), `parts.tsx` ("Repuestos — próximamente"), `ai.tsx` ("Asistente IA — próximamente"), `academy.tsx` ("Academia — próximamente"), `profile.tsx` ("Perfil — próximamente").

- [ ] **Step 3: Crear el layout de tabs (sin guardas de auth todavía — se agregan en Task 8)**

```tsx
// src/app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="service" options={{ title: "Servicio" }} />
      <Tabs.Screen name="history" options={{ title: "Historial" }} />
      <Tabs.Screen name="parts" options={{ title: "Repuestos" }} />
      <Tabs.Screen name="ai" options={{ title: "IA" }} />
      <Tabs.Screen name="academy" options={{ title: "Academia" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
  );
}
```

- [ ] **Step 4: Crear un placeholder de sign-in (se implementa de verdad en Task 9)**

```tsx
// src/app/(auth)/sign-in.tsx
import { Text } from "react-native";
import { Screen } from "../../shared/components/Screen";

export default function SignInScreen() {
  return (
    <Screen>
      <Text className="text-lg font-semibold p-4">Iniciar sesión — próximamente</Text>
    </Screen>
  );
}
```

- [ ] **Step 5: Escribir una prueba que verifique que las 6 tabs están declaradas**

`Tabs`/`Tabs.Screen` de `expo-router` esperan estar montados dentro del árbol de navegación real del router (no se pueden renderizar de forma aislada con `render()` de forma confiable). Por eso la prueba mockea `expo-router` con componentes livianos que solo registran sus props, en vez de renderizar el navegador real:

Nota: `jest.mock()` se hoistea por encima de los imports, así que su factory no puede referenciar el `Text` importado arriba — hay que `require`-arlo adentro de la propia factory:

```tsx
// src/app/__tests__/tabs-layout.test.tsx
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react-native";

jest.mock("expo-router", () => {
  const { Text } = require("react-native");
  return {
    Tabs: Object.assign(
      ({ children }: { children: ReactNode }) => <>{children}</>,
      { Screen: ({ options }: { options: { title: string } }) => <Text>{options.title}</Text> }
    ),
  };
});

import TabsLayout from "../(tabs)/_layout";

test("declares all six business module tabs", async () => {
  await render(<TabsLayout />);
  for (const title of ["Servicio", "Historial", "Repuestos", "IA", "Academia", "Perfil"]) {
    expect(screen.getByText(title)).toBeTruthy();
  }
});
```

**Nota para Task 8**: cuando esa tarea agregue una guarda de autenticación a `src/app/(tabs)/_layout.tsx`, debe actualizar este mismo archivo de prueba (ver el paso correspondiente en Task 8) para que el mock de `useAuthStore` refleje un usuario autenticado — si no, esta prueba pasa a fallar porque el componente devolvería `null` antes de llegar a los tabs.

- [ ] **Step 6: Correr los tests**

Run: `npm test -- tabs-layout.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold feature folders and placeholder tab screens"
```

---

### Task 4: Crear el proyecto Firebase e inicializar el SDK

**Files:**
- Create: `app.config.ts`, `.env.example`, `src/shared/lib/firebase.ts`
- Modify: `.gitignore` (agregar `.env`)
- Test: `src/shared/lib/__tests__/firebase.test.ts`

**Interfaces:**
- Produces: `import { app, auth, db, storage } from "src/shared/lib/firebase"` — usado por toda tarea futura que hable con Firebase.

- [ ] **Step 1 (usuario, no el implementador): crear el proyecto Firebase (nuevo, separado del de fsapp)**

Este paso requiere una cuenta de Google real y acceso a la consola web — ningún agente automatizado puede hacerlo. Lo hace el usuario, en paralelo a que el resto de esta tarea avanza como código:

```bash
npx firebase-tools login
npx firebase-tools projects:create fs-movil-app --display-name "FS App Movil"
```

Desde la consola de Firebase (console.firebase.google.com), sobre el proyecto recién creado:
- Habilitar **Authentication** con los proveedores Email/Password, Google, y Apple.
- Habilitar **Firestore** (modo producción, cualquier región).
- Habilitar **Storage**.
- Registrar una app iOS y una app Android, descargar `GoogleService-Info.plist` y `google-services.json`, y copiar los valores de configuración web (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId) para llenar el `.env` local (Step 3).

El implementador de esta tarea NO ejecuta este paso — solo construye Steps 2-8 (SDK, `app.config.ts`, `firebase.ts`, test con mocks), que no requieren un proyecto real todavía porque `.env` no se commitea y el test mockea el SDK completo.

- [ ] **Step 2: Instalar el SDK de Firebase y AsyncStorage**

```bash
npx expo install firebase @react-native-async-storage/async-storage
```

- [ ] **Step 3: Declarar las variables de entorno**

```
# .env.example
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
```

Copiar a `.env` con los valores reales del proyecto creado en el Step 1, y agregar `.env` a `.gitignore`.

- [ ] **Step 4: Exponer las variables vía `app.config.ts` (extendiendo el `app.json` generado en Task 1, sin reemplazarlo)**

```ts
// app.config.ts
import "dotenv/config";
import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  extra: {
    ...config.extra,
    firebaseApiKey: process.env.FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: process.env.FIREBASE_APP_ID,
  },
});
```

Cuando existen ambos `app.json` y `app.config.ts`, Expo pasa el contenido de `app.json` como `config` y usa el resultado de esta función — así se conservan `name`, `slug`, `icon`, `splash`, etc. que generó el scaffold de Task 1.

- [ ] **Step 5: Escribir `src/shared/lib/firebase.ts`**

El SDK de Firebase (v10.11+, incluida la versión instalada en Task 4) detecta automáticamente React Native + `@react-native-async-storage/async-storage` (ya instalado en Step 2) y persiste la sesión sin configuración explícita — `getAuth(app)` alcanza, no hace falta el patrón antiguo de `initializeAuth`/`getReactNativePersistence` (que además no existe como export público en `firebase/auth` en esta versión):

```ts
// src/shared/lib/firebase.ts
import Constants from "expo-constants";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";

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

export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});

export const storage = getStorage(app);
```

- [ ] **Step 6: Escribir la prueba**

```ts
// src/shared/lib/__tests__/firebase.test.ts
jest.mock("firebase/app", () => ({
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
  initializeApp: jest.fn(() => ({ name: "[DEFAULT]" })),
}));
jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({ mocked: "auth" })),
}));
jest.mock("firebase/firestore", () => ({
  initializeFirestore: jest.fn(() => ({ mocked: "firestore" })),
  persistentLocalCache: jest.fn(),
}));
jest.mock("firebase/storage", () => ({
  getStorage: jest.fn(() => ({ mocked: "storage" })),
}));

import { app, auth, db, storage } from "../firebase";

test("initializes app, auth, firestore and storage", () => {
  expect(app).toBeDefined();
  expect(auth).toEqual({ mocked: "auth" });
  expect(db).toEqual({ mocked: "firestore" });
  expect(storage).toEqual({ mocked: "storage" });
});
```

- [ ] **Step 7: Correr los tests**

Run: `npm test -- firebase.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: initialize Firebase SDK against the new fs_movil project"
```

(`.env` no se commitea — solo `.env.example`.)

---

### Task 5: Reglas de seguridad para `users/{uid}` + pruebas con el emulador

**Files:**
- Create: `firestore.rules`, `storage.rules`, `firebase.json`
- Modify: `package.json` (separar la config de Jest en "projects")
- Test: `tests/rules/firestore.rules.test.ts`

**Interfaces:**
- Consumes: ninguno de tareas anteriores.
- Produces: reglas desplegables (`firebase deploy --only firestore:rules,storage:rules`) que toda tarea futura que agregue colecciones debe extender, nunca debilitar. También produce la convención de que **todo test que hable con el emulador de Firebase vive bajo `tests/`**, nunca bajo `src/**/__tests__/` — las tareas futuras que agreguen ese tipo de test (ej. Task 10) deben seguir esa convención.

- [ ] **Step 1: Instalar las dependencias del emulador**

```bash
npm install --save-dev @firebase/rules-unit-testing
```

- [ ] **Step 1b: Separar la config de Jest en "projects" (RN vs. Node puro)**

`@firebase/rules-unit-testing` no carga bajo el preset `jest-expo`: ese preset fuerza `customExportConditions: ["require", "react-native"]`, lo que hace que la resolución de paquetes de `firebase`/`@firebase` caiga en sus builds ESM (pensados para bundlers, no para el `require` de Jest) y explote con `SyntaxError: Cannot use import statement outside a module`. La solución es correr los tests que hablan con el emulador en un proyecto de Jest aparte, en entorno Node plano (sin esas condiciones custom), separado por carpeta: todo lo que vive bajo `src/**/__tests__/` usa `jest-expo` (componentes/hooks RN), todo lo que vive bajo `tests/` usa Node puro:

```json
// package.json (reemplazar la clave "jest" existente)
"jest": {
  "projects": [
    {
      "displayName": "app",
      "preset": "jest-expo",
      "transformIgnorePatterns": [
        "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|standard-navigation)"
      ],
      "testPathIgnorePatterns": ["/node_modules/", "<rootDir>/tests/"]
    },
    {
      "displayName": "node",
      "testEnvironment": "node",
      "testMatch": ["<rootDir>/tests/**/*.test.ts"]
    }
  ]
}
```

Verificar empíricamente que el cambio funciona corriendo `npx jest tests/rules` (sin el emulador corriendo todavía): el error esperado ahora es de **conexión** al emulador (ej. `ECONNREFUSED` o "could not reach Cloud Firestore emulator"), no el `SyntaxError` de antes — eso confirma que el problema de carga de módulos quedó resuelto, aunque la prueba completa siga sin poder pasar hasta que el emulador esté disponible (Java 21+). Si el error sigue siendo de sintaxis/imports, ajustar la config hasta que cambie a un error de conexión, y documentar qué se ajustó y por qué.

Correr también `npm test` completo (sin el emulador) para confirmar que el proyecto "app" sigue corriendo todos los tests existentes sin regresión — los del proyecto "node" van a fallar por la conexión al emulador, eso es esperado y no bloquea esta tarea.

- [ ] **Step 2: Escribir `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 3: Escribir `storage.rules`**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 4: Escribir `firebase.json`**

```json
{
  "firestore": { "rules": "firestore.rules" },
  "storage": { "rules": "storage.rules" },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 }
  }
}
```

- [ ] **Step 5: Escribir la prueba de reglas**

```ts
// tests/rules/firestore.rules.test.ts
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import fs from "fs";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "fs-movil-test",
    firestore: { rules: fs.readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

test("a user can read and write their own profile document", async () => {
  const aliceDb = testEnv.authenticatedContext("alice").firestore();
  await assertSucceeds(setDoc(doc(aliceDb, "users/alice"), { email: "alice@example.com" }));
  await assertSucceeds(getDoc(doc(aliceDb, "users/alice")));
});

test("a user cannot read another user's profile document", async () => {
  const aliceDb = testEnv.authenticatedContext("alice").firestore();
  const bobDb = testEnv.authenticatedContext("bob").firestore();
  await assertSucceeds(setDoc(doc(aliceDb, "users/alice"), { email: "alice@example.com" }));
  await assertFails(getDoc(doc(bobDb, "users/alice")));
});

test("an unauthenticated request is denied", async () => {
  const anonDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anonDb, "users/alice")));
});
```

- [ ] **Step 6: Correr las pruebas contra el emulador**

Run: `npx firebase-tools emulators:exec --only firestore "npx jest tests/rules"`
Expected: 3 tests, PASS (requiere Java instalado para el emulador)

- [ ] **Step 7 (usuario, no el implementador): desplegar las reglas al proyecto real**

Requiere el project ID real que el usuario eligió al crear el proyecto en Task 4 (puede no ser exactamente `fs-movil-app` si ese nombre ya estaba tomado — los project ID de Firebase son únicos globalmente) y una sesión de `firebase-tools login` ya autenticada, ninguna de las dos cosas disponibles para el implementador. Se hace después, cuando el usuario confirme el project ID real:

```bash
npx firebase-tools deploy --only firestore:rules,storage:rules --project <PROJECT_ID_REAL>
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add real Firestore/Storage security rules for the users collection"
```

---

### Task 6: Tipo `UserProfile` compartido

**Files:**
- Create: `src/shared/types/user.ts`
- Test: `src/shared/types/__tests__/user.test.ts`

**Interfaces:**
- Produces: `type UserProfile`, `type AuthProvider`, `function createEmptyUserProfile(uid, email, authProvider): UserProfile` — usados por Task 7, 10, y por el futuro plan de Perfil.

- [ ] **Step 1: Escribir el tipo y la fábrica**

```ts
// src/shared/types/user.ts
export type AuthProvider = "password" | "google" | "apple";

export interface UserProfile {
  uid: string;
  email: string;
  technicianName: string;
  phone: string;
  photoUrl: string | null;
  signatureUrl: string | null;
  autoSignReports: boolean;
  company: string;
  position: string;
  specialty: string;
  authProvider: AuthProvider;
  darkModeEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export function createEmptyUserProfile(
  uid: string,
  email: string,
  authProvider: AuthProvider
): UserProfile {
  const now = new Date().toISOString();
  return {
    uid,
    email,
    technicianName: "",
    phone: "",
    photoUrl: null,
    signatureUrl: null,
    autoSignReports: false,
    company: "",
    position: "",
    specialty: "",
    authProvider,
    darkModeEnabled: false,
    createdAt: now,
    updatedAt: now,
  };
}
```

- [ ] **Step 2: Escribir la prueba**

```ts
// src/shared/types/__tests__/user.test.ts
import { createEmptyUserProfile } from "../user";

test("creates a profile with the given identity and sensible empty defaults", () => {
  const profile = createEmptyUserProfile("uid-1", "tech@fsapp.com", "google");

  expect(profile.uid).toBe("uid-1");
  expect(profile.email).toBe("tech@fsapp.com");
  expect(profile.authProvider).toBe("google");
  expect(profile.technicianName).toBe("");
  expect(profile.photoUrl).toBeNull();
  expect(profile.autoSignReports).toBe(false);
  expect(profile.darkModeEnabled).toBe(false);
});
```

- [ ] **Step 3: Correr los tests**

Run: `npm test -- user.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add shared UserProfile type and factory"
```

---

### Task 7: Servicio de autenticación (email/password, Google, Apple)

> A partir de esta tarea, la app ya no corre en Expo Go (Google/Apple Sign-In requieren módulos nativos) — se necesita un development build de EAS (`eas build --profile development`) para probar en dispositivo/simulador de aquí en adelante.

**Files:**
- Create: `src/features/auth/authService.ts`
- Modify: `app.config.ts` (config plugins)
- Test: `src/features/auth/__tests__/authService.test.ts`

**Interfaces:**
- Consumes: `auth` de `src/shared/lib/firebase.ts` (Task 4)
- Produces: `signUpWithEmail`, `signInWithEmail`, `signInWithGoogle`, `signInWithApple`, `signOutUser` — usados por Task 9 (pantallas) y Task 8 (store).

- [ ] **Step 1: Instalar las librerías nativas de auth**

```bash
npx expo install @react-native-google-signin/google-signin expo-apple-authentication
```

- [ ] **Step 2: Agregar los config plugins**

```ts
// app.config.ts (agregar la clave "plugins" dentro del objeto que retorna la función, junto a "extra")
plugins: ["@react-native-google-signin/google-signin", "expo-apple-authentication"],
```

- [ ] **Step 3: Escribir `authService.ts`**

`GoogleSignin.signIn()` (en la versión instalada de `@react-native-google-signin/google-signin`) devuelve `{ type: "success" | "cancelled", data: User | null }`, no el `idToken` directo — el `idToken` vive en `response.data?.idToken`:

```ts
// src/features/auth/authService.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  signOut,
  GoogleAuthProvider,
  OAuthProvider,
  type UserCredential,
} from "firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { auth } from "../../shared/lib/firebase";

export function signUpWithEmail(email: string, password: string): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle(): Promise<UserCredential> {
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;
  if (!idToken) {
    throw new Error("Google Sign-In no devolvió un idToken");
  }
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}

export async function signInWithApple(): Promise<UserCredential> {
  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!appleCredential.identityToken) {
    throw new Error("Apple Sign-In no devolvió un identityToken");
  }
  const provider = new OAuthProvider("apple.com");
  const credential = provider.credential({ idToken: appleCredential.identityToken });
  return signInWithCredential(auth, credential);
}

export function signOutUser(): Promise<void> {
  return signOut(auth);
}
```

- [ ] **Step 4: Escribir las pruebas (mockeando los SDKs nativos)**

```ts
// src/features/auth/__tests__/authService.test.ts
jest.mock("../../../shared/lib/firebase", () => ({ auth: { mocked: "auth" } }));
jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signInWithCredential: jest.fn(),
  signOut: jest.fn(),
  GoogleAuthProvider: { credential: jest.fn(() => ({ providerId: "google.com" })) },
  OAuthProvider: jest.fn().mockImplementation(() => ({
    credential: jest.fn(() => ({ providerId: "apple.com" })),
  })),
}));
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: { hasPlayServices: jest.fn(), signIn: jest.fn() },
}));
jest.mock("expo-apple-authentication", () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
} from "firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signInWithApple,
} from "../authService";

test("signUpWithEmail delegates to Firebase with the given credentials", async () => {
  await signUpWithEmail("tech@fsapp.com", "secret123");
  expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
    { mocked: "auth" },
    "tech@fsapp.com",
    "secret123"
  );
});

test("signInWithEmail delegates to Firebase with the given credentials", async () => {
  await signInWithEmail("tech@fsapp.com", "secret123");
  expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
    { mocked: "auth" },
    "tech@fsapp.com",
    "secret123"
  );
});

test("signInWithGoogle exchanges the Google idToken for a Firebase credential", async () => {
  (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
    type: "success",
    data: { idToken: "google-id-token" },
  });
  await signInWithGoogle();
  expect(signInWithCredential).toHaveBeenCalledWith(
    { mocked: "auth" },
    { providerId: "google.com" }
  );
});

test("signInWithGoogle throws if Google does not return an idToken", async () => {
  (GoogleSignin.signIn as jest.Mock).mockResolvedValue({ type: "cancelled", data: null });
  await expect(signInWithGoogle()).rejects.toThrow("idToken");
});

test("signInWithApple exchanges the Apple identityToken for a Firebase credential", async () => {
  (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
    identityToken: "apple-identity-token",
  });
  await signInWithApple();
  expect(signInWithCredential).toHaveBeenCalledWith(
    { mocked: "auth" },
    { providerId: "apple.com" }
  );
});
```

- [ ] **Step 5: Correr los tests**

Run: `npm test -- authService.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6 (usuario, no el implementador): generar un development build para poder probar los flujos nativos manualmente**

Requiere una cuenta de Expo (EAS) autenticada (`eas login`) y, para iOS, cuenta de Apple Developer — consume minutos de build y ningún agente debe iniciarlo por su cuenta. Lo hace el usuario cuando quiera probar en dispositivo/simulador real; no bloquea el resto del código de esta tarea, que se prueba con mocks:

```bash
npx eas build --profile development --platform all
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add auth service for email/password, Google and Apple sign-in"
```

---

### Task 8: Store de autenticación y guardas de navegación

**Files:**
- Create: `src/features/auth/useAuthStore.ts`, `src/app/(auth)/_layout.tsx`, `src/app/index.tsx`
- Modify: `src/app/(tabs)/_layout.tsx`
- Test: `src/features/auth/__tests__/useAuthStore.test.ts`, `src/app/__tests__/auth-guards.test.tsx`, `src/app/__tests__/index.test.tsx`

**Interfaces:**
- Consumes: `auth` de `src/shared/lib/firebase.ts`
- Produces: hook `useAuthStore()` devolviendo `{ user: User | null, isLoading: boolean }`, consumido por Task 9 y Task 10.

**Nota de diseño**: los grupos de rutas `(auth)` y `(tabs)` no son parte de la URL resultante (`(auth)/sign-in.tsx` sirve en `/sign-in`, no en `/(auth)/sign-in`), y ninguno de los dos grupos tiene una pantalla `index`. Sin una pantalla que resuelva la ruta raíz `/`, el arranque en frío de la app no encontraría ninguna ruta que mostrar. `src/app/index.tsx` cubre exactamente ese caso (arranque en frío); las guardas de `(auth)/_layout.tsx` y `(tabs)/_layout.tsx` siguen siendo necesarias aparte, para cuando se navega o se hace deep-link directo a una ruta anidada.

- [ ] **Step 1: Instalar Zustand**

```bash
npx expo install zustand
```

- [ ] **Step 2: Escribir el store**

```ts
// src/features/auth/useAuthStore.ts
import { create } from "zustand";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../shared/lib/firebase";

interface AuthState {
  user: User | null;
  isLoading: boolean;
}

export const useAuthStore = create<AuthState>(() => ({
  user: null,
  isLoading: true,
}));

onAuthStateChanged(auth, (user) => {
  useAuthStore.setState({ user, isLoading: false });
});
```

- [ ] **Step 3: Escribir la prueba del store**

```ts
// src/features/auth/__tests__/useAuthStore.test.ts
let mockAuthStateCallback: (user: unknown) => void;

jest.mock("../../../shared/lib/firebase", () => ({ auth: {} }));
jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn((_auth, callback) => {
    mockAuthStateCallback = callback;
  }),
}));

import { useAuthStore } from "../useAuthStore";

test("starts in a loading state with no user", () => {
  expect(useAuthStore.getState().isLoading).toBe(true);
  expect(useAuthStore.getState().user).toBeNull();
});

test("updates the store when Firebase reports an auth state change", () => {
  const fakeUser = { uid: "uid-1" };
  mockAuthStateCallback(fakeUser);
  expect(useAuthStore.getState().isLoading).toBe(false);
  expect(useAuthStore.getState().user).toBe(fakeUser);
});
```

- [ ] **Step 4: Crear el layout de auth con guarda de redirección**

```tsx
// src/app/(auth)/_layout.tsx
import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "../../features/auth/useAuthStore";

export default function AuthLayout() {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return null;
  if (user) return <Redirect href="/(tabs)/service" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 5: Agregar la guarda al layout de tabs**

```tsx
// src/app/(tabs)/_layout.tsx (agregar al inicio de la función, antes del return)
import { Redirect, Tabs } from "expo-router";
import { useAuthStore } from "../../features/auth/useAuthStore";

export default function TabsLayout() {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return null;
  if (!user) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="service" options={{ title: "Servicio" }} />
      <Tabs.Screen name="history" options={{ title: "Historial" }} />
      <Tabs.Screen name="parts" options={{ title: "Repuestos" }} />
      <Tabs.Screen name="ai" options={{ title: "IA" }} />
      <Tabs.Screen name="academy" options={{ title: "Academia" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
  );
}
```

- [ ] **Step 6: Escribir la prueba de las guardas**

Esta prueba importa `useAuthStore` real (para controlar su estado con `setState`), así que también hay que mockear `firebase/auth` y `shared/lib/firebase` — si no, el registro de `onAuthStateChanged` en el import de `useAuthStore.ts` se ejecuta contra el SDK real de Firebase dentro de Jest y puede fallar de forma impredecible:

```tsx
// src/app/__tests__/auth-guards.test.tsx
import { render } from "@testing-library/react-native";

jest.mock("../../shared/lib/firebase", () => ({ auth: {} }));
jest.mock("firebase/auth", () => ({ onAuthStateChanged: jest.fn() }));

const mockRedirect = jest.fn((_href: string) => null);
jest.mock("expo-router", () => ({
  Redirect: (props: { href: string }) => mockRedirect(props.href),
  Stack: () => null,
  Tabs: Object.assign(() => null, { Screen: () => null }),
}));

import { useAuthStore } from "../../features/auth/useAuthStore";
import TabsLayout from "../(tabs)/_layout";
import AuthLayout from "../(auth)/_layout";

beforeEach(() => {
  mockRedirect.mockClear();
});

test("tabs layout redirects to sign-in when there is no user", async () => {
  useAuthStore.setState({ user: null, isLoading: false });
  await render(<TabsLayout />);
  expect(mockRedirect).toHaveBeenCalledWith("/(auth)/sign-in");
});

test("auth layout redirects to the service tab when a user is present", async () => {
  useAuthStore.setState({ user: { uid: "uid-1" } as never, isLoading: false });
  await render(<AuthLayout />);
  expect(mockRedirect).toHaveBeenCalledWith("/(tabs)/service");
});
```

- [ ] **Step 7: Actualizar el test de Task 3 (`src/app/__tests__/tabs-layout.test.tsx`) para que siga pasando con la guarda ya agregada**

Ese test importa `TabsLayout` directamente; ahora que el componente llama a `useAuthStore()`, hay que mockear el store con un usuario autenticado para que no se quede en el `return null`/`Redirect` antes de llegar a los tabs:

```tsx
// src/app/__tests__/tabs-layout.test.tsx (agregar antes del import de TabsLayout, junto al mock existente de expo-router)
jest.mock("../../shared/lib/firebase", () => ({ auth: {} }));
jest.mock("firebase/auth", () => ({ onAuthStateChanged: jest.fn() }));
jest.mock("../../features/auth/useAuthStore", () => ({
  useAuthStore: () => ({ user: { uid: "uid-1" }, isLoading: false }),
}));
```

- [ ] **Step 8: Crear la pantalla que resuelve la ruta raíz `/`**

```tsx
// src/app/index.tsx
import { Redirect } from "expo-router";
import { useAuthStore } from "../features/auth/useAuthStore";

export default function Index() {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return null;
  return <Redirect href={user ? "/(tabs)/service" : "/(auth)/sign-in"} />;
}
```

```tsx
// src/app/__tests__/index.test.tsx
import { render } from "@testing-library/react-native";

jest.mock("../../shared/lib/firebase", () => ({ auth: {} }));
jest.mock("firebase/auth", () => ({ onAuthStateChanged: jest.fn() }));

const mockRedirect = jest.fn((_href: string) => null);
jest.mock("expo-router", () => ({
  Redirect: (props: { href: string }) => mockRedirect(props.href),
}));

import { useAuthStore } from "../../features/auth/useAuthStore";
import IndexScreen from "../index";

beforeEach(() => {
  mockRedirect.mockClear();
});

test("redirects to sign-in when there is no user", async () => {
  useAuthStore.setState({ user: null, isLoading: false });
  await render(<IndexScreen />);
  expect(mockRedirect).toHaveBeenCalledWith("/(auth)/sign-in");
});

test("redirects to the service tab when a user is present", async () => {
  useAuthStore.setState({ user: { uid: "uid-1" } as never, isLoading: false });
  await render(<IndexScreen />);
  expect(mockRedirect).toHaveBeenCalledWith("/(tabs)/service");
});
```

- [ ] **Step 9: Correr todos los tests de la tarea**

Run: `npm test -- useAuthStore.test.ts auth-guards.test.tsx tabs-layout.test.tsx index.test.tsx`
Expected: PASS (7 tests)

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add auth store, route guards, and root index redirect"
```

---

### Task 9: Pantallas de inicio y registro de sesión

**Files:**
- Modify: `src/app/(auth)/sign-in.tsx`
- Create: `src/app/(auth)/sign-up.tsx`
- Test: `src/app/__tests__/sign-in.test.tsx`

**Interfaces:**
- Consumes: `signInWithEmail`, `signInWithGoogle`, `signInWithApple` de `src/features/auth/authService.ts` (Task 7)

- [ ] **Step 1: Implementar la pantalla de inicio de sesión**

```tsx
// src/app/(auth)/sign-in.tsx
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
```

- [ ] **Step 2: Implementar la pantalla de registro (mismo patrón, usando `signUpWithEmail`)**

```tsx
// src/app/(auth)/sign-up.tsx
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
```

- [ ] **Step 3: Escribir la prueba de la pantalla de inicio de sesión**

```tsx
// src/app/__tests__/sign-in.test.tsx
import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("../../features/auth/authService", () => ({
  signInWithEmail: jest.fn(() => Promise.resolve()),
  signInWithGoogle: jest.fn(() => Promise.resolve()),
  signInWithApple: jest.fn(() => Promise.resolve()),
}));

import { signInWithEmail } from "../../features/auth/authService";
import SignInScreen from "../(auth)/sign-in";

test("submits the entered email and password", async () => {
  await render(<SignInScreen />);
  await fireEvent.changeText(screen.getByTestId("email-input"), "tech@fsapp.com");
  await fireEvent.changeText(screen.getByTestId("password-input"), "secret123");
  await fireEvent.press(screen.getByTestId("email-sign-in-button"));

  await new Promise(process.nextTick);
  expect(signInWithEmail).toHaveBeenCalledWith("tech@fsapp.com", "secret123");
});
```

- [ ] **Step 4: Correr los tests**

Run: `npm test -- sign-in.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add sign-in and sign-up screens"
```

---

### Task 10: Crear el perfil en Firestore al primer login + pantalla de perfil mínima

**Files:**
- Create: `src/features/profile/profileRepository.ts`
- Modify: `src/app/(tabs)/profile.tsx`, `src/app/_layout.tsx`
- Test: `tests/profile/profileRepository.test.ts` (bajo `tests/`, no `src/**/__tests__/` — corre contra el emulador, ver la convención que estableció Task 5), `src/app/__tests__/root-layout.test.tsx`

**Interfaces:**
- Consumes: `db` de `src/shared/lib/firebase.ts`, `createEmptyUserProfile`/`AuthProvider` de `src/shared/types/user.ts`, `signOutUser` de `src/features/auth/authService.ts`, `useAuthStore` de `src/features/auth/useAuthStore.ts` (Task 8 — sin modificarlo)
- Produces: `ensureUserProfile(uid, email, authProvider): Promise<UserProfile>` — consumido por el futuro plan de Perfil de usuario.

**Nota de diseño**: la creación del perfil se dispara desde un efecto en `src/app/_layout.tsx` (que ninguna tarea anterior prueba), no modificando `src/features/auth/useAuthStore.ts` — así el store y sus pruebas de Task 8 quedan intactos.

- [ ] **Step 1: Escribir `profileRepository.ts`**

```ts
// src/features/profile/profileRepository.ts
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../shared/lib/firebase";
import { createEmptyUserProfile, type AuthProvider, type UserProfile } from "../../shared/types/user";

export async function ensureUserProfile(
  uid: string,
  email: string,
  authProvider: AuthProvider
): Promise<UserProfile> {
  const ref = doc(db, "users", uid);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    return snapshot.data() as UserProfile;
  }

  const profile = createEmptyUserProfile(uid, email, authProvider);
  await setDoc(ref, profile);
  return profile;
}
```

- [ ] **Step 2: Escribir la prueba (contra el emulador de Firestore, reutilizando el `firebase.json` de Task 5)**

Vive bajo `tests/`, no `src/**/__tests__/`, porque corre en el proyecto Node puro de Jest que estableció Task 5 (el proyecto `jest-expo` no puede cargar `@firebase/rules-unit-testing`):

```ts
// tests/profile/profileRepository.test.ts
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import fs from "fs";
import { ensureUserProfile } from "../../src/features/profile/profileRepository";

jest.mock("../../src/shared/lib/firebase", () => ({ db: undefined }));

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "fs-movil-test",
    firestore: { rules: fs.readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

test("creates a profile document on first login", async () => {
  const aliceDb = testEnv.authenticatedContext("alice").firestore();
  jest.requireMock("../../src/shared/lib/firebase").db = aliceDb;

  const profile = await ensureUserProfile("alice", "alice@example.com", "password");

  expect(profile.uid).toBe("alice");
  expect(profile.email).toBe("alice@example.com");
});

test("does not overwrite an existing profile document", async () => {
  const aliceDb = testEnv.authenticatedContext("alice").firestore();
  jest.requireMock("../../src/shared/lib/firebase").db = aliceDb;
  await setDoc(doc(aliceDb, "users/alice"), {
    uid: "alice",
    email: "alice@example.com",
    technicianName: "Alice Técnica",
  });

  const profile = await ensureUserProfile("alice", "alice@example.com", "password");

  expect(profile.technicianName).toBe("Alice Técnica");
});
```

- [ ] **Step 3: Correr las pruebas contra el emulador**

Run: `npx firebase-tools emulators:exec --only firestore "npx jest tests/profile"`
Expected: 2 tests, PASS

**Nota**: este repo tiene Java 1.8 y el emulador de Firestore requiere Java 21+ (mismo bloqueo ya conocido de Task 5) — si el emulador no arranca por esto, no es un bloqueo nuevo, es el mismo gap ya documentado. Reporta el archivo `tests/profile/profileRepository.test.ts` escrito (Step 2) y sigue con el resto de la tarea (Steps 4-9, que no dependen del emulador); no intentes instalar Java ni buscar workarounds.

- [ ] **Step 4: Escribir la prueba del efecto que crea el perfil en `src/app/_layout.tsx`**

```tsx
// src/app/__tests__/root-layout.test.tsx
import { render } from "@testing-library/react-native";
import { create } from "zustand";

jest.mock("expo-router", () => ({ Stack: () => null }));

const mockEnsureUserProfile = jest.fn(() => Promise.resolve());
jest.mock("../../features/profile/profileRepository", () => ({
  ensureUserProfile: (...args: unknown[]) => mockEnsureUserProfile(...args),
}));

const fakeAuthStore = create<{ user: unknown; isLoading: boolean }>(() => ({
  user: null,
  isLoading: false,
}));
jest.mock("../../features/auth/useAuthStore", () => ({ useAuthStore: fakeAuthStore }));

import RootLayout from "../_layout";

beforeEach(() => {
  mockEnsureUserProfile.mockClear();
  fakeAuthStore.setState({ user: null, isLoading: false });
});

test("does not create a profile while there is no user", async () => {
  await render(<RootLayout />);
  expect(mockEnsureUserProfile).not.toHaveBeenCalled();
});

test("ensures a profile once a user is present", async () => {
  const view = await render(<RootLayout />);
  fakeAuthStore.setState({
    user: { uid: "uid-1", email: "tech@fsapp.com", providerData: [{ providerId: "google.com" }] },
    isLoading: false,
  });
  await view.rerender(<RootLayout />);
  expect(mockEnsureUserProfile).toHaveBeenCalledWith("uid-1", "tech@fsapp.com", "google");
});
```

- [ ] **Step 5: Correr la prueba y verificar que falla** (todavía no existe el efecto en `src/app/_layout.tsx`)

Run: `npm test -- root-layout.test.tsx`
Expected: FAIL (no calls to `mockEnsureUserProfile`, o error de import)

- [ ] **Step 6: Agregar el efecto a `src/app/_layout.tsx`, preservando el contenido existente del scaffold**

No reemplazar el archivo completo — el scaffold de Task 1 y el `import "../global.css"` de Task 2 deben seguir ahí. Agregar solo el import y el hook dentro del componente `RootLayout` ya existente:

```tsx
// src/app/_layout.tsx (agregar imports y el useEffect dentro del componente RootLayout existente, antes del return)
import { useEffect } from "react";
import { useAuthStore } from "../features/auth/useAuthStore";
import { ensureUserProfile } from "../features/profile/profileRepository";
import type { AuthProvider } from "../shared/types/user";

function resolveAuthProvider(providerId: string | undefined): AuthProvider {
  if (providerId?.includes("google")) return "google";
  if (providerId?.includes("apple")) return "apple";
  return "password";
}

// dentro de RootLayout(), antes del return existente:
const user = useAuthStore((state) => state.user);

useEffect(() => {
  if (!user) return;
  const provider = resolveAuthProvider(user.providerData[0]?.providerId);
  void ensureUserProfile(user.uid, user.email ?? "", provider);
}, [user]);
```

- [ ] **Step 7: Correr la prueba y verificar que pasa**

Run: `npm test -- root-layout.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 8: Implementar la pantalla de perfil mínima**

```tsx
// src/app/(tabs)/profile.tsx
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
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: create user profile document on first login, add minimal profile screen"
```

---

### Task 11: Verificación manual de punta a punta

No hay código nuevo en esta tarea — es la validación de que todo lo anterior funciona junto en un dispositivo/simulador real.

- [ ] **Step 1: Levantar el development build**

```bash
npx expo start --dev-client
```

- [ ] **Step 2: Verificar el flujo de registro**

Abrir la app, ir a "Crear una cuenta nueva", registrar un usuario con email/password nuevo. Verificar que redirige a la tab "Servicio".

- [ ] **Step 3: Verificar el documento de Firestore**

En la consola de Firebase del proyecto `fs-movil-app`, confirmar que existe `users/{uid}` con el email correcto.

- [ ] **Step 4: Verificar cierre e inicio de sesión**

Ir a la tab "Perfil", tocar "Cerrar sesión", confirmar que redirige a "Iniciar sesión". Volver a entrar con el mismo email/password y confirmar que llega de nuevo a "Servicio" sin crear un segundo documento de usuario.

- [ ] **Step 5: Verificar Google Sign-In**

Tocar "Continuar con Google" con una cuenta de Google real, confirmar que crea/reutiliza correctamente `users/{uid}` usando el UID de Firebase Auth.

- [ ] **Step 6: Verificar Sign in with Apple (solo iOS)**

Repetir con "Continuar con Apple" en un dispositivo/simulador iOS.

- [ ] **Step 7: Confirmar que las reglas de seguridad bloquean acceso cruzado**

Ya cubierto por las pruebas automatizadas de Task 5 — no requiere pasos manuales adicionales, se deja como referencia de que el criterio de aceptación de seguridad ya está verificado.

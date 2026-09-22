# FS App — Port a React Native (fs_movil)

## 1. Propósito

Construir la versión móvil (iOS + Android, publicable en App Store y Play Store) de FS App, la plataforma de gestión de servicios HVAC-R hoy implementada como app web en `fsapp` (React + Vite + Express + Firebase). Este documento cubre el alcance completo: todos los módulos de negocio de fsapp, portados a un proyecto Expo nuevo e independiente (`fs_movil`), con un backend propio (Firebase project separado, en el plan **Spark** gratuito, + Cloudflare Workers para lo que necesita un servidor).

Este no es un port 1:1 literal: donde la investigación del código actual de fsapp encontró funcionalidad rota, insegura o decorativa, este diseño la sanea en vez de replicarla, porque el costo de arreglarlo ahora (proyecto nuevo) es mucho menor que después de publicar en las tiendas.

## 2. Alcance

**Dentro de alcance** (todos los módulos de fsapp, saneados):
- Autenticación (email/password real, Google Sign-In, Sign in with Apple)
- Wizard de servicio (9 pasos) + Historial de equipos / ficha clínica
- Catálogo de repuestos (FS Parts) + integración Hostinger + carrito/checkout simulado
- Asistente de IA (FS IA) con las 12 herramientas de ingeniería
- Academia (cursos, diagramas técnicos, quiz, XP, insignias, certificados)
- Perfil de usuario
- Notificaciones (centro local, sin push)
- QR de activos (generación y escaneo)
- Firma digital (solo dibujo)
- Generación de PDF (reporte de servicio y certificados de academia)
- Ubicación por GPS + geocoding inverso + zonas preestablecidas

**Explícitamente fuera de alcance** (quedan para specs futuros si se necesitan):
- Integración con Google Workspace (Drive/Sheets)
- Integración con Telegram (además, está estructuralmente rota en fsapp — dos proyectos Firebase distintos y lógica de dominio ajeno)
- Pasarela de pago real (el checkout sigue simulado, como en fsapp)
- Mapa interactivo para elegir ubicación (`react-native-maps`)
- Push notifications reales (Firebase Cloud Messaging)
- "Estudio de firma" con carga de foto y remoción de fondo por procesamiento de píxeles
- Autenticación biométrica (Face ID/huella) — se elimina esta feature, ni siquiera queda como toggle decorativo
- Recalcular `healthPercentage` automáticamente a partir del historial (sigue siendo un campo editable manualmente, igual que hoy)

## 3. Contexto: hallazgos de fsapp relevantes para este diseño

La investigación del código actual de `fsapp` encontró:
- **3 de 4 endpoints de IA no existen** en el backend (`/api/chat`, `/api/generate-recommendation`, `/api/gemini/academy-tutor`) — el frontend siempre cae a un fallback de palabras clave. Solo `/api/improve-text` funciona de verdad.
- **`firestore.rules` abierto** (`allow read, write: if true` en todo path).
- **Login sin verificar contraseña real**, y 5 botones sociales (Facebook/Apple/TikTok/LinkedIn/Instagram) que fabrican una sesión falsa con `setTimeout`, sin OAuth real.
- **Identidad de usuario inconsistente**: el `docId` es el UID de Firebase Auth si el login fue por Google, o un email slugificado en cualquier otro caso — dos rutas de login pueden crear "cuentas" distintas para la misma persona.
- **Fotos guardadas como Data URL embebido** dentro de documentos Firestore (riesgo de exceder 1 MiB/documento).
- **Patrón de doble escritura** en casi toda colección (`users/{uid}/{col}/{id}` + `{col}/{id}` top-level), sin necesidad real de esa duplicación.
- **Telegram roto**: el código cliente escribe `telegram_codes` en el proyecto Firebase de la app, pero el webhook del servidor lee/escribe en un proyecto Firebase completamente distinto (`innova-store`), y la lógica del bot es sobre gastos personales, no HVAC — es código heredado de otra app.
- El resto de la app (dashboard de historial, catálogo de repuestos, contenido de academia, calculadoras de ingeniería, generación de PDF) es funcional y portable.

Estos hallazgos son la justificación de cada decisión de "saneamiento" en las secciones siguientes.

## 4. Stack y arquitectura general

- **Expo (managed workflow)** + **TypeScript** + **NativeWind** (Tailwind para RN) para mantener el mismo lenguaje visual que fsapp.
- **Expo Router** para navegación basada en archivos, tipada, con deep-linking (abrir un activo directo desde un QR escaneado o desde el historial).
- **Arquitectura por features**: cada módulo (`auth`, `service`, `history`, `parts`, `ai`, `academy`, `profile`) vive en su propia carpeta con sus pantallas, componentes, hooks y store — a diferencia de fsapp, donde `App.tsx` (5370 líneas) concentra todo el estado de la aplicación.
- **Estado**: Zustand por feature para estado de UI/formularios; Firestore (`onSnapshot`) como fuente de verdad en tiempo real, en vez de leer una vez y mantener copias manuales en estado como hace fsapp hoy.
- **Offline**: Firestore SDK con `persistentLocalCache` (respaldado por AsyncStorage) para cache de lectura y cola de escritura sin conexión — reemplaza el mecanismo manual de fsapp basado en `localStorage` por email y un toggle "En Línea/Offline" simulado.

### Estructura de carpetas (alto nivel)

```
fs_movil/
  app/                        # Expo Router: rutas/pantallas
    (auth)/
    (tabs)/
      service/
      history/
      parts/
      ai/
      academy/
      profile/
  src/
    features/
      auth/
      service/                # wizard de 9 pasos
      history/
      parts/
      ai/
      academy/
      profile/
      notifications/
    shared/
      types/                  # portado/adaptado de fsapp: types.ts, types/academy.ts
      utils/                  # hvacCalculations.ts, pdf template builder, unit converters
      lib/                    # firebase.ts (init), firestore helpers
      components/             # UI compartida (botones, cards, etc.)
```

El proxy de IA/Hostinger vive en un repo/proyecto de Cloudflare Workers aparte (no dentro de `fs_movil/`), igual que un backend cualquiera — ver Sección 7.

## 5. Autenticación

- **Métodos reales**: email/password (con verificación de contraseña real), Google Sign-In nativo, y **Sign in with Apple** (requerido por Apple si se ofrece Google Sign-In en iOS — App Store Review Guideline 4.8).
- Se eliminan los 5 botones sociales decorativos de fsapp.
- **Identidad consistente**: el `docId` de cualquier documento propiedad de un usuario siempre es `request.auth.uid` de Firebase Auth, sin importar el proveedor usado para entrar.

## 6. Modelo de datos (Firestore)

Se elimina el patrón de doble escritura de fsapp. Cada colección es única, con un campo `ownerId` (excepto donde el `uid` ya es el `docId`):

| Colección | Descripción | Notas de cambio vs. fsapp |
|---|---|---|
| `users/{uid}` | Perfil de usuario/técnico | Un solo doc (antes: top-level + subcolección duplicada) |
| `visits/{visitId}` | Órdenes de servicio / mantenimientos, campo `ownerId` | Antes duplicado en `users/{uid}/visits` y `visits/` |
| `hvacAssets/{assetId}` | Activos HVAC-R, campo `ownerId`, `clinicalHistory[]` embebido | Antes duplicado; se mantiene embebido (lista acotada) |
| `fsOrders/{orderId}` | Pedidos de repuestos, campo `ownerId` | Antes duplicado |
| `iaConversations/{convId}` | Historial de chats con FS IA, campo `ownerId` | Antes duplicado |
| `academyProfiles/{uid}` | Progreso de Academia (certificados, XP, insignias) | Antes subcolección `users/{uid}/academy_profile/stats` |
| ~~`fsParts/{id}`~~ | — | **Eliminada** — el catálogo vive solo vía Hostinger + fallback local, esta colección estaba casi sin uso en fsapp |
| ~~`telegram_codes`, `telegram_links`~~ | — | **Eliminadas** (fuera de alcance, y estaban rotas en fsapp) |

**Reglas de seguridad reales** (Firestore): exigir `request.auth.uid == resource.data.ownerId` para leer/escribir visitas, activos, pedidos y conversaciones IA; `request.auth.uid == userId` para perfil y progreso de academia. Sin autenticación válida, sin acceso — a diferencia de fsapp, donde hoy `allow read, write: if true` aplica a todo.

**Fotos**: el proyecto Firebase se mantiene en el plan **Spark** (gratuito) — Cloud Storage for Firebase requiere el plan Blaze en proyectos nuevos desde oct/2024, así que las fotos NO se suben a Firebase Storage. Se usa **Cloudinary** (capa gratuita: 25 GB de storage + 25 GB de banda/mes, permanente) con un "unsigned upload preset" — el cliente sube la imagen directo a Cloudinary por HTTPS sin pasar por ningún backend propio, y Cloudinary devuelve la URL pública. Los documentos de Firestore guardan solo esa URL (nunca el Data URL embebido, a diferencia de fsapp hoy). El preset de Cloudinary se configura para aceptar solo imágenes y con un límite de tamaño razonable, ya que un "unsigned preset" es público por diseño (cualquiera con el nombre del preset puede subir — no hay secretos que proteger en el cliente, pero sí conviene limitar tipo/tamaño de archivo desde la configuración del preset).

**Cupones de repuestos**: se mueven de estar hardcodeados en el bundle del cliente (como en fsapp: `FSCLIMA10`, `HVACVIP`, `FS2026`, `BIENVENIDO`) a un documento validado por el Worker de `validate-coupon` (Sección 7), para que no sean legibles simplemente abriendo el APK.

## 7. Backend (Cloudflare Workers)

**Cambio respecto a la primera versión de este spec**: originalmente esta sección proponía Firebase Cloud Functions. Cloud Functions siempre requiere el plan Blaze (cuenta de facturación vinculada), incluso si el uso real cae dentro de la cuota gratuita — el usuario decidió mantener el proyecto Firebase en el plan Spark (gratuito, sin tarjeta), así que el proxy de IA/Hostinger se mueve a **Cloudflare Workers** (capa gratuita: 100,000 requests/día, permanente, sin tarjeta para empezar). Es un repo/proyecto separado de `fs_movil` (ver Sección 4), no vive dentro del proyecto Firebase.

| Endpoint (Worker route) | Reemplaza en fsapp | Estado actual |
|---|---|---|
| `POST /improve-text` | `/api/improve-text` | Ya funciona — se porta la lógica |
| `POST /chat` | `/api/chat` | **No existe hoy** — se construye real (contexto de activo, historial, adjuntos multimodal vía Gemini) |
| `POST /generate-recommendation` | `/api/generate-recommendation` | **No existe hoy** — se construye real |
| `POST /academy-tutor` | `/api/gemini/academy-tutor` | **No existe hoy** — se construye real (5 modos: explicar simple, herramientas de campo, caso real, quiz, guía principiante) |
| `GET /hostinger-sync`, `GET /hostinger-product-detail` | igual en fsapp | Se porta la versión final evolucionada de `server.ts` (Store ID correcto, conversión de precios, sin los hacks intermedios de los 13 scripts `patch-*`/`fix-*`) |
| `POST /validate-coupon` | (nuevo) | Reemplaza la validación hardcodeada del cliente |

**Autenticación de las peticiones**: a diferencia de una Cloud Function *callable* (que adjunta el ID token automáticamente), aquí el cliente manda el ID token de Firebase Auth explícito en el header `Authorization: Bearer <idToken>`, y cada Worker lo verifica contra las claves públicas de Google (JWKS) antes de procesar la petición — sin necesitar el SDK completo de Firebase Admin, solo una librería de verificación de JWT (ej. `jose`), que sí corre bien en el runtime de Workers.

**Secretos**: `GEMINI_API_KEY` y `HOSTINGER_API_TOKEN` como Worker secrets (`wrangler secret put`), nunca en el cliente.

**Protección anti-abuso**: sin Firebase App Check (es específico de Cloud Functions/Firebase), la defensa es la verificación del ID token de Firebase Auth en cada request (ya obligatoria arriba) — cualquier llamada sin un token válido de un usuario real autenticado se rechaza antes de tocar Gemini/Hostinger. Si el abuso por usuarios autenticados reales se vuelve un problema, se puede añadir rate-limiting por `uid` (Cloudflare Workers KV o Durable Objects) más adelante.

**Catálogo de repuestos offline**: `fsparts_full_catalog.json` (230 productos) se empaqueta como asset local en la app — navegable sin internet desde el primer arranque. `hostingerSync` lo refresca en segundo plano cuando hay conexión.

## 8. Módulos de negocio

### Wizard de servicio + Historial de equipos
- El wizard de 9 pasos pasa a un flujo de pantallas (Expo Router) con un store de Zustand para el borrador, persistido en AsyncStorage (reemplaza el autoguardado a `localStorage` cada 800ms de fsapp).
- Evidencias fotográficas: `expo-image-picker`/`expo-camera`, subida real a Cloudinary (ver Sección 6). Se eliminan los botones de "foto demo" del flujo de producción.
- Escaneo QR: escáner de códigos de `expo-camera`, con el mismo fallback de pegar texto/JSON manual que fsapp.
- Firma: `react-native-signature-canvas`, solo dibujo (sin el estudio de remoción de fondo). Auto-firma si el perfil ya tiene una guardada.
- Ubicación: `expo-location` para captura automática de coordenadas + geocoding inverso (Nominatim, gratis) para mostrar dirección + chips de zonas preestablecidas — sin mapa interactivo.
- Cálculos técnicos (`hvacCalculations.ts`): se portan 1:1, es lógica pura.
- PDF: plantilla HTML/CSS con el mismo diseño visual del reporte actual, generada con `expo-print` (cliente, sin servidor).
- Ficha clínica / dashboard de Historial: pantallas de lista/detalle en tiempo real vía Firestore listeners. `healthPercentage` sigue editable manualmente.

### Catálogo de repuestos (FS Parts)
- Listado/búsqueda/filtro sobre los datos de `hostingerSync` + fallback local.
- Carrito/checkout: se mantiene simulado (transferencia/contraentrega/tarjeta sin pasarela real), igual que fsapp.
- Historial de pedidos: lista/detalle sobre `fsOrders`.

### Asistente de IA (FS IA)
- Chat multimodal contra `chatWithAI`, sidebar de conversaciones (pin/favorito/duplicar/renombrar/exportar), selector de activo de contexto.
- Las 12 herramientas de ingeniería (diagnóstico guiado, calculadora de carga térmica, calculadora SH/SC, conversor de unidades, etc.) son funciones puras que se portan 1:1.
- Adjuntar foto/PDF vía `expo-image-picker`/`expo-document-picker`.
- **Nota de voz real**: grabación de audio con `expo-av`, enviada a Gemini (que soporta audio nativamente) — deja de ser una función decorativa como en fsapp.

### Academia
- Contenido de cursos (`academyCourses.ts` + `data/courses/*`) portado como datos estáticos TS.
- Diagramas técnicos (10 tipos: Mollier, ciclo de refrigeración, circuito inverter, etc.) reconstruidos con `react-native-svg`.
- Quiz, XP, niveles e insignias: lógica portada 1:1.
- Certificados: se generan como PDF real con `expo-print` (en vez de `window.print()`).
- Tutor de IA contra `academyTutor` (real, no fallback).

### Perfil de usuario
- Formularios (personal, laboral, preferencias, estadísticas, seguridad) sobre `users/{uid}`.
- Compresión de imágenes con `expo-image-manipulator` antes de subir a Cloudinary (avatar, portada, firma).
- Se eliminan las pestañas de Telegram y Google Workspace (fuera de alcance) y el toggle de biometría (feature eliminada, no solo desconectada).

### Notificaciones
- Centro de notificaciones local (sin push), igual que fsapp — sin infraestructura de Firebase Cloud Messaging en esta versión.

## 9. Manejo de errores y offline

- Firestore: la persistencia local del SDK encola escrituras sin conexión y sincroniza al reconectar automáticamente; el estado de sincronización se deriva de la metadata real de `onSnapshot` (`fromCache`), no de un toggle simulado.
- Cloudflare Workers (IA, Hostinger): si fallan por red, se muestra un estado de error real con opción de reintentar — **no** se fabrica una respuesta que aparente ser válida (a diferencia del fallback actual de fsapp, que simula una respuesta de IA genuina). El catálogo de repuestos sí conserva su JSON local empaquetado como último recurso, porque es un catálogo real congelado, no una respuesta inventada.

## 10. Testing

- Lógica pura (cálculos HVAC, calculadoras de ingeniería, armado de datos para la plantilla de PDF, validación de cupones) se cubre con pruebas unitarias, portando los casos de uso reales de fsapp.
- El resto de la estrategia de pruebas (integración, E2E) se decide durante la implementación siguiendo el flujo normal de desarrollo (TDD para lógica nueva).

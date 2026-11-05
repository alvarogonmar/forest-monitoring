# Ayuda en La Primavera — app móvil

Frontend en React Native, Expo y JavaScript. Usa un Stack de Expo Router con Inicio, Pendiente, Enviando y Confirmada. Incluye GPS del dispositivo, solicitudes persistentes, conectividad y confirmación **simulada**. No envía solicitudes a administradores.

Usa Node 24 LTS y Expo Go compatible con SDK 58.

```sh
npm ci
npm start
```

Abre el QR con Expo Go en Android o Cámara en iPhone. El teléfono y la computadora deben estar en la misma red para cargar el proyecto de desarrollo.

Guía completa: [frontendAppMovil.md](../frontendAppMovil.md).

```sh
npm run lint
npm test
npx expo export --platform all
```

## Ubicación en el repositorio

El proyecto Expo vive directamente en `mobile/`. Ejecuta los comandos anteriores
desde esta carpeta. `node_modules/` y `.expo/` son archivos locales ignorados.

## Integración pendiente con el MVP

Este frontend utiliza actualmente almacenamiento con AsyncStorage, ubicación y
transporte simulado. El alcance previsto requiere persistencia con expo-sqlite,
envío al backend compartido y confirmación sólo después del guardado central.
GPS queda fuera del alcance vigente. Estos ajustes se harán en tareas separadas;
la reorganización de carpetas no cambia el comportamiento de la aplicación.

## Navegación

El Stack está en `src/app/_layout.js`. Sus pantallas comparten una sola solicitud mediante `HelpRequestProvider`; las rutas se actualizan según el estado guardado.

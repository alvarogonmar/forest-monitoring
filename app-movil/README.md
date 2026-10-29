# Ayuda en La Primavera — app móvil

Frontend en React Native, Expo y TypeScript. Incluye GPS del dispositivo, solicitudes persistentes, conectividad y confirmación **simulada**. No envía solicitudes a administradores.

Usa Node 24 LTS y Expo Go compatible con SDK 58.

```sh
npm ci
npm start
```

Abre el QR con Expo Go en Android o Cámara en iPhone. El teléfono y la computadora deben estar en la misma red para cargar el proyecto de desarrollo.

Guía completa: [frontendAppMovil.md](../frontendAppMovil.md).

```sh
npm run typecheck
npm run lint
npm test
npx expo export --platform all
```

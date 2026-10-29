# Frontend de la app móvil: Ayuda en el Bosque de La Primavera

## 1. Qué se construyó

Se creó `mobile/` con React Native, Expo SDK 58 y JavaScript. Se reprodujeron las cuatro vistas de las capturas y se conectaron a un flujo funcional. La app usa la ubicación real del teléfono, detecta internet y conserva una solicitud al cerrarse.

**Esta entrega es solo frontend.** El envío y su confirmación son simulados: no existe conexión a una API ni recepción por un administrador. La interfaz indica “Modo demostración · envío simulado”, y la confirmación aclara que es una prueba.

## 2. Paso a paso de la implementación

### Paso 1: crear el proyecto

Se creó el proyecto con `create-expo-app` y se migró todo el código de la app a JavaScript. Se eliminaron las anotaciones de tipos, las interfaces, `tsconfig.json` y las dependencias directas de TypeScript; la entrada de Expo es `index.js`. Se mantuvo el proyecto dentro de `forest-monitoring/`, sin modificar la documentación anterior ni crear otro repositorio. `app.json` define el nombre, orientación vertical, apariencia clara, identificadores de app y permisos de ubicación en primer plano.

### Paso 2: instalar los módulos compatibles con Expo

Se instalaron con `expo install`:

| Módulo | Función |
| --- | --- |
| `expo-location` | Obtener ubicación y precisión del dispositivo |
| `expo-crypto` | Crear un UUID por solicitud |
| `@react-native-async-storage/async-storage` | Guardar y recuperar la solicitud localmente |
| `@react-native-community/netinfo` | Detectar disponibilidad de internet |
| `react-native-safe-area-context` | Respetar cámara, barra superior y bordes del teléfono |
| `react-native-svg` | Dibujar árboles e iconos sin imágenes externas |
| `expo-status-bar` | Adaptar la barra del sistema al fondo claro |
| `react-native-web`, `react-dom`, `@expo/metro-runtime` | Permitir una vista previa web |

### Paso 3: reproducir la interfaz

`App.js` contiene una pantalla cuyo contenido cambia con el estado de la solicitud. No se necesita navegación entre rutas para este flujo. Se usaron el verde bosque, fondo marfil, naranja de espera, rojo del botón y verde de confirmación de las referencias. Se agregaron desplazamiento para pantallas pequeñas, etiquetas de accesibilidad y botones de reintento.

El logo se recreó con formas SVG y texto; no es una exportación oficial del logo de Figma. La fecha y el folio son dinámicos; los valores de ejemplo de las capturas no están fijados en el código. El folio visible usa los primeros ocho caracteres del UUID, mientras que internamente se conserva el UUID completo.

### Paso 4: conectar los estados

| Estado | Qué muestra y qué hace |
| --- | --- |
| Inicio | Botón “Solicitar ayuda”, estado de conexión e instrucciones |
| Guardando | Bloquea pulsaciones repetidas mientras escribe en el teléfono |
| Obteniendo ubicación | Solicitud ya guardada; pide permiso y busca coordenadas reales |
| Pendiente | “Tu solicitud está guardada”; todavía no existe confirmación |
| Enviando | Indicador animado y “Esperando confirmación…” |
| Confirmada | “Solicitud recibida”, con aclaración de recepción simulada |

Sin internet: inicio → guardado → GPS → pendiente → al recuperar internet, enviando → confirmación simulada.

Con internet: inicio → guardado y GPS → enviando → confirmación simulada. Guardar y obtener GPS siguen siendo necesarios, aunque normalmente son pasos breves.

### Paso 5: conservar la solicitud

`src/core/request.js` implementa el controlador del ciclo de vida. Primero guarda la intención de pedir ayuda y después busca el GPS. Así, si se cierra la app mientras busca coordenadas, la solicitud no desaparece.

`src/services/device.js` almacena un JSON bajo la clave `@bosque-primavera/help-request/v1`. Incluye:

```js
{
  version: 1,
  id: 'UUID completo',
  createdAt: 'fecha ISO',
  coordinates: {
    latitude: 20.654,
    longitude: -103.55,
    accuracy: 12,
    capturedAt: 'fecha ISO de la lectura GPS'
  },
  status: 'pending',
  receipt: null
}
```

Las coordenadas del ejemplo son ilustrativas; la app usa las que obtiene del dispositivo. Si todavía no hay lectura, `coordinates` es `null` y la app no intenta enviar. Al confirmar, guarda `status: 'confirmed'` y un recibo marcado con `simulated: true`.

Al abrir la app se recupera la solicitud. Una pendiente reanuda el proceso; una confirmada conserva la confirmación sin volver a enviar. Solo se mantiene una solicitud activa para evitar duplicados por pulsaciones. “Iniciar otra demostración” elimina el registro de prueba confirmado y vuelve al inicio. Una pendiente no se elimina desde la interfaz.

Si falla la lectura del almacenamiento, se bloquea la creación para no sobrescribir datos desconocidos. Si falla una escritura, se informa el problema y no se afirma que haya quedado guardada o confirmada.

AsyncStorage no cifra los datos. La ubicación permanece en el almacenamiento local de la instalación y no se envía a un backend en esta versión. Desinstalar la app, borrar sus datos o borrar los datos de Expo Go puede eliminarla. La conservación al cerrar no equivale a una copia de seguridad.

### Paso 6: obtener el GPS real

Al pulsar el botón se solicita permiso de ubicación **solo mientras se usa la app**. Se comprueba que los servicios de ubicación estén activos. Se solicita una lectura de alta precisión y se conservan latitud, longitud, precisión estimada y fecha de captura.

La búsqueda tiene un límite de 25 segundos y detiene la suscripción al terminar. Si se deniega el permiso, el GPS está apagado o no llega una lectura, la solicitud permanece pendiente y aparecen instrucciones, “Reintentar” y acceso a ajustes. No se inventa una ubicación ni se envía una solicitud sin coordenadas.

Una vez guardada una ubicación, los reintentos conservan esa lectura: corresponde al momento en que se logró obtener la posición para la solicitud. No hay seguimiento continuo ni actualización de la ubicación mientras la persona camina. Si el primer intento no pudo capturar GPS y se reintenta después, `capturedAt` permitirá distinguir cuándo se obtuvo realmente la lectura.

### Paso 7: detectar conexión y reanudar

`src/hooks/useHelpRequest.js` conecta el controlador con NetInfo y AppState. Se espera disponibilidad de internet; estar asociado a una red Wi-Fi no basta. Mientras la conectividad sea desconocida, se muestra “Comprobando conexión” y no se envía.

Si regresa internet mientras la app está abierta, se reintenta automáticamente. Al volver a primer plano se actualiza la conexión y se reanuda la solicitud. Si se pierde internet o la app pasa a segundo plano durante el envío, se interrumpe la simulación y la solicitud queda pendiente. Una operación interrumpida no puede mostrar confirmación.

No hay envío garantizado con la app cerrada ni tareas de GPS o envío en segundo plano. La solicitud se conserva para continuar al abrirla, tal como indican las referencias. Si falla el permiso de GPS o el almacenamiento, puede ser necesario pulsar “Reintentar”.

### Paso 8: simular el envío

`src/services/transport.js` contiene `simulatedTransport`: espera aproximadamente 2.8 segundos y devuelve un recibo ficticio. Admite cancelación. No hace peticiones HTTP y no transmite las coordenadas a un administrador.

### Paso 9: preparar la integración posterior

El controlador recibe sus servicios como dependencias. Para conectar el backend, se sustituirá `send` en `deviceDependencies` por un adaptador HTTP. La interfaz visual y el almacenamiento podrán conservarse, ajustando el tipo de recibo y la migración de datos para distinguir recibos reales de los de demostración.

El futuro adaptador deberá:

1. Enviar UUID, fecha y coordenadas a la API acordada con el equipo.
2. Usar el UUID completo como clave de idempotencia para evitar duplicados tras cortes de red.
3. Validar una respuesta real del servidor antes de confirmar recepción; tener internet no implica recepción del SOS.
4. Conservar la solicitud si hay timeout, respuesta inválida o error del servidor.
5. Respetar `AbortSignal` y definir un timeout de red.
6. Reemplazar los textos de demostración únicamente cuando exista integración real verificada.

No se añadió endpoint, autenticación, dashboard ni backend en esta entrega.

## 3. Archivos del proyecto

```text
forest-monitoring/
├── frontendAppMovil.md
└── mobile/
    ├── App.js                       # Las cuatro vistas y sus estados
    ├── app.json                      # Configuración y permisos nativos
    ├── index.js                      # Entrada de Expo
    ├── package.json                  # Dependencias y comandos
    ├── package-lock.json             # Versiones reproducibles
    ├── .nvmrc                        # Node 24
    ├── eslint.config.js
    ├── src/
    │   ├── components/Icons.js       # Logo e iconos SVG
    │   ├── core/request.js           # Controlador de solicitudes
    │   ├── hooks/useHelpRequest.js   # React, conexión y ciclo de vida
    │   └── services/
    │       ├── device.js             # GPS, UUID y almacenamiento
    │       └── transport.js          # Adaptador simulado sustituible
    └── tests/request.test.mjs        # Pruebas del ciclo de vida
```

## 4. Cómo ejecutarla en tu teléfono

1. Usa Node 24 LTS. Si tienes `nvm`, ejecuta `nvm use` dentro de `mobile`.
2. Instala Expo Go compatible con SDK 58 en el teléfono.
3. En la terminal ejecuta:

```sh
cd mobile
npm ci
npm start
```

4. Conecta el teléfono y la computadora a la misma red. Escanea el QR con Expo Go en Android o con Cámara en iPhone.
5. Pulsa “Solicitar ayuda” y permite el acceso a ubicación. Para una lectura útil, prueba en un dispositivo físico y con GPS activo.

La dependencia de la computadora es propia del modo de desarrollo. Para probar arranque completamente sin red sin depender de Metro, conviene generar posteriormente una compilación de desarrollo instalada. No se generó APK/IPA ni se publicó la app en esta entrega.

La web sirve para revisar el diseño con `npm run web`. El navegador puede limitar la ubicación; la prueba objetivo de GPS es el teléfono real. Fuera de localhost, la ubicación web normalmente requiere HTTPS.

## 5. Guion de prueba manual en Expo Go

### Siempre con internet

1. Abre la app y espera “Conexión disponible”.
2. Pulsa el botón una vez y concede ubicación.
3. Comprueba “Enviando solicitud”, animación y luego “Solicitud recibida”.
4. Revisa que aparezcan coordenadas y precisión. La recepción debe estar marcada como simulada.

### Sin internet y posterior recuperación

1. Carga primero el proyecto en Expo Go. Pulsa “Iniciar otra demostración” si existe una confirmación anterior.
2. Desactiva Wi-Fi y datos móviles; conserva la ubicación del teléfono activa.
3. Pulsa “Solicitar ayuda”. Comprueba que quede pendiente y que obtenga GPS cuando sea posible.
4. Cierra la app después de ver que quedó guardada.
5. Reactiva internet y vuelve a abrir el proyecto. En Expo Go puede ser necesaria la conexión a Metro para cargar JavaScript.
6. Verifica que se conserven el folio y las coordenadas, y que continúe el envío simulado.

### Errores y duplicados

- Deniega ubicación: debe quedar guardada, sin confirmación; permite ubicación en Ajustes y pulsa “Reintentar”.
- Apaga GPS: debe conservarse pendiente con instrucciones.
- Pulsa varias veces el botón: debe crear una sola solicitud.
- Desconecta internet durante “Enviando”: debe volver a pendiente.
- Cierra después de confirmar y abre: debe conservar la confirmación sin crear otra solicitud.

## 6. Verificación técnica

Tras la migración a JavaScript, se ejecutaron correctamente:

```sh
npm run lint
npm test
npx expo export --platform all
```

La exportación generó bundles de Android, iOS y web; no equivale a instalar ni probar un APK/IPA en hardware. Se revisó visualmente la pantalla de inicio en una vista web de 390 × 844. Las pruebas automatizadas usan coordenadas ficticias mediante dependencias inyectadas, sin acceder al GPS de la computadora. Aún hace falta ejecutar el guion manual de permisos, GPS y cierre en tu teléfono físico.

Las pruebas cubren persistencia y reapertura, envío con internet, pulsaciones duplicadas, permiso GPS denegado, fallos de almacenamiento, datos ilegibles, corte de conexión durante envío, segundo plano, restauración de confirmación y conectividad desconocida.

El diagnóstico oficial `npx expo-doctor` pasó 20 de 20 comprobaciones. `npm audit --omit=dev` reportó 8 alertas transitivas (5 bajas y 3 altas), propagadas por herramientas de Expo, incluyendo `deepmerge` y `zod`. La solución automática propuesta por npm implicaba bajar Expo a SDK 51, incompatible con esta entrega; no se aplicó `audit fix --force`. Estas alertas quedan pendientes de una actualización compatible de las dependencias y deben revisarse antes de publicar. La instalación también mostró avisos cuando el shell utilizó Node 25; el proyecto fija Node 24 en `.nvmrc` para usar una versión soportada.

## 7. Referencias técnicas utilizadas

- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/)
- [Expo Location](https://docs.expo.dev/versions/v58.0.0/sdk/location/)
- [NetInfo en Expo](https://docs.expo.dev/versions/v58.0.0/sdk/netinfo/)
- [AsyncStorage en Expo](https://docs.expo.dev/versions/v58.0.0/sdk/async-storage/)
- [AppState de React Native](https://reactnative.dev/docs/appstate)

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Crypto from 'expo-crypto';
import { createHttpTransport } from './transport.js';
import { createRequestStorage } from './storage.js';
const requestStorage = createRequestStorage(AsyncStorage);
// Expo inlines this public URL; credentials stay exclusively in backend/.env.
const sendHelpRequest = createHttpTransport({ apiUrl: process.env.EXPO_PUBLIC_API_URL });
async function locate() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
        throw new Error('Tu solicitud sigue guardada, pero falta tu ubicación. Permite el acceso a ubicación en Ajustes y pulsa Reintentar.');
    }
    if (!(await Location.hasServicesEnabledAsync())) {
        throw new Error('Activa la ubicación del teléfono y pulsa Reintentar. Tu solicitud sigue guardada.');
    }
    // watchPosition lets us remove the subscription on timeout; no stale cached GPS.
    return new Promise((resolve, reject) => {
        let subscription;
        let settled = false;
        const finish = (error, position) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            subscription?.remove();
            if (error)
                reject(error);
            else if (position)
                resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy, capturedAt: new Date(position.timestamp).toISOString() });
        };
        const timer = setTimeout(() => finish(new Error('Aún no pudimos obtener tu ubicación. Busca un lugar con vista al cielo y pulsa Reintentar. La solicitud sigue guardada.')), 25000);
        Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 }, position => finish(undefined, position), () => finish(new Error('No pudimos leer el GPS. Revisa la ubicación del teléfono y reintenta.'))).then(result => { subscription = result; if (settled)
            result.remove(); })
            .catch(() => finish(new Error('No pudimos iniciar el GPS. Revisa los permisos y reintenta.')));
    });
}
export const deviceDependencies = {
    read: requestStorage.read,
    write: requestStorage.write,
    locate,
    id: () => Crypto.randomUUID(),
    send: sendHelpRequest,
};

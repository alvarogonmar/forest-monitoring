import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Crypto from 'expo-crypto';
import type { Coordinates, Dependencies, HelpRequest } from '../core/request';
import { simulatedTransport } from './transport';

const KEY = '@bosque-primavera/help-request/v1';

function isCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== 'object') return false;
  const c = value as Coordinates;
  return Number.isFinite(c.latitude) && Math.abs(c.latitude) <= 90 &&
    Number.isFinite(c.longitude) && Math.abs(c.longitude) <= 180 &&
    (c.accuracy === null || (Number.isFinite(c.accuracy) && c.accuracy >= 0)) && Number.isFinite(Date.parse(c.capturedAt));
}

async function read(): Promise<HelpRequest | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  const r = JSON.parse(raw) as HelpRequest;
  if (r.version !== 1 || typeof r.id !== 'string' || !r.id || !Number.isFinite(Date.parse(r.createdAt)) ||
    !['pending', 'confirmed'].includes(r.status) || (r.coordinates !== null && !isCoordinates(r.coordinates)) ||
    (r.status === 'confirmed' && (!r.coordinates || !r.receipt || r.receipt.simulated !== true ||
      typeof r.receipt.id !== 'string' || !Number.isFinite(Date.parse(r.receipt.confirmedAt))))) {
    throw new Error('Solicitud local inválida');
  }
  return r;
}

async function locate(): Promise<Coordinates> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Tu solicitud sigue guardada, pero falta tu ubicación. Permite el acceso a ubicación en Ajustes y pulsa Reintentar.');
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    throw new Error('Activa la ubicación del teléfono y pulsa Reintentar. Tu solicitud sigue guardada.');
  }
  // watchPosition lets us remove the subscription on timeout; no stale cached GPS.
  return new Promise((resolve, reject) => {
    let subscription: Location.LocationSubscription | undefined;
    let settled = false;
    const finish = (error?: Error, position?: Location.LocationObject) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription?.remove();
      if (error) reject(error);
      else if (position) resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude,
        accuracy: position.coords.accuracy, capturedAt: new Date(position.timestamp).toISOString() });
    };
    const timer = setTimeout(() => finish(new Error('Aún no pudimos obtener tu ubicación. Busca un lugar con vista al cielo y pulsa Reintentar. La solicitud sigue guardada.')), 25000);
    Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 },
      position => finish(undefined, position),
      () => finish(new Error('No pudimos leer el GPS. Revisa la ubicación del teléfono y reintenta.')),
    ).then(result => { subscription = result; if (settled) result.remove(); })
      .catch(() => finish(new Error('No pudimos iniciar el GPS. Revisa los permisos y reintenta.')));
  });
}

export const deviceDependencies: Dependencies = {
  read,
  async write(request) {
    try {
      if (request) await AsyncStorage.setItem(KEY, JSON.stringify(request));
      else await AsyncStorage.removeItem(KEY);
    } catch { throw new Error('No pudimos actualizar el almacenamiento del teléfono. Reintenta antes de cerrar la app.'); }
  },
  locate,
  id: () => Crypto.randomUUID(),
  send: simulatedTransport,
};

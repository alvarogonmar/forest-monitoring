import { validateRequestRecord } from '../core/requestRecord.js';

export const REQUEST_STORAGE_KEY = '@bosque-primavera/help-request/v2';

// Keep the old v1 demo key untouched. Never turn a historical demo into a real SOS.
export function createRequestStorage(storage) {
    return {
        async read() {
            const raw = await storage.getItem(REQUEST_STORAGE_KEY);
            return raw === null ? null : validateRequestRecord(JSON.parse(raw));
        },
        async write(request) {
            try {
                if (request === null) await storage.removeItem(REQUEST_STORAGE_KEY);
                else await storage.setItem(REQUEST_STORAGE_KEY, JSON.stringify(validateRequestRecord(request)));
            } catch {
                throw new Error('No pudimos actualizar el almacenamiento. Tu solicitud no se ha descartado. Reintenta.');
            }
        },
    };
}

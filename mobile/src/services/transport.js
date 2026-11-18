import { isServerReceipt } from '../core/requestRecord.js';

export function createHttpTransport({ apiUrl, fetchImpl = globalThis.fetch, timeoutMs = 25_000 }) {
    return async function send(request, signal) {
        let url;
        try {
            url = new URL(apiUrl);
            if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
                || url.pathname !== '/' || url.search || url.hash) throw new Error();
        } catch {
            throw new Error('Configura EXPO_PUBLIC_API_URL con la dirección del backend. Tu solicitud sigue guardada.');
        }
        if (!request.coordinates) throw new Error('Falta la ubicación del dispositivo.');
        if (signal?.aborted) throw new Error('Envío interrumpido. Tu solicitud sigue guardada.');

        const controller = new AbortController();
        const cancel = () => controller.abort();
        signal?.addEventListener('abort', cancel, { once: true });
        let timedOut = false;
        const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
        try {
            const response = await fetchImpl(`${url.origin}/api/help-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: request.id, createdAt: request.createdAt, coordinates: request.coordinates,
                }),
                signal: controller.signal,
            });
            if (controller.signal.aborted) throw new Error();
            if (response.status === 409) {
                throw new Error('El ID ya existe con otros datos. Conservamos tu solicitud; necesita revisión.');
            }
            if (response.status === 429) {
                throw new Error('Se recibieron demasiados envíos. Espera un momento antes de reintentar.');
            }
            if (![200, 201].includes(response.status)) {
                throw new Error('El servidor no confirmó la recepción. Tu solicitud sigue guardada; puedes reintentar.');
            }
            let receipt;
            try { receipt = await response.json(); } catch {
                throw new Error('La respuesta del servidor no es válida. Tu solicitud sigue guardada.');
            }
            if (controller.signal.aborted) throw new Error();
            if (!isServerReceipt(receipt, request.id)) {
                throw new Error('El recibo no corresponde a tu solicitud. Conservamos los datos para reintentar.');
            }
            return { id: receipt.id, confirmedAt: receipt.confirmedAt };
        } catch (error) {
            if (controller.signal.aborted) {
                throw new Error(timedOut
                    ? 'El envío tardó demasiado. Tu solicitud sigue guardada; reintenta con conexión.'
                    : 'Envío interrumpido. Tu solicitud sigue guardada.');
            }
            if (error instanceof TypeError) {
                throw new Error('No pudimos conectar con el servidor. Tu solicitud sigue guardada.');
            }
            throw error;
        } finally {
            clearTimeout(timer);
            signal?.removeEventListener('abort', cancel);
        }
    };
}

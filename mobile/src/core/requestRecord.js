/** @typedef {{latitude: number, longitude: number, accuracy: number | null, capturedAt: string}} Coordinates */
/** @typedef {{id: string, confirmedAt: string}} Receipt */
/** @typedef {{version: number, id: string, createdAt: string, coordinates: Coordinates | null, status: 'pending' | 'confirmed', receipt: Receipt | null}} HelpRequest */

export const REQUEST_VERSION = 2;

export function isServerReceipt(receipt, requestId) {
    return receipt && typeof receipt === 'object' && !Array.isArray(receipt)
        && receipt.id === requestId && receipt.simulated === undefined
        && typeof receipt.confirmedAt === 'string' && receipt.confirmedAt.endsWith('Z')
        && Number.isFinite(Date.parse(receipt.confirmedAt));
}

function isCoordinates(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90
        && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180
        && (value.accuracy === null || (Number.isFinite(value.accuracy) && value.accuracy >= 0))
        && typeof value.capturedAt === 'string' && Number.isFinite(Date.parse(value.capturedAt));
}

export function validateRequestRecord(request) {
    if (!request || request.version !== REQUEST_VERSION
        || typeof request.id !== 'string'
        || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.id)
        || typeof request.createdAt !== 'string' || !Number.isFinite(Date.parse(request.createdAt))
        || !['pending', 'confirmed'].includes(request.status)
        || (request.coordinates !== null && !isCoordinates(request.coordinates))
        || (request.status === 'pending' && request.receipt !== null)
        || (request.status === 'confirmed'
            && (!request.coordinates || !isServerReceipt(request.receipt, request.id)))) {
        throw new Error('Solicitud local inválida. Conservamos los datos para evitar perderla.');
    }
    return request;
}

import assert from 'node:assert/strict';
import test from 'node:test';
import { createHttpTransport } from '../src/services/transport.js';

const request = {
    version: 2, id: 'bbe2e847-ef47-413b-bf04-c9a54c830d7e',
    createdAt: '2026-01-01T10:00:00.000Z', status: 'pending', receipt: null,
    coordinates: { latitude: 20.668, longitude: -103.569, accuracy: null, capturedAt: '2026-01-01T10:00:03.000Z' },
};
const receipt = { id: request.id, confirmedAt: '2026-11-18T18:05:35.800Z' };
const apiUrl = 'http://192.168.1.100:3001';

test('sends only the API fields and accepts identical receipts for 201 and 200', async () => {
    for (const status of [201, 200]) {
        const send = createHttpTransport({ apiUrl, fetchImpl: async (url, options) => {
            assert.equal(url, `${apiUrl}/api/help-requests`);
            assert.equal(options.method, 'POST');
            assert.equal(options.headers['Content-Type'], 'application/json');
            assert.deepEqual(JSON.parse(options.body), {
                id: request.id, createdAt: request.createdAt, coordinates: request.coordinates,
            });
            return { status, json: async () => receipt };
        } });
        assert.deepEqual(await send(request), receipt);
    }
});

test('never confirms mismatched, simulated, malformed or non-success receipts', async () => {
    for (const body of [null, {}, { ...receipt, id: 'someone-else' },
        { ...receipt, simulated: true }, { ...receipt, confirmedAt: 'invalid' }]) {
        const send = createHttpTransport({ apiUrl, fetchImpl: async () => ({ status: 201, json: async () => body }) });
        await assert.rejects(send(request), /recibo/);
    }
    for (const status of [202, 400, 409, 415, 429, 500, 503]) {
        const send = createHttpTransport({ apiUrl, fetchImpl: async () => ({ status, json: async () => receipt }) });
        await assert.rejects(send(request));
    }
    const malformed = createHttpTransport({ apiUrl, fetchImpl: async () => ({
        status: 201, json: async () => { throw new SyntaxError(); },
    }) });
    await assert.rejects(malformed(request), /respuesta/);
});

test('missing/unsafe configuration and already-aborted requests never call fetch', async () => {
    for (const url of [undefined, 'not-a-url', 'http://user:secret@localhost:3001', 'http://localhost:3001/api']) {
        const send = createHttpTransport({ apiUrl: url, fetchImpl: async () => { assert.fail('must not send'); } });
        await assert.rejects(send(request), /EXPO_PUBLIC_API_URL/);
    }
    const abort = new AbortController();
    abort.abort();
    const send = createHttpTransport({ apiUrl, fetchImpl: async () => { assert.fail('must not send'); } });
    await assert.rejects(send(request, abort.signal), /interrumpido/);
});

test('timeouts and foreground cancellation abort fetch without inventing receipts', async () => {
    const fetchImpl = async (_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
    const timeout = createHttpTransport({ apiUrl, fetchImpl, timeoutMs: 10 });
    await assert.rejects(timeout(request), /tardó demasiado/);
    const abort = new AbortController();
    const send = createHttpTransport({ apiUrl, fetchImpl });
    const pending = send(request, abort.signal);
    abort.abort();
    await assert.rejects(pending, /interrumpido/);
});

test('network failures preserve the request input for a later identical retry', async () => {
    const original = structuredClone(request);
    const send = createHttpTransport({ apiUrl, fetchImpl: async () => { throw new TypeError('Network request failed'); } });
    await assert.rejects(send(request), /conectar/);
    assert.deepEqual(request, original);
});

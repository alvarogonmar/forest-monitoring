import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequestStorage, REQUEST_STORAGE_KEY } from '../src/services/storage.js';

const pending = {
    version: 2, id: 'bbe2e847-ef47-413b-bf04-c9a54c830d7e', createdAt: '2026-01-01T10:00:00.000Z',
    status: 'pending', receipt: null,
    coordinates: { latitude: 20.668, longitude: -103.569, accuracy: null, capturedAt: '2026-01-01T10:00:03.000Z' },
};
const confirmed = { ...pending, status: 'confirmed', receipt: { id: pending.id, confirmedAt: '2026-11-18T18:05:35.800Z' } };
function disk(initial = []) {
    const rows = new Map(initial);
    const adapter = {
        getItem: async key => rows.get(key) ?? null,
        setItem: async (key, value) => { rows.set(key, value); },
        removeItem: async key => { rows.delete(key); },
    };
    return { rows, storage: createRequestStorage(adapter) };
}

test('pending requests and real receipts survive storage roundtrips', async () => {
    const { storage } = disk();
    await storage.write(pending);
    assert.deepEqual(await storage.read(), pending);
    await storage.write(confirmed);
    assert.deepEqual(await storage.read(), confirmed);
});

test('old demos remain untouched and are never restored as real requests', async () => {
    const legacyKey = '@bosque-primavera/help-request/v1';
    const legacy = JSON.stringify({ ...confirmed, version: 1, receipt: { ...confirmed.receipt, simulated: true } });
    const { rows, storage } = disk([[legacyKey, legacy]]);
    assert.equal(await storage.read(), null);
    await storage.write(pending);
    await storage.write(null);
    assert.equal(rows.get(legacyKey), legacy);
    assert.equal(rows.has(REQUEST_STORAGE_KEY), false);
});

test('corrupt or simulated confirmations are rejected without overwriting stored data', async () => {
    for (const raw of ['broken JSON', JSON.stringify({ ...confirmed, receipt: { ...confirmed.receipt, simulated: true } }),
        JSON.stringify({ ...confirmed, receipt: { ...confirmed.receipt, id: 'someone-else' } })]) {
        const { rows, storage } = disk([[REQUEST_STORAGE_KEY, raw]]);
        await assert.rejects(storage.read());
        assert.equal(rows.get(REQUEST_STORAGE_KEY), raw);
    }
});

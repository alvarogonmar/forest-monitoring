import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { validateHelpRequest } from '../src/validation/helpRequest.js';

const valid = {
    id: '7d457262-c994-4dcb-8f26-b8c4509ea793',
    createdAt: '2026-01-01T10:00:00Z',
    coordinates: {
        latitude: 20.668, longitude: -103.569, accuracy: null,
        capturedAt: '2026-01-01T10:00:03Z',
    },
};

test('accepts delayed offline requests, normalizes dates/UUID and preserves original input', () => {
    const input = structuredClone(valid);
    input.id = input.id.toUpperCase();
    const parsed = validateHelpRequest(input);
    assert.equal(parsed.id, valid.id);
    assert.equal(parsed.createdAt, '2026-01-01T10:00:00.000Z');
    assert.equal(parsed.coordinates.capturedAt, '2026-01-01T10:00:03.000Z');
    assert.equal(parsed.coordinates.accuracy, null);
    assert.equal(input.createdAt, valid.createdAt);
    assert.equal(input.id, valid.id.toUpperCase());
});

test('rejects invalid IDs/dates, impossible coordinates and untrusted extra fields', () => {
    const cases = [
        [{ ...valid, id: 'not-a-uuid' }, 'id'],
        [{ ...valid, createdAt: '2026-02-30T10:00:00Z' }, 'createdAt'],
        [{ ...valid, createdAt: '2026-01-01T10:00:00' }, 'createdAt'],
        [{ ...valid, createdAt: new Date(Date.now() + 6 * 60_000).toISOString() }, 'createdAt'],
        [{ ...valid, status: 'confirmed' }, 'body'],
        [{ ...valid, coordinates: null }, 'coordinates'],
        [{ ...valid, coordinates: { ...valid.coordinates, latitude: 91 } }, 'coordinates.latitude'],
        [{ ...valid, coordinates: { ...valid.coordinates, longitude: '20' } }, 'coordinates.longitude'],
        [{ ...valid, coordinates: { ...valid.coordinates, accuracy: -1 } }, 'coordinates.accuracy'],
        [{ ...valid, coordinates: { ...valid.coordinates, accuracy: Infinity } }, 'coordinates.accuracy'],
        [{ ...valid, coordinates: { ...valid.coordinates, capturedAt: '2099-01-01T00:00:00Z' } }, 'coordinates.capturedAt'],
        [{ ...valid, coordinates: { ...valid.coordinates, role: 'admin' } }, 'coordinates'],
    ];
    for (const [input, field] of cases) {
        assert.throws(() => validateHelpRequest(input), (error) => {
            assert.equal(error.status, 400);
            assert.equal(error.code, 'VALIDATION_ERROR');
            assert.ok(error.fields[field], field);
            return true;
        });
    }
});

test('requires all contract fields, including accuracy (nullable) and capturedAt', () => {
    for (const input of [undefined, null, [], {}, { ...valid, coordinates: {} }]) {
        assert.throws(() => validateHelpRequest(input), { code: 'VALIDATION_ERROR' });
    }
    for (const field of ['accuracy', 'capturedAt']) {
        const input = structuredClone(valid);
        delete input.coordinates[field];
        assert.throws(() => validateHelpRequest(input), (error) => {
            assert.ok(error.fields[`coordinates.${field}`]);
            return true;
        });
    }
});

test('HTTP validation returns 415/400 and keeps valid requests unconfirmed at 501', async (t) => {
    const server = createApp().listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}/api/help-requests`;
    const noJson = await fetch(url, { method: 'POST' });
    assert.equal(noJson.status, 415);
    const post = (body) => fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const missing = await post({});
    assert.equal(missing.status, 400);
    const error = (await missing.json()).error;
    assert.deepEqual(Object.keys(error.fields).sort(), ['coordinates', 'createdAt', 'id']);
    const acceptedFormat = await post(valid);
    assert.equal(acceptedFormat.status, 501);
    assert.equal((await acceptedFormat.json()).error.code, 'NOT_IMPLEMENTED');
});

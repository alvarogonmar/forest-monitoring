import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { ApiError } from '../src/errors.js';
import { RequestController } from '../../mobile/src/core/request.js';
import { createHttpTransport } from '../../mobile/src/services/transport.js';
import { createRequestStorage } from '../../mobile/src/services/storage.js';

test('mobile HTTP flow retries a lost receipt, persists confirmation and restores without another send', async (t) => {
    const rows = new Map();
    const helpRequestsRepository = { async save(input) {
        const existing = rows.get(input.id);
        if (existing && JSON.stringify(existing.input) !== JSON.stringify(input)) {
            throw new ApiError(409, 'EVENT_ID_CONFLICT', 'Conflicto.');
        }
        if (existing) return { created: false, receipt: existing.receipt };
        const receipt = { id: input.id, confirmedAt: new Date().toISOString() };
        rows.set(input.id, { input, receipt });
        return { created: true, receipt };
    } };
    const server = createApp({ helpRequestsRepository }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise((resolve) => server.close(resolve)));
    let sends = 0;
    const send = createHttpTransport({
        apiUrl: `http://127.0.0.1:${server.address().port}`,
        fetchImpl: async (...args) => {
            const response = await fetch(...args);
            if (++sends === 1) throw new TypeError('Lost response after server persistence');
            return response;
        },
    });
    const disk = new Map();
    const storage = createRequestStorage({
        getItem: async key => disk.get(key) ?? null,
        setItem: async (key, value) => { disk.set(key, value); },
        removeItem: async key => { disk.delete(key); },
    });
    const deps = {
        ...storage, send, id: () => 'bbe2e847-ef47-413b-bf04-c9a54c830d7e',
        locate: async () => ({ latitude: 20.668, longitude: -103.569, accuracy: null, capturedAt: new Date().toISOString() }),
    };
    const controller = new RequestController(deps);
    controller.setConnection(true);
    await controller.restore();
    await controller.create();
    assert.equal(controller.snapshot().phase, 'pending');
    assert.equal(rows.size, 1);
    const pending = await storage.read();
    await controller.resume();
    assert.equal(controller.snapshot().phase, 'confirmed');
    const confirmed = await storage.read();
    assert.equal(confirmed.id, pending.id);
    assert.deepEqual(confirmed.coordinates, pending.coordinates);
    assert.deepEqual(confirmed.receipt, rows.get(confirmed.id).receipt);
    assert.equal(rows.size, 1);
    const reopened = new RequestController(deps);
    reopened.setConnection(true);
    await reopened.restore();
    assert.equal(reopened.snapshot().phase, 'confirmed');
    assert.equal(sends, 2);
});

test('browser preview gets CORS permission only for configured origins', async (t) => {
    const server = createApp({ allowedOrigins: ['http://localhost:8081'] }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}`;
    const allowed = await fetch(`${base}/api/help-requests`, {
        method: 'OPTIONS', headers: {
            Origin: 'http://localhost:8081', 'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'content-type',
        },
    });
    assert.equal(allowed.status, 204);
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:8081');
    const blocked = await fetch(`${base}/api/health`, { headers: { Origin: 'https://untrusted.example' } });
    assert.equal(blocked.headers.get('access-control-allow-origin'), null);
});

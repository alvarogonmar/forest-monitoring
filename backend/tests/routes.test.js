import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { createRoutesRepository } from '../src/repositories/routes.js';
import { createSupabaseClient } from '../src/services/supabase.js';

function databaseResult(result) {
    return {
        from(table) {
            assert.equal(table, 'routes');
            return {
                select() { return this; },
                order() { return this; },
                async abortSignal() { return result; },
            };
        },
    };
}

const route = {
    id: 'pino', name: 'Sendero del Pino', color: '#245e2c',
    occupancy_timeout_seconds: 120,
    private_note: 'do-not-expose',
    route_path_points: [
        { position: 1, latitude: 20.67, longitude: -103.566 },
        { position: 0, latitude: 20.668, longitude: -103.569 },
    ],
};

test('public routes retain lat/lon order, sort geometry, and omit nonpublic fields', async () => {
    const repository = createRoutesRepository(databaseResult({ data: [route], error: null, count: 1 }));
    assert.deepEqual(await repository.getRoutes(), [{
        id: 'pino', name: 'Sendero del Pino', color: '#245e2c',
        coordinates: [[20.668, -103.569], [20.67, -103.566]],
    }]);
});

test('an empty catalog is successful, while database failures are not empty catalogs', async () => {
    const empty = createRoutesRepository(databaseResult({ data: [], error: null, count: 0 }));
    assert.deepEqual(await empty.getRoutes(), []);
    const failure = createRoutesRepository(databaseResult({
        data: null, error: { message: 'private infrastructure error' }, count: null,
    }));
    await assert.rejects(failure.getRoutes(), (error) => {
        assert.equal(error.status, 503);
        assert.equal(error.code, 'PERSISTENCE_UNAVAILABLE');
        assert.ok(!error.message.includes('private infrastructure'));
        return true;
    });
});

test('truncated catalogs are rejected rather than presented as complete', async () => {
    const repository = createRoutesRepository(databaseResult({ data: [route], error: null, count: 2 }));
    await assert.rejects(repository.getRoutes(), { code: 'PERSISTENCE_UNAVAILABLE' });
});

test('incomplete, out-of-range, and ambiguous geometry is rejected', async () => {
    const invalidPaths = [
        [],
        [route.route_path_points[0]],
        [route.route_path_points[0], { position: 0, latitude: 91, longitude: 0 }],
        [route.route_path_points[0], { position: 1, latitude: 20, longitude: -103 }],
    ];
    for (const points of invalidPaths) {
        const repository = createRoutesRepository(databaseResult({
            data: [{ ...route, route_path_points: points }], error: null, count: 1,
        }));
        await assert.rejects(repository.getRoutes(), { code: 'ROUTE_CONFIGURATION_INVALID' });
    }
});

test('missing or invalid configuration never includes supplied secrets in errors', () => {
    assert.equal(createSupabaseClient({}), null);
    const invalid = [
        { SUPABASE_SECRET_KEY: 'do-not-print-this' },
        { SUPABASE_URL: 'postgresql://private:do-not-print-this@example.com/db', SUPABASE_SECRET_KEY: 'sb_secret_test' },
        { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'sb_publishable_do-not-print-this' },
    ];
    for (const env of invalid) {
        assert.throws(() => createSupabaseClient(env), (error) => {
            assert.ok(!error.message.includes('do-not-print-this'));
            return true;
        });
    }
});

test('HTTP routes expose the public contract and return 503 before configuration', async (t) => {
    async function start(app) {
        const server = app.listen(0, '127.0.0.1');
        await once(server, 'listening');
        t.after(() => new Promise((resolve) => server.close(resolve)));
        return `http://127.0.0.1:${server.address().port}`;
    }
    const unconfigured = await start(createApp());
    const health = await fetch(`${unconfigured}/api/health`);
    assert.equal(health.status, 200);
    const unavailable = await fetch(`${unconfigured}/api/routes`);
    assert.equal(unavailable.status, 503);
    assert.equal((await unavailable.json()).error.code, 'PERSISTENCE_UNAVAILABLE');

    const repository = createRoutesRepository(databaseResult({ data: [route], error: null, count: 1 }));
    const configured = await start(createApp({ routesRepository: repository }));
    const response = await fetch(`${configured}/api/routes`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const payload = await response.json();
    assert.equal(payload.items.length, 1);
    assert.equal(payload.items[0].coordinates.length, 2);
    assert.ok(!JSON.stringify(payload).includes('do-not-expose'));
    const privateEndpoint = await fetch(`${configured}/api/admin/sensor-points`);
    // The entire administrative namespace now checks authentication first.
    assert.equal(privateEndpoint.status, 401);
});

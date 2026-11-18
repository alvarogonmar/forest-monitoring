import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { createApp } from '../src/app.js';
import { createHelpRequestsRepository } from '../src/repositories/helpRequests.js';
import { validateHelpRequest } from '../src/validation/helpRequest.js';

const input = {
    id: '7d457262-c994-4dcb-8f26-b8c4509ea793',
    createdAt: '2026-01-01T10:00:00.000Z',
    coordinates: {
        latitude: 20.668, longitude: -103.569, accuracy: null,
        capturedAt: '2026-01-01T10:00:03.000Z',
    },
};

// Use the real Supabase SDK against simulated PostgREST HTTP responses.
// This exercises query construction without writing to the user's database.
function database() {
    const rows = new Map();
    const control = { failInsert: false, failRead: false, loseReceipt: false };
    const reply = (body, status = 200) => new Response(JSON.stringify(body), {
        status, headers: { 'Content-Type': 'application/json' },
    });
    const client = createClient('https://test.supabase.co', 'sb_secret_test', {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: {
            async fetch(address, options) {
                const url = new URL(address);
                assert.equal(url.pathname, '/rest/v1/help_requests');
                const project = (row) => Object.fromEntries(
                    url.searchParams.get('select').split(',').map((key) => [key, row[key]]),
                );
                if (options.method === 'POST') {
                    if (control.failInsert) return reply({ message: 'private SQL details' }, 503);
                    const row = JSON.parse(options.body);
                    assert.equal(Object.hasOwn(row, 'received_at'), false);
                    assert.equal(Object.hasOwn(row, 'coordinates'), false);
                    if (rows.has(row.id)) return reply({ code: '23505', message: 'duplicate key' }, 409);
                    row.received_at = '2026-11-18T17:00:00.123456+00:00';
                    rows.set(row.id, row);
                    if (control.loseReceipt) {
                        control.loseReceipt = false;
                        return reply({ message: 'receipt was lost after persistence' }, 503);
                    }
                    return reply(project(row), 201);
                }
                assert.equal(options.method, 'GET');
                if (control.failRead) return reply({ message: 'private lookup details' }, 503);
                const id = url.searchParams.get('id').replace(/^eq\./, '');
                return rows.has(id) ? reply(project(rows.get(id)))
                    : reply({ code: 'PGRST116', message: 'not found' }, 406);
            },
        },
    });
    return { rows, control, repository: createHelpRequestsRepository(client) };
}

test('new requests use database receipt time and identical retries return the original receipt', async () => {
    const { repository, rows } = database();
    const first = await repository.save(input);
    assert.deepEqual(first, {
        created: true,
        receipt: { id: input.id, confirmedAt: '2026-11-18T17:00:00.123Z' },
    });
    const retry = await repository.save(validateHelpRequest({
        ...input, id: input.id.toUpperCase(), createdAt: '2026-01-01T10:00:00Z',
    }));
    assert.deepEqual(retry, { created: false, receipt: first.receipt });
    assert.equal(rows.size, 1);
});

test('reused IDs with changed data conflict without altering or exposing the original row', async () => {
    const { repository, rows } = database();
    await repository.save(input);
    const original = structuredClone(rows.get(input.id));
    const changed = [
        { ...input, createdAt: '2026-01-01T11:00:00.000Z' },
        ...[
            { latitude: 21 }, { longitude: -104 }, { accuracy: 0 },
            { capturedAt: '2026-01-01T11:00:03.000Z' },
        ].map((coordinateChange) => ({
            ...input, coordinates: { ...input.coordinates, ...coordinateChange },
        })),
    ];
    for (const request of changed) {
        await assert.rejects(repository.save(request), (error) => {
            assert.equal(error.status, 409);
            assert.equal(error.code, 'EVENT_ID_CONFLICT');
            assert.ok(!error.message.includes(String(original.latitude)));
            return true;
        });
    }
    assert.deepEqual(rows.get(input.id), original);
});

test('concurrent identical requests yield one new receipt and one replay', async () => {
    const { repository, rows } = database();
    const results = await Promise.all([repository.save(input), repository.save(input)]);
    assert.deepEqual(results.map((result) => result.created).sort(), [false, true]);
    assert.deepEqual(results[0].receipt, results[1].receipt);
    assert.equal(rows.size, 1);
});

test('a lost response after insertion is recovered by retrying the same identifier', async () => {
    const { repository, rows, control } = database();
    control.loseReceipt = true;
    await assert.rejects(repository.save(input), { status: 503, code: 'PERSISTENCE_UNAVAILABLE' });
    assert.equal(rows.size, 1);
    const retry = await repository.save(input);
    assert.equal(retry.created, false);
    assert.equal(retry.receipt.confirmedAt, '2026-11-18T17:00:00.123Z');
    assert.equal(rows.size, 1);
});

test('database insert and duplicate-lookup failures never produce a successful receipt', async () => {
    const { repository, control, rows } = database();
    control.failInsert = true;
    await assert.rejects(repository.save(input), { status: 503, code: 'PERSISTENCE_UNAVAILABLE' });
    assert.equal(rows.size, 0);
    control.failInsert = false;
    await repository.save(input);
    control.failRead = true;
    await assert.rejects(repository.save(input), (error) => {
        assert.equal(error.status, 503);
        assert.ok(!error.message.includes('private lookup'));
        return true;
    });
});

test('HTTP flow returns 201, 200, 409 and 503 without returning private request contents', async (t) => {
    const { repository, control } = database();
    const server = createApp({ helpRequestsRepository: repository }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}/api/help-requests`;
    const post = (body) => fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const first = await post(input);
    assert.equal(first.status, 201);
    const receipt = await first.json();
    assert.deepEqual(Object.keys(receipt).sort(), ['confirmedAt', 'id']);
    const retry = await post(input);
    assert.equal(retry.status, 200);
    assert.deepEqual(await retry.json(), receipt);
    const conflict = await post({ ...input, coordinates: { ...input.coordinates, latitude: 21 } });
    assert.equal(conflict.status, 409);
    assert.equal((await conflict.json()).error.code, 'EVENT_ID_CONFLICT');
    control.failInsert = true;
    const failure = await post({ ...input, id: 'b09d3c03-74f5-4454-9191-b3834e21343e' });
    assert.equal(failure.status, 503);
    assert.ok(!JSON.stringify(await failure.json()).includes('private SQL'));
});

import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { createApp } from '../src/app.js';
import { createAdminAuth } from '../src/services/adminAuth.js';
import { createHelpRequestsRepository } from '../src/repositories/helpRequests.js';
import { validateAdminHelpRequests } from '../src/validation/adminHelpRequests.js';

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const row = (n, receivedAt, createdAt = '2026-11-18T00:00:00+00:00') => ({
    id: id(n), created_at: createdAt, received_at: receivedAt,
    latitude: 20.668, longitude: -103.569, accuracy: null,
    location_captured_at: createdAt,
});
const rows = [
    row(5, '2026-11-18T18:00:00.123457+00:00'),
    row(4, '2026-11-18T18:00:00.123456+00:00'),
    row(3, '2026-11-18T18:00:00.123456+00:00'),
    row(2, '2026-11-18T18:00:00.123455+00:00'),
    row(1, '2026-11-18T17:00:00.000000+00:00', '2026-11-19T00:00:00+00:00'),
];

// The real SDK constructs HTTP queries; only the PostgREST service is simulated.
function database() {
    const control = { fail: false, cap: 1000, queries: [] };
    const client = createClient('https://test.supabase.co', 'sb_secret_test', {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { async fetch(address, options) {
            const url = new URL(address);
            const params = url.searchParams;
            control.queries.push(url);
            assert.equal(options.method, 'GET');
            assert.equal(url.pathname, '/rest/v1/help_requests');
            assert.equal(params.get('order'), 'received_at.desc,id.desc');
            assert.match(new Headers(options.headers).get('prefer'), /count=exact/);
            assert.ok(options.signal);
            if (control.fail) return new Response(JSON.stringify({ message: 'private SQL detail' }), {
                status: 503, headers: { 'Content-Type': 'application/json' },
            });
            let matching = rows.filter(value => {
                const bounds = params.getAll('created_at');
                return bounds.every(bound => bound.startsWith('gte.')
                    ? Date.parse(value.created_at) >= Date.parse(bound.slice(4))
                    : Date.parse(value.created_at) < Date.parse(bound.slice(3)));
            });
            if (params.has('or')) {
                const match = params.get('or').match(/^\(received_at\.lt\."([^"]+)",and\(received_at\.eq\."([^"]+)",id\.lt\.([0-9a-f-]+)\)\)$/);
                assert.ok(match, 'valid quoted PostgREST keyset expression');
                assert.equal(match[1], match[2]);
                matching = matching.filter(value => value.received_at < match[1]
                    || (value.received_at === match[1] && value.id < match[3]));
            }
            const data = matching.slice(0, Math.min(Number(params.get('limit')), control.cap));
            return new Response(JSON.stringify(data), { headers: {
                'Content-Type': 'application/json',
                'Content-Range': `${data.length ? `0-${data.length - 1}` : '*'}/${matching.length}`,
            } });
        } },
    });
    return { repository: createHelpRequestsRepository(client), control };
}

async function serverFor(t, options) {
    const server = createApp(options).listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise(resolve => server.close(resolve)));
    return `http://127.0.0.1:${server.address().port}`;
}

test('pagination preserves microseconds and UUID ties without missing or repeating requests', async () => {
    const { repository } = database();
    const found = [];
    let cursor;
    do {
        const page = await repository.list(validateAdminHelpRequests({ limit: '2', ...(cursor ? { cursor } : {}) }));
        found.push(...page.items.map(item => item.id));
        assert.deepEqual(Object.keys(page.items[0]).sort(), ['coordinates', 'createdAt', 'id', 'receivedAt']);
        cursor = page.nextCursor;
        if (found.length === 2) {
            assert.equal(JSON.parse(Buffer.from(cursor, 'base64url')).receivedAt, rows[1].received_at);
        }
    } while (cursor);
    assert.deepEqual(found, rows.map(value => value.id));
});

test('date filters use createdAt with inclusive from and exclusive to; an empty result is successful', async () => {
    const { repository } = database();
    const page = await repository.list(validateAdminHelpRequests({
        from: '2026-11-18T00:00:00Z', to: '2026-11-19T00:00:00Z',
    }));
    assert.deepEqual(page.items.map(item => item.id), rows.slice(0, 4).map(value => value.id));
    assert.equal(page.nextCursor, null);
    assert.deepEqual(await repository.list(validateAdminHelpRequests({ from: '2027-01-01T00:00:00Z' })), {
        items: [], nextCursor: null,
    });
});

test('server row caps retain a next cursor and database errors never masquerade as empty results', async () => {
    const { repository, control } = database();
    control.cap = 1;
    const first = await repository.list(validateAdminHelpRequests({ limit: '2' }));
    assert.equal(first.items.length, 1);
    assert.ok(first.nextCursor);
    const second = await repository.list(validateAdminHelpRequests({ limit: '2', cursor: first.nextCursor }));
    assert.equal(second.items[0].id, rows[1].id);
    control.fail = true;
    await assert.rejects(repository.list(validateAdminHelpRequests({})), error => {
        assert.equal(error.status, 503);
        assert.ok(!error.message.includes('private SQL'));
        return true;
    });
});

test('query validation rejects ambiguous dates, repeated values, unsafe cursors and changed pagination filters', async () => {
    const { repository } = database();
    const { nextCursor } = await repository.list(validateAdminHelpRequests({ limit: '2' }));
    const injected = JSON.parse(Buffer.from(nextCursor, 'base64url'));
    injected.receivedAt = '2026-11-18T00:00:00Z),id.gt.0';
    const invalid = [{ limit: '0' }, { limit: '101' }, { limit: '2.5' }, { limit: ['2', '3'] },
        { unknown: '1' }, { from: '2026-02-30T00:00:00Z' },
        { from: '2026-11-18T00:00:00.123456Z' },
        { from: '2026-11-18T00:00:00Z', to: '2026-11-18T00:00:00Z' },
        { cursor: 'invalid' }, { cursor: nextCursor, limit: '3' },
        { cursor: nextCursor, limit: '2', from: '2026-01-01T00:00:00Z' },
        { cursor: Buffer.from(JSON.stringify(injected)).toString('base64url'), limit: '2' }];
    for (const query of invalid) assert.throws(() => validateAdminHelpRequests(query), { status: 400 });
    assert.equal(validateAdminHelpRequests({}).limit, 50);
});

test('protected listing checks real session lifecycle and membership before reading requests', async t => {
    const user = { id: id(9), email: 'admin@example.test' };
    const sessions = new Map();
    let now = Date.now();
    let active = true;
    let reads = 0;
    const auth = createAdminAuth({ now: () => now, verifyPassword: async () => user, repository: {
        async getMembership() { return { active }; },
        async createSession(value) { sessions.set(value.session_hash, { ...value, revoked_at: null }); },
        async getSession(hash) {
            const value = sessions.get(hash);
            return value ? { ...value, admin_memberships: { active } } : null;
        },
        async getUser() { return user; },
        async revokeSession(hash, at) { sessions.get(hash).revoked_at = at; return true; },
    } });
    const { repository } = database();
    const base = await serverFor(t, { adminAuth: auth, helpRequestsRepository: {
        async list(filters) { reads++; return repository.list(filters); },
    } });
    const login = await auth.login({});
    const cookie = `forest_admin_session=${login.token}`;
    const get = (query = '', value = cookie) => fetch(`${base}/api/admin/help-requests${query}`, {
        headers: value ? { Cookie: value } : {},
    });
    for (const value of [null, 'forest_admin_session=bad', `forest_admin_session=${'a'.repeat(64)}`, `${cookie}; ${cookie}`]) {
        assert.equal((await get('', value)).status, 401);
    }
    active = false;
    assert.equal((await get()).status, 403);
    assert.equal(reads, 0);
    active = true;
    const page = await get('?limit=2');
    assert.equal(page.status, 200);
    assert.equal(page.headers.get('cache-control'), 'no-store');
    assert.equal((await page.json()).items.length, 2);
    assert.equal((await get('?limit=2&limit=3')).status, 400);
    assert.equal(reads, 1);
    assert.equal((await fetch(`${base}/api/admin/sensor-points`, { headers: { Cookie: cookie } })).status, 404);
    await auth.logout(login.token, login.session.csrfToken);
    assert.equal((await get()).status, 401);
    const second = await auth.login({});
    now += 8 * 60 * 60 * 1000;
    assert.equal((await get('', `forest_admin_session=${second.token}`)).status, 401);
    assert.equal(reads, 1);
    assert.equal((await fetch(`${base}/api/help-requests`)).status, 404);
});

test('authorized listing without storage returns 503', async t => {
    const base = await serverFor(t, { adminAuth: { async current() { return { user: { role: 'admin' } }; } } });
    const response = await fetch(`${base}/api/admin/help-requests`, {
        headers: { Cookie: `forest_admin_session=${'a'.repeat(64)}` },
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, 'PERSISTENCE_UNAVAILABLE');
});

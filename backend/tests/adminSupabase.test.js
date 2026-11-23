import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { createAdminSessionsRepository } from '../src/repositories/adminSessions.js';
import { createPasswordVerifier } from '../src/services/supabase.js';

const user = { id: '9f28bf64-53eb-4e88-9c97-5376426d63c3', email: 'admin@example.test' };
const reply = (body, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
});

test('password verification uses fresh publishable-key clients and never returns provider tokens', async () => {
    let calls = 0;
    const verify = createPasswordVerifier({
        SUPABASE_URL: 'https://test.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    }, async (address, options) => {
        assert.equal(new URL(address).pathname, '/auth/v1/token');
        const headers = new Headers(options.headers);
        assert.equal(headers.get('apikey'), 'sb_publishable_test');
        assert.ok(!headers.get('authorization')?.includes('provider-token'));
        const credentials = JSON.parse(options.body);
        calls++;
        assert.equal(credentials.password, ' password with spaces ');
        return reply({
            user: { ...user, email: credentials.email },
            access_token: 'provider-token', refresh_token: 'private-refresh',
            token_type: 'bearer', expires_in: 3600,
        });
    });
    const first = await verify({ email: user.email, password: ' password with spaces ' });
    const second = await verify({ email: 'another@example.test', password: ' password with spaces ' });
    assert.equal(first.email, user.email);
    assert.equal(second.email, 'another@example.test');
    assert.equal(first.access_token, undefined);
    assert.equal(calls, 2);
});

test('provider denial and provider outages have safe, distinct error categories', async () => {
    const env = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' };
    const wrong = createPasswordVerifier(env, async () => reply({ msg: 'private account details' }, 400));
    await assert.rejects(wrong({ email: user.email, password: 'wrong' }), (error) => {
        assert.equal(error.status, 401);
        assert.equal(error.code, 'INVALID_CREDENTIALS');
        assert.ok(!error.message.includes('private account'));
        return true;
    });
    const unavailable = createPasswordVerifier(env, async () => reply({ msg: 'private provider details' }, 503));
    await assert.rejects(unavailable({ email: user.email, password: 'test' }), { status: 503, code: 'AUTH_UNAVAILABLE' });
    assert.equal(createPasswordVerifier({}), null);
    assert.throws(() => createPasswordVerifier({ ...env, SUPABASE_PUBLISHABLE_KEY: 'sb_secret_never-print-this' }), error => {
        assert.ok(!error.message.includes('never-print-this'));
        return true;
    });
});

function repositorySetup() {
    const rows = new Map();
    const control = { fail: false, active: true };
    const client = createClient('https://test.supabase.co', 'sb_secret_test', {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { async fetch(address, options) {
            const url = new URL(address);
            if (control.fail) return reply({ message: 'private SQL details' }, 403);
            if (url.pathname.startsWith('/auth/v1/admin/users/')) return reply({ user });
            if (url.pathname === '/rest/v1/admin_memberships') {
                assert.equal(url.searchParams.get('user_id'), `eq.${user.id}`);
                return reply([{ user_id: user.id, active: control.active }]);
            }
            assert.equal(url.pathname, '/rest/v1/admin_sessions');
            if (options.method === 'POST') {
                const row = JSON.parse(options.body);
                rows.set(row.session_hash, { ...row, revoked_at: null });
                return reply({ session_hash: row.session_hash }, 201);
            }
            const hash = url.searchParams.get('session_hash').replace(/^eq\./, '');
            const row = rows.get(hash);
            if (options.method === 'PATCH') {
                assert.equal(url.searchParams.get('revoked_at'), 'is.null');
                assert.ok(url.searchParams.get('expires_at').startsWith('gt.'));
                const change = JSON.parse(options.body);
                assert.deepEqual(Object.keys(change), ['revoked_at']);
                if (!row || row.revoked_at) return reply(null);
                row.revoked_at = change.revoked_at;
                return reply({ session_hash: hash });
            }
            return reply(row ? [{ ...row, admin_memberships: { active: control.active } }] : []);
        } },
    });
    return { repository: createAdminSessionsRepository(client), rows, control };
}

test('real SDK queries store, restore and revoke sessions using migration 008 fields', async () => {
    const { repository, control } = repositorySetup();
    assert.equal((await repository.getMembership(user.id)).active, true);
    const hash = createHash('sha256').update('test-cookie').digest('hex');
    const row = {
        session_hash: hash, user_id: user.id, csrf_token: 'a'.repeat(64),
        created_at: '2026-11-23T10:00:00.000Z', expires_at: '2026-11-23T18:00:00.000Z',
    };
    await repository.createSession(row);
    assert.equal((await repository.getSession(hash)).csrf_token, row.csrf_token);
    assert.equal((await repository.getUser(user.id)).email, user.email);
    control.active = false;
    assert.equal((await repository.getSession(hash)).admin_memberships.active, false);
    assert.equal(await repository.revokeSession(hash, '2026-11-23T11:00:00.000Z'), true);
    assert.equal(await repository.revokeSession(hash, '2026-11-23T11:00:01.000Z'), false);
});

test('permission/storage failures never masquerade as missing memberships or successful writes', async () => {
    const { repository, control } = repositorySetup();
    control.fail = true;
    for (const attempt of [
        () => repository.getMembership(user.id),
        () => repository.getSession('a'.repeat(64)),
        () => repository.createSession({ session_hash: 'a'.repeat(64) }),
        () => repository.revokeSession('a'.repeat(64), new Date().toISOString()),
    ]) {
        await assert.rejects(attempt(), (error) => {
            assert.equal(error.status, 503);
            assert.equal(error.code, 'PERSISTENCE_UNAVAILABLE');
            assert.ok(!error.message.includes('private SQL'));
            return true;
        });
    }
});

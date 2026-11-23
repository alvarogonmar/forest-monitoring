import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import { createApp } from '../src/app.js';
import { ApiError } from '../src/errors.js';
import { SESSION_COOKIE_NAME } from '../src/routes/auth.js';
import { createAdminAuth } from '../src/services/adminAuth.js';
import { validateAdminLogin } from '../src/validation/adminLogin.js';

const user = { id: '9f28bf64-53eb-4e88-9c97-5376426d63c3', email: 'admin@example.test' };
const credentials = { email: user.email, password: ' test password ' };
const origin = 'http://localhost:5173';
const sha256 = value => createHash('sha256').update(value).digest('hex');

function setup() {
    const clock = { value: Date.now() };
    const rows = new Map();
    const control = { active: true, failStore: false, failRead: false, providerDown: false, banned: false };
    const repository = {
        async getMembership(id) { return id === user.id ? { user_id: id, active: control.active } : null; },
        async createSession(row) {
            if (control.failStore) throw new ApiError(503, 'PERSISTENCE_UNAVAILABLE', 'Almacenamiento no disponible.');
            rows.set(row.session_hash, { ...row, revoked_at: null });
        },
        async getSession(hash) {
            if (control.failRead) throw new ApiError(503, 'PERSISTENCE_UNAVAILABLE', 'Almacenamiento no disponible.');
            const row = rows.get(hash);
            return row ? { ...row, admin_memberships: { active: control.active } } : null;
        },
        async getUser() { return { ...user, ...(control.banned ? { banned_until: new Date(clock.value + 60_000).toISOString() } : {}) }; },
        async revokeSession(hash, at) {
            const row = rows.get(hash);
            if (!row || row.revoked_at || Date.parse(row.expires_at) <= Date.parse(at)) return false;
            row.revoked_at = at;
            return true;
        },
    };
    const verifyPassword = async input => {
        if (control.providerDown) throw new ApiError(503, 'AUTH_UNAVAILABLE', 'Acceso no disponible.');
        return input.email === credentials.email && input.password === credentials.password ? { ...user } : null;
    };
    const auth = createAdminAuth({ repository, verifyPassword, now: () => clock.value });
    return { auth, rows, control, clock };
}

async function http(t, harness, secureCookies = false) {
    const server = createApp({ adminAuth: harness.auth, allowedOrigins: [origin], secureCookies }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}/api/auth`;
    const login = (body = credentials, headers = {}) => fetch(`${base}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...headers },
        body: JSON.stringify(body),
    });
    return { base, login };
}

test('login validation normalizes email but never trims or changes the password', () => {
    assert.deepEqual(validateAdminLogin({ email: ' ADMIN@EXAMPLE.TEST ', password: ' secret ' }), {
        email: 'admin@example.test', password: ' secret ',
    });
    for (const input of [{}, { ...credentials, password: '' }, { ...credentials, email: 'invalid' },
        { ...credentials, role: 'admin' }]) {
        assert.throws(() => validateAdminLogin(input), { code: 'VALIDATION_ERROR' });
    }
});

test('sessions contain only the cookie hash, have independent CSRF tokens and expire in eight hours', async () => {
    const { auth, rows, clock } = setup();
    const first = await auth.login(credentials);
    assert.match(first.token, /^[0-9a-f]{64}$/);
    const stored = rows.get(sha256(first.token));
    assert.ok(stored);
    assert.notEqual(stored.session_hash, first.token);
    assert.notEqual(stored.csrf_token, first.token);
    assert.equal(Date.parse(stored.expires_at) - Date.parse(stored.created_at), 8 * 60 * 60 * 1000);
    assert.deepEqual(Object.keys(first.session).sort(), ['csrfToken', 'expiresAt', 'user']);
    assert.equal(first.session.user.role, 'admin');
    const second = await auth.login(credentials);
    assert.notEqual(first.token, second.token);
    assert.deepEqual(await auth.current(first.token), first.session);
    clock.value += 8 * 60 * 60 * 1000;
    await assert.rejects(auth.current(first.token), { status: 401, code: 'AUTH_REQUIRED' });
});

test('wrong credentials and absent/inactive membership return the same generic login error', async () => {
    const { auth, control } = setup();
    await assert.rejects(auth.login({ ...credentials, password: 'wrong' }), { status: 401, code: 'INVALID_CREDENTIALS' });
    control.active = false;
    await assert.rejects(auth.login(credentials), { status: 401, code: 'INVALID_CREDENTIALS' });
    const noMembership = createAdminAuth({
        repository: { getMembership: async () => null }, verifyPassword: async () => user,
    });
    await assert.rejects(noMembership.login(credentials), { status: 401, code: 'INVALID_CREDENTIALS' });
});

test('membership removal, account bans, storage failures and malformed tokens fail closed', async () => {
    const { auth, control } = setup();
    const { token } = await auth.login(credentials);
    control.active = false;
    await assert.rejects(auth.current(token), { status: 403 });
    control.active = true;
    control.banned = true;
    await assert.rejects(auth.current(token), { status: 401 });
    control.banned = false;
    control.failRead = true;
    await assert.rejects(auth.current(token), { status: 503 });
    for (const value of [null, '', 'invalid', 'a'.repeat(63)]) {
        await assert.rejects(auth.current(value), { status: 401 });
    }
});

test('password-only login does not bypass verified MFA factors', async () => {
    let stored = false;
    const auth = createAdminAuth({
        verifyPassword: async () => ({ ...user, factors: [{ status: 'verified' }] }),
        repository: {
            getMembership: async () => ({ active: true }),
            createSession: async () => { stored = true; },
        },
    });
    await assert.rejects(auth.login(credentials), { status: 401, code: 'INVALID_CREDENTIALS' });
    assert.equal(stored, false);
});

test('HTTP login, session restore and CSRF-protected logout preserve the cookie/session contract', async (t) => {
    const harness = setup();
    const { base, login } = await http(t, harness);
    const response = await login(credentials, { Cookie: `${SESSION_COOKIE_NAME}=${'a'.repeat(64)}` });
    assert.equal(response.status, 200);
    const setCookie = response.headers.get('set-cookie');
    assert.ok(setCookie.includes('HttpOnly'));
    assert.ok(setCookie.includes('SameSite=Lax'));
    assert.ok(setCookie.includes('Path=/api'));
    const cookie = setCookie.split(';')[0];
    const token = cookie.split('=')[1];
    assert.notEqual(token, 'a'.repeat(64));
    const session = await response.json();
    assert.ok(!JSON.stringify(session).includes(token));
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    const restored = await fetch(`${base}/me`, { headers: { Cookie: cookie, Origin: origin } });
    assert.equal(restored.status, 200);
    assert.deepEqual(await restored.json(), session);
    const missingCsrf = await fetch(`${base}/logout`, { method: 'POST', headers: { Cookie: cookie, Origin: origin } });
    assert.equal(missingCsrf.status, 403);
    const foreign = await fetch(`${base}/logout`, { method: 'POST', headers: {
        Cookie: cookie, Origin: 'https://untrusted.example', 'X-CSRF-Token': session.csrfToken,
    } });
    assert.equal(foreign.status, 403);
    const logout = await fetch(`${base}/logout`, { method: 'POST', headers: {
        Cookie: cookie, Origin: origin, 'X-CSRF-Token': session.csrfToken,
    } });
    assert.equal(logout.status, 204);
    assert.ok(logout.headers.get('set-cookie').includes(`${SESSION_COOKIE_NAME}=;`));
    assert.ok(harness.rows.get(sha256(token)).revoked_at);
    const revoked = await fetch(`${base}/me`, { headers: { Cookie: cookie } });
    assert.equal(revoked.status, 401);
});

test('login errors never set a session cookie; production cookies are Secure', async (t) => {
    const harness = setup();
    const { login } = await http(t, harness, true);
    const invalid = await login({ ...credentials, password: 'wrong' });
    assert.equal(invalid.status, 401);
    assert.equal(invalid.headers.get('set-cookie'), null);
    harness.control.failStore = true;
    const failedStore = await login();
    assert.equal(failedStore.status, 503);
    assert.equal(failedStore.headers.get('set-cookie'), null);
    harness.control.failStore = false;
    harness.control.providerDown = true;
    const failedProvider = await login();
    assert.equal(failedProvider.status, 503);
    assert.equal(failedProvider.headers.get('set-cookie'), null);
    harness.control.providerDown = false;
    const good = await login();
    assert.equal(good.status, 200);
    assert.ok(good.headers.get('set-cookie').includes('Secure'));
});

test('HTTP rejects foreign origins, missing auth, duplicate cookies and invalid JSON fields', async (t) => {
    const { auth } = setup();
    const { base, login } = await http(t, { auth });
    assert.equal((await login(credentials, { Origin: 'https://untrusted.example' })).status, 403);
    assert.equal((await login({})).status, 400);
    assert.equal((await fetch(`${base}/login`, { method: 'POST' })).status, 415);
    assert.equal((await fetch(`${base}/me`)).status, 401);
    const response = await login();
    const cookie = response.headers.get('set-cookie').split(';')[0];
    const duplicate = await fetch(`${base}/me`, { headers: { Cookie: `${cookie}; ${cookie}` } });
    assert.equal(duplicate.status, 401);
});

test('login rate limit rejects the eleventh attempt and supplies Retry-After', async (t) => {
    const { login } = await http(t, setup());
    for (let i = 0; i < 10; i++) {
        assert.equal((await login({ ...credentials, password: 'wrong' })).status, 401);
    }
    const limited = await login();
    assert.equal(limited.status, 429);
    assert.equal((await limited.json()).error.code, 'RATE_LIMITED');
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
});

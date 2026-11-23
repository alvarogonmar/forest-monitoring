import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { ApiError } from '../errors.js';

const LIFETIME_MS = 8 * 60 * 60 * 1000;
const isToken = token => typeof token === 'string' && /^[0-9a-f]{64}$/.test(token);
const hashToken = token => createHash('sha256').update(token).digest('hex');
const unauthorized = () => new ApiError(401, 'AUTH_REQUIRED', 'Inicia sesión para continuar.');
const invalidCredentials = () => new ApiError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
const availableUser = (user, now) => user?.id && user.email && !user.deleted_at
    && !(user.banned_until && Date.parse(user.banned_until) > now)
    // This password-only MVP must not silently bypass an enrolled MFA factor.
    && !user.factors?.some(factor => factor.status === 'verified');
const publicSession = (user, row) => ({
    user: { id: user.id, email: user.email, role: 'admin' },
    expiresAt: row.expires_at,
    csrfToken: row.csrf_token,
});

export function createAdminAuth({ repository, verifyPassword, now = Date.now }) {
    async function load(token) {
        if (!isToken(token)) throw unauthorized();
        const hash = hashToken(token);
        const row = await repository.getSession(hash);
        if (!row || row.revoked_at !== null
            || !Number.isFinite(Date.parse(row.expires_at)) || Date.parse(row.expires_at) <= now()) {
            throw unauthorized();
        }
        if (row.admin_memberships?.active !== true) {
            throw new ApiError(403, 'FORBIDDEN', 'La cuenta no tiene acceso administrativo.');
        }
        const user = await repository.getUser(row.user_id);
        if (!availableUser(user, now()) || user.id !== row.user_id) throw unauthorized();
        return { hash, row, user };
    }

    return {
        async login(credentials) {
            if (!verifyPassword) {
                throw new ApiError(503, 'AUTH_UNAVAILABLE', 'Falta configurar la verificación de acceso en el servidor.');
            }
            const user = await verifyPassword(credentials);
            if (!availableUser(user, now())) throw invalidCredentials();
            const membership = await repository.getMembership(user.id);
            if (membership?.active !== true) throw invalidCredentials();

            const token = randomBytes(32).toString('hex');
            const createdAt = now();
            const row = {
                session_hash: hashToken(token), user_id: user.id,
                csrf_token: randomBytes(32).toString('hex'),
                created_at: new Date(createdAt).toISOString(),
                expires_at: new Date(createdAt + LIFETIME_MS).toISOString(),
            };
            // Never return a cookie if persistence fails or its outcome is uncertain.
            await repository.createSession(row);
            return { token, session: publicSession(user, row) };
        },

        async current(token) {
            const { row, user } = await load(token);
            return publicSession(user, row);
        },

        async logout(token, csrfToken) {
            const { hash, row } = await load(token);
            if (!isToken(csrfToken) || !isToken(row.csrf_token)
                || !timingSafeEqual(Buffer.from(csrfToken, 'hex'), Buffer.from(row.csrf_token, 'hex'))) {
                throw new ApiError(403, 'CSRF_INVALID', 'La verificación de la sesión no es válida.');
            }
            const revoked = await repository.revokeSession(hash, new Date(now()).toISOString());
            if (!revoked) throw unauthorized();
        },
    };
}

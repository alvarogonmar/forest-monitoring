import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { ApiError } from '../errors.js';
import { validateAdminLogin } from '../validation/adminLogin.js';
import { SESSION_COOKIE_NAME, readSessionCookie } from '../middleware/adminSession.js';
export { SESSION_COOKIE_NAME } from '../middleware/adminSession.js';

export function createAuthRouter({ authService, allowedOrigins, secureCookies }) {
    const router = Router();
    const cookieOptions = { httpOnly: true, secure: secureCookies, sameSite: 'lax', path: '/api' };
    const service = () => {
        if (!authService) throw new ApiError(503, 'AUTH_UNAVAILABLE', 'El acceso administrativo no está configurado.');
        return authService;
    };
    const checkOrigin = (request, _response, next) => {
        const origin = request.get('origin');
        const site = request.get('sec-fetch-site');
        if ((origin && !allowedOrigins.includes(origin))
            || (!origin && site && !['same-origin', 'none'].includes(site))) {
            throw new ApiError(403, 'FORBIDDEN', 'El origen de la petición no está permitido.');
        }
        // CLI clients without browser Origin/Fetch Metadata headers are permitted.
        next();
    };
    const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
        handler: (_request, response) => response.status(429).json({
            error: { code: 'RATE_LIMITED', message: 'Demasiados intentos de acceso. Espera antes de reintentar.' },
        }),
    });

    router.post('/login', loginLimiter, checkOrigin, async (request, response) => {
        if (!request.is('application/json')) {
            throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Envía las credenciales en formato JSON.');
        }
        const credentials = validateAdminLogin(request.body);
        const { token, session } = await service().login(credentials);
        response.cookie(SESSION_COOKIE_NAME, token, { ...cookieOptions, expires: new Date(session.expiresAt) });
        response.json(session);
    });

    router.get('/me', async (request, response) => {
        const session = await service().current(readSessionCookie(request));
        response.json(session);
    });

    router.post('/logout', checkOrigin, async (request, response) => {
        await service().logout(readSessionCookie(request), request.get('X-CSRF-Token'));
        response.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
        response.status(204).end();
    });

    return router;
}

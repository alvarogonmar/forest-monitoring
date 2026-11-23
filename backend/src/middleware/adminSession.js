import { ApiError } from '../errors.js';

export const SESSION_COOKIE_NAME = 'forest_admin_session';

export function readSessionCookie(request) {
    const values = (request.get('cookie') ?? '').split(';').map(part => part.trim())
        .filter(part => part.startsWith(`${SESSION_COOKIE_NAME}=`));
    return values.length === 1 ? values[0].slice(SESSION_COOKIE_NAME.length + 1) : null;
}

export function requireAdmin(authService) {
    return async (request, _response, next) => {
        const token = readSessionCookie(request);
        if (!token || !/^[0-9a-f]{64}$/.test(token)) {
            throw new ApiError(401, 'AUTH_REQUIRED', 'Inicia sesión para continuar.');
        }
        if (!authService) {
            throw new ApiError(503, 'AUTH_UNAVAILABLE', 'El acceso administrativo no está configurado.');
        }
        request.adminSession = await authService.current(token);
        next();
    };
}

import { createClient } from '@supabase/supabase-js';
import { ApiError } from '../errors.js';

function checkedProjectUrl(projectUrl) {
    let url;
    try { url = new URL(projectUrl); } catch {
        throw new Error('SUPABASE_URL debe ser la Project URL de tu proyecto.');
    }
    if (url.protocol !== 'https:' || url.username || url.password
        || url.pathname !== '/' || url.search || url.hash) {
        throw new Error('SUPABASE_URL debe ser una URL HTTPS sin rutas, parámetros ni credenciales.');
    }
    return url.origin;
}

function timedFetch(fetchImpl) {
    return (input, init) => fetchImpl(input, {
        ...init,
        signal: AbortSignal.any([AbortSignal.timeout(10_000), ...(init?.signal ? [init.signal] : [])]),
    });
}

const authOptions = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

export function createSupabaseClient(env = process.env) {
    const projectUrl = env.SUPABASE_URL?.trim();
    const secretKey = env.SUPABASE_SECRET_KEY?.trim();
    if (!projectUrl && !secretKey) return null;
    if (!projectUrl || !secretKey) {
        throw new Error('Completa SUPABASE_URL y SUPABASE_SECRET_KEY en backend/.env.');
    }

    const url = checkedProjectUrl(projectUrl);
    if (!secretKey.startsWith('sb_secret_')) {
        throw new Error('SUPABASE_SECRET_KEY debe ser una clave de tipo Secret key (sb_secret_).');
    }

    // Dedicated privileged client. Never use it to sign a user in or persist sessions.
    return createClient(url, secretKey, {
        auth: { ...authOptions }, global: { fetch: timedFetch(globalThis.fetch) },
    });
}

export function createPasswordVerifier(env = process.env, fetchImpl = globalThis.fetch) {
    const publishableKey = env.SUPABASE_PUBLISHABLE_KEY?.trim();
    if (!publishableKey) return null;
    if (!publishableKey.startsWith('sb_publishable_')) {
        throw new Error('SUPABASE_PUBLISHABLE_KEY debe ser una Publishable key (sb_publishable_).');
    }
    const url = checkedProjectUrl(env.SUPABASE_URL?.trim());
    return async credentials => {
        try {
            // A fresh nonprivileged client per attempt prevents cross-user session state.
            const client = createClient(url, publishableKey, {
                auth: { ...authOptions }, global: { fetch: timedFetch(fetchImpl) },
            });
            const { data, error } = await client.auth.signInWithPassword(credentials);
            if (error) {
                if (!error.status || error.status === 429 || error.status >= 500) {
                    throw new ApiError(503, 'AUTH_UNAVAILABLE', 'El servicio de acceso no está disponible. Inténtalo de nuevo.');
                }
                throw new ApiError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
            }
            return data.user;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(503, 'AUTH_UNAVAILABLE', 'El servicio de acceso no está disponible. Inténtalo de nuevo.');
        }
    };
}

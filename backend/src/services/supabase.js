import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient(env = process.env) {
    const projectUrl = env.SUPABASE_URL?.trim();
    const secretKey = env.SUPABASE_SECRET_KEY?.trim();
    if (!projectUrl && !secretKey) return null;
    if (!projectUrl || !secretKey) {
        throw new Error('Completa SUPABASE_URL y SUPABASE_SECRET_KEY en backend/.env.');
    }

    let url;
    try {
        url = new URL(projectUrl);
    } catch {
        throw new Error('SUPABASE_URL debe ser la Project URL de tu proyecto.');
    }
    if (url.protocol !== 'https:' || url.username || url.password
        || url.pathname !== '/' || url.search || url.hash) {
        throw new Error('SUPABASE_URL debe ser una URL HTTPS sin rutas, parámetros ni credenciales.');
    }
    if (!secretKey.startsWith('sb_secret_')) {
        throw new Error('SUPABASE_SECRET_KEY debe ser una clave de tipo Secret key (sb_secret_).');
    }

    // Dedicated privileged client. Never use it to sign a user in or persist sessions.
    return createClient(url.origin, secretKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
}

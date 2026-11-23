import { ApiError } from '../errors.js';

const unavailable = () => new ApiError(503, 'PERSISTENCE_UNAVAILABLE',
    'No se pudo comprobar o guardar la sesión. Inténtalo de nuevo.');

async function query(build) {
    try {
        const result = await build().abortSignal(AbortSignal.timeout(10_000));
        if (result.error) throw unavailable();
        return result.data;
    } catch {
        throw unavailable();
    }
}

export function createAdminSessionsRepository(supabase) {
    return {
        getMembership: userId => query(() => supabase.from('admin_memberships')
            .select('user_id,active').eq('user_id', userId).maybeSingle()),

        async createSession(row) {
            const saved = await query(() => supabase.from('admin_sessions')
                .insert(row).select('session_hash').single());
            if (saved?.session_hash !== row.session_hash) throw unavailable();
        },

        getSession: hash => query(() => supabase.from('admin_sessions')
            .select('user_id,csrf_token,created_at,expires_at,revoked_at,admin_memberships(active)')
            .eq('session_hash', hash).maybeSingle()),

        async revokeSession(hash, at) {
            const saved = await query(() => supabase.from('admin_sessions')
                .update({ revoked_at: at }).eq('session_hash', hash)
                .is('revoked_at', null).gt('expires_at', at)
                .select('session_hash').maybeSingle());
            return saved?.session_hash === hash;
        },

        async getUser(userId) {
            try {
                const { data, error } = await supabase.auth.admin.getUserById(userId);
                if (error?.status === 404) return null;
                if (error) throw new Error();
                return data.user;
            } catch {
                throw new ApiError(503, 'AUTH_UNAVAILABLE', 'No se pudo comprobar el usuario. Inténtalo de nuevo.');
            }
        },
    };
}

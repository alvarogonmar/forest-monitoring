import { ApiError } from '../errors.js';
import { encodeHelpRequestsCursor } from '../validation/adminHelpRequests.js';

const unavailable = () => new ApiError(503, 'PERSISTENCE_UNAVAILABLE',
    'No pudimos confirmar el guardado. Conserva la solicitud y reintenta con el mismo ID.');

async function runQuery(buildQuery) {
    try {
        return await buildQuery().abortSignal(AbortSignal.timeout(10_000));
    } catch {
        throw unavailable();
    }
}

function receiptFrom(row, expectedId) {
    if (row?.id !== expectedId || !Number.isFinite(Date.parse(row.received_at))) {
        throw unavailable();
    }
    return { id: row.id, confirmedAt: new Date(row.received_at).toISOString() };
}

export function createHelpRequestsRepository(supabase) {
    return {
        async list(filters) {
            const { from, to, limit, cursor } = filters;
            try {
                let query = supabase.from('help_requests')
                    .select('id,created_at,received_at,latitude,longitude,accuracy,location_captured_at', { count: 'exact' })
                    .order('received_at', { ascending: false }).order('id', { ascending: false })
                    .limit(limit + 1);
                if (from) query = query.gte('created_at', from);
                if (to) query = query.lt('created_at', to);
                if (cursor) {
                    // Cursor values are validated before reaching this PostgREST expression.
                    query = query.or(`received_at.lt."${cursor.receivedAt}",and(received_at.eq."${cursor.receivedAt}",id.lt.${cursor.id})`);
                }
                const { data, error, count } = await query.abortSignal(AbortSignal.timeout(10_000));
                if (error || !Array.isArray(data) || !Number.isInteger(count)
                    || count < data.length || (count > 0 && data.length === 0)) throw new Error();
                const rows = data.slice(0, limit);
                const items = rows.map(row => ({
                    id: row.id,
                    createdAt: new Date(row.created_at).toISOString(),
                    receivedAt: new Date(row.received_at).toISOString(),
                    coordinates: {
                        latitude: row.latitude, longitude: row.longitude, accuracy: row.accuracy,
                        capturedAt: new Date(row.location_captured_at).toISOString(),
                    },
                }));
                return {
                    items,
                    nextCursor: count > rows.length ? encodeHelpRequestsCursor(rows.at(-1), filters) : null,
                };
            } catch {
                throw new ApiError(503, 'PERSISTENCE_UNAVAILABLE', 'No pudimos consultar las solicitudes. Reintenta.');
            }
        },

        async save(request) {
            // Input has already been validated. Never accept a client receipt or status.
            const row = {
                id: request.id,
                created_at: request.createdAt,
                latitude: request.coordinates.latitude,
                longitude: request.coordinates.longitude,
                accuracy: request.coordinates.accuracy,
                location_captured_at: request.coordinates.capturedAt,
            };
            const inserted = await runQuery(() => supabase.from('help_requests')
                .insert(row).select('id,received_at').single());

            if (!inserted.error) {
                return { created: true, receipt: receiptFrom(inserted.data, request.id) };
            }
            // PostgreSQL's unique constraint also protects concurrent retries.
            if (inserted.error.code !== '23505') throw unavailable();

            const existing = await runQuery(() => supabase.from('help_requests')
                .select('id,created_at,latitude,longitude,accuracy,location_captured_at,received_at')
                .eq('id', request.id).single());
            if (existing.error || !existing.data) throw unavailable();

            const saved = existing.data;
            const matches = saved.id === row.id
                && Date.parse(saved.created_at) === Date.parse(row.created_at)
                && Date.parse(saved.location_captured_at) === Date.parse(row.location_captured_at)
                && saved.latitude === row.latitude && saved.longitude === row.longitude
                && saved.accuracy === row.accuracy;
            if (!matches) {
                throw new ApiError(409, 'EVENT_ID_CONFLICT',
                    'Ese identificador ya pertenece a una solicitud con otros datos.');
            }
            return { created: false, receipt: receiptFrom(saved, request.id) };
        },
    };
}

import { z } from 'zod';
import { ApiError } from '../errors.js';

const filterDate = z.iso.datetime().regex(/T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/)
    .transform(value => new Date(value).toISOString());
const querySchema = z.strictObject({
    from: filterDate.optional(),
    to: filterDate.optional(),
    limit: z.string().regex(/^[1-9]\d{0,2}$/).transform(Number)
        .pipe(z.number().max(100)).optional(),
    cursor: z.string().min(1).max(2048).regex(/^[A-Za-z0-9_-]+$/).optional(),
});
const cursorSchema = z.strictObject({
    v: z.literal(1),
    // Keep PostgreSQL microseconds: rounding here would skip records between pages.
    receivedAt: z.iso.datetime({ offset: true })
        .regex(/T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/),
    id: z.uuid().transform(value => value.toLowerCase()),
    from: filterDate.nullable(),
    to: filterDate.nullable(),
    limit: z.number().int().min(1).max(100),
});
const invalid = fields => new ApiError(400, 'VALIDATION_ERROR', 'Revisa los filtros del listado.', fields);

export function validateAdminHelpRequests(input) {
    const parsed = querySchema.safeParse(input);
    if (!parsed.success) {
        throw invalid(Object.fromEntries(parsed.error.issues.map(issue => [
            issue.path.join('.') || 'query', 'Valor de consulta inválido.',
        ])));
    }
    const { from = null, to = null, limit = 50, cursor } = parsed.data;
    if (from && to && from >= to) throw invalid({ to: 'Debe ser posterior a from.' });
    let boundary = null;
    if (cursor) {
        try {
            const bytes = Buffer.from(cursor, 'base64url');
            if (bytes.toString('base64url') !== cursor) throw new Error();
            boundary = cursorSchema.parse(JSON.parse(bytes.toString('utf8')));
            if (boundary.from !== from || boundary.to !== to || boundary.limit !== limit) throw new Error();
        } catch {
            throw invalid({ cursor: 'Cursor inválido o incompatible con los filtros y el límite.' });
        }
    }
    return { from, to, limit, cursor: boundary };
}

export function encodeHelpRequestsCursor(row, { from, to, limit }) {
    const value = cursorSchema.parse({ v: 1, receivedAt: row.received_at, id: row.id, from, to, limit });
    return Buffer.from(JSON.stringify(value)).toString('base64url');
}

import { z } from 'zod';
import { ApiError } from '../errors.js';

const utcDate = z.iso.datetime({ error: 'Debe ser una fecha UTC válida terminada en Z.' })
    .refine((value) => Date.parse(value) <= Date.now() + 5 * 60_000,
        { error: 'La fecha no puede estar adelantada más de cinco minutos.' })
    .transform((value) => new Date(value).toISOString());

const coordinate = (limit) => z.number({ error: 'Debe ser un número finito.' })
    .min(-limit, `Debe ser mayor o igual a ${-limit}.`)
    .max(limit, `Debe ser menor o igual a ${limit}.`);

const helpRequestSchema = z.strictObject({
    id: z.uuid({ version: 'v4', error: 'Debe ser un UUID v4 válido.' })
        .transform((value) => value.toLowerCase()),
    createdAt: utcDate,
    coordinates: z.strictObject({
        latitude: coordinate(90),
        longitude: coordinate(180),
        accuracy: z.number({ error: 'Debe ser un número finito o null.' })
            .nonnegative('La precisión no puede ser negativa.').nullable(),
        capturedAt: utcDate,
    }, { error: 'La ubicación debe ser un objeto con sólo los campos permitidos.' }),
}, { error: 'Envía un objeto JSON con sólo los campos permitidos.' });

export function validateHelpRequest(input) {
    const result = helpRequestSchema.safeParse(input);
    if (result.success) return result.data;

    const fields = Object.fromEntries(result.error.issues.map((issue) => [
        issue.path.join('.') || 'body', issue.message,
    ]));
    throw new ApiError(400, 'VALIDATION_ERROR', 'Revisa los datos de la solicitud.', fields);
}

import { z } from 'zod';
import { ApiError } from '../errors.js';

const schema = z.strictObject({
    email: z.string({ error: 'Incluye el correo.' }).trim().toLowerCase()
        .pipe(z.email({ error: 'Escribe un correo válido.' }).max(254, 'El correo es demasiado largo.')),
    // Preserve the password exactly as entered, including spaces.
    password: z.string({ error: 'Incluye la contraseña.' })
        .min(1, 'Incluye la contraseña.').max(1024, 'La contraseña es demasiado larga.'),
}, { error: 'Envía únicamente correo y contraseña como un objeto JSON.' });

export function validateAdminLogin(input) {
    const result = schema.safeParse(input);
    if (result.success) return result.data;
    const fields = Object.fromEntries(result.error.issues.map(issue => [
        issue.path.join('.') || 'body', issue.message,
    ]));
    throw new ApiError(400, 'VALIDATION_ERROR', 'Revisa los datos de acceso.', fields);
}

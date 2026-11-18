import express from 'express';
import { ApiError } from './errors.js';
import { validateHelpRequest } from './validation/helpRequest.js';

export function createApp({ routesRepository = null } = {}) {
    const app = express();
    app.disable('x-powered-by');

    app.use('/api', (_request, response, next) => {
        response.set('Cache-Control', 'no-store');
        next();
    });
    app.use(express.json({ limit: '16kb' }));

    // Process liveness only: this does not confirm database connectivity.
    app.get('/api/health', (_request, response) => {
        response.json({ status: 'ok' });
    });

    app.get('/api/routes', async (_request, response) => {
        if (!routesRepository) {
            throw new ApiError(503, 'PERSISTENCE_UNAVAILABLE', 'La conexión con la base de datos todavía no está configurada.');
        }
        const items = await routesRepository.getRoutes();
        response.json({ items });
    });

    app.post('/api/help-requests', (request, response) => {
        if (!request.is('application/json')) {
            throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Envía la solicitud en formato JSON.');
        }

        validateHelpRequest(request.body);

        response.status(501).json({
            error: {
                code: 'NOT_IMPLEMENTED',
                message: 'La recepción de solicitudes está en construcción.',
            },
        });
    });

    app.use((_request, response) => {
        response.status(404).json({
            error: { code: 'NOT_FOUND', message: 'El recurso solicitado no existe.' },
        });
    });

    app.use((error, _request, response, _next) => {
        if (error instanceof ApiError) {
            return response.status(error.status).json({
                error: {
                    code: error.code,
                    message: error.message,
                    ...(error.fields ? { fields: error.fields } : {}),
                },
            });
        }
        if (error.type === 'entity.too.large') {
            return response.status(413).json({
                error: { code: 'PAYLOAD_TOO_LARGE', message: 'El cuerpo de la petición es demasiado grande.' },
            });
        }
        if (error.status === 415) {
            return response.status(415).json({
                error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'El formato de la petición no es compatible.' },
            });
        }
        if (error.status === 400) {
            return response.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'La petición contiene datos inválidos.' },
            });
        }
        // Do not include request bodies, stack traces or infrastructure errors.
        console.error('Error interno al procesar una petición.');
        return response.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'No se pudo completar la petición.' },
        });
    });

    return app;
}

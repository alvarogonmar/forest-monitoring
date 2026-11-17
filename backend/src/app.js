import express from 'express';
import { ApiError } from './errors.js';

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

    app.use((_request, response) => {
        response.status(404).json({
            error: { code: 'NOT_FOUND', message: 'El recurso solicitado no existe.' },
        });
    });

    app.use((error, _request, response, _next) => {
        if (error instanceof ApiError) {
            return response.status(error.status).json({
                error: { code: error.code, message: error.message },
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

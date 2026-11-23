import { Router } from 'express';
import { ApiError } from '../errors.js';
import { requireAdmin } from '../middleware/adminSession.js';
import { validateAdminHelpRequests } from '../validation/adminHelpRequests.js';

export function createAdminRouter({ authService, helpRequestsRepository }) {
    const router = Router();
    router.use(requireAdmin(authService));
    router.get('/help-requests', async (request, response) => {
        const filters = validateAdminHelpRequests(request.query);
        if (!helpRequestsRepository) {
            throw new ApiError(503, 'PERSISTENCE_UNAVAILABLE', 'El listado no está disponible.');
        }
        response.json(await helpRequestsRepository.list(filters));
    });
    return router;
}

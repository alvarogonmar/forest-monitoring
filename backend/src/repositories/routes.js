import { ApiError } from '../errors.js';

function invalidRoute() {
    return new ApiError(500, 'ROUTE_CONFIGURATION_INVALID', 'Hay un sendero con un recorrido incompleto o inválido.');
}

export function createRoutesRepository(supabase) {
    return {
        async getRoutes() {
            let result;
            try {
                // One query for route metadata and its geometry. Never select sensors or requests.
                result = await supabase.from('routes')
                    .select('id,name,color,route_path_points(position,latitude,longitude)', { count: 'exact' })
                    .order('id', { ascending: true })
                    .abortSignal(AbortSignal.timeout(10_000));
            } catch {
                throw new ApiError(503, 'PERSISTENCE_UNAVAILABLE', 'No se pudieron consultar los senderos. Inténtalo de nuevo.');
            }
            if (result.error || !Array.isArray(result.data) || result.count !== result.data.length) {
                throw new ApiError(503, 'PERSISTENCE_UNAVAILABLE', 'No se pudieron consultar todos los senderos. Inténtalo de nuevo.');
            }

            return result.data.map((route) => {
                const points = route.route_path_points;
                if (!Array.isArray(points) || points.length < 2) throw invalidRoute();
                const positions = new Set();
                for (const point of points) {
                    if (!point || !Number.isInteger(point.position) || point.position < 0
                        || positions.has(point.position)
                        || !Number.isFinite(point.latitude) || Math.abs(point.latitude) > 90
                        || !Number.isFinite(point.longitude) || Math.abs(point.longitude) > 180) {
                        throw invalidRoute();
                    }
                    positions.add(point.position);
                }
                // Explicit public projection: do not expose occupancy settings or private records.
                return {
                    id: route.id,
                    name: route.name,
                    color: route.color,
                    coordinates: [...points].sort((a, b) => a.position - b.position)
                        .map((point) => [point.latitude, point.longitude]),
                };
            });
        },
    };
}

-- DEVELOPMENT ONLY: fictional locations copied from web/src/data/sensorPoints.js.
-- Run once after migration 003 and seeds/001_demo_routes.sql, as the database owner.
-- Existing IDs cause the transaction to fail; no existing locations are overwritten.
begin;

insert into public.sensor_points (id, route_id, latitude, longitude)
values
    ('P-01', 'pino', 20.67, -103.566),
    ('P-02', 'pino', 20.674, -103.556),
    ('P-03', 'encino', 20.662, -103.55),
    ('P-04', 'encino', 20.666, -103.541),
    ('P-05', 'mirador', 20.654, -103.563),
    ('P-06', 'mirador', 20.657, -103.551);

commit;

-- Expected result: six monitoring points with their corresponding trail names.
select p.id, p.route_id, r.name as route_name, p.latitude, p.longitude
from public.sensor_points as p
join public.routes as r on r.id = p.route_id
where p.id in ('P-01', 'P-02', 'P-03', 'P-04', 'P-05', 'P-06')
order by p.id;

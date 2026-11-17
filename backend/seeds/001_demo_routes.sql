-- DEVELOPMENT ONLY: fictional trails copied from web/src/data/routes.js.
-- Run once after migration 002, as the project database owner.
-- Existing IDs cause the transaction to fail; no existing catalog is overwritten.
begin;

insert into public.routes (id, name, color)
values
    ('pino', 'Sendero del Pino', '#245e2c'),
    ('encino', 'Sendero del Encino', '#d69a20'),
    ('mirador', 'Sendero del Mirador', '#3e86a8');

insert into public.route_path_points (route_id, position, latitude, longitude)
values
    ('pino', 0, 20.668, -103.569),
    ('pino', 1, 20.67, -103.566),
    ('pino', 2, 20.669, -103.563),
    ('pino', 3, 20.672, -103.56),
    ('pino', 4, 20.674, -103.556),
    ('pino', 5, 20.673, -103.552),
    ('encino', 0, 20.66, -103.552),
    ('encino', 1, 20.662, -103.55),
    ('encino', 2, 20.664, -103.547),
    ('encino', 3, 20.663, -103.544),
    ('encino', 4, 20.666, -103.541),
    ('encino', 5, 20.668, -103.539),
    ('mirador', 0, 20.651, -103.566),
    ('mirador', 1, 20.654, -103.563),
    ('mirador', 2, 20.655, -103.559),
    ('mirador', 3, 20.654, -103.555),
    ('mirador', 4, 20.657, -103.551),
    ('mirador', 5, 20.656, -103.547);

commit;

-- Expected result: three trails with six path points each.
select r.id, r.name, count(p.position) as path_point_count
from public.routes as r
left join public.route_path_points as p on p.route_id = r.id
where r.id in ('pino', 'encino', 'mirador')
group by r.id, r.name
order by r.id;

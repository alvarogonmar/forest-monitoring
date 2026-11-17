-- DEVELOPMENT ONLY: use the existing fictional Pino trail to demonstrate occupancy.
-- Run once after migration 005 and both earlier demo seeds, as the database owner.
-- These example assignments are not the confirmed physical wiring/location mapping.
begin;

do $$
begin
    if (select count(*) from public.sensor_points
        where route_id = 'pino' and id in ('P-01', 'P-02')) <> 2 then
        raise exception 'Missing Pino demo points: run demo routes and sensor seeds first.';
    end if;
end;
$$;

update public.routes
set occupancy_timeout_seconds = 120
where id = 'pino';

update public.sensor_points
set occupancy_role = case id
    when 'P-01' then 'entry'
    when 'P-02' then 'exit'
end
where route_id = 'pino' and id in ('P-01', 'P-02');

-- Other points retain their default 'unassigned' role; do not assign a role to IR 3.
commit;

select p.id, p.route_id, p.occupancy_role, r.occupancy_timeout_seconds
from public.sensor_points as p
join public.routes as r on r.id = p.route_id
where p.route_id = 'pino'
order by p.id;

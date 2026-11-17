-- Run once after migration 002, as the project database owner.
begin;

create table public.sensor_points (
    id text primary key,
    route_id text not null references public.routes (id),
    latitude double precision not null,
    longitude double precision not null,

    constraint sensor_points_id_valid
        check (char_length(id) <= 64 and id ~ '^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$'),
    constraint sensor_points_latitude_valid
        check (latitude between -90 and 90),
    constraint sensor_points_longitude_valid
        check (longitude between -180 and 180)
);

create index sensor_points_route_id_idx
    on public.sensor_points (route_id);

alter table public.sensor_points enable row level security;

revoke all privileges on table public.sensor_points
    from public, anon, authenticated, service_role;

-- Express checks administrative permissions before returning sensor locations.
-- Catalog changes remain owner-managed; there are no client editing endpoints.
grant select on table public.sensor_points to service_role;

comment on table public.sensor_points is
    'Monitoring locations belonging to trails. Private administrative data, separate from trail geometry.';
comment on column public.sensor_points.id is
    'Stable monitoring point identifier, such as P-01; independent of a device credential.';
comment on column public.sensor_points.route_id is
    'Existing trail to which detections at this monitoring point will contribute.';

commit;

-- Expected result: four columns, all NOT NULL.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'sensor_points'
order by ordinal_position;

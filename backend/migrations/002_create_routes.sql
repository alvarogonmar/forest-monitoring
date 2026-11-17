-- Run once after 001_create_help_requests.sql, as the project database owner.
begin;

create table public.routes (
    id text primary key,
    name text not null,
    color text not null,

    constraint routes_id_valid
        check (char_length(id) <= 64 and id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    constraint routes_name_valid
        check (char_length(btrim(name)) between 1 and 120),
    constraint routes_color_valid
        check (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Ordered coordinates forming the trail, not sensor locations.
create table public.route_path_points (
    route_id text not null references public.routes (id),
    position integer not null,
    latitude double precision not null,
    longitude double precision not null,

    primary key (route_id, position),
    constraint route_path_points_position_valid
        check (position >= 0),
    constraint route_path_points_latitude_valid
        check (latitude between -90 and 90),
    constraint route_path_points_longitude_valid
        check (longitude between -180 and 180)
);

alter table public.routes enable row level security;
alter table public.route_path_points enable row level security;

revoke all privileges on table public.routes, public.route_path_points
    from public, anon, authenticated, service_role;

-- The public website reads routes through Express. Catalog editing is out of scope.
grant select on table public.routes, public.route_path_points to service_role;

comment on table public.routes is
    'Trail catalog. A route must have at least two ordered path points before API publication.';
comment on table public.route_path_points is
    'Ordered trail geometry, independent of sensor points. API assembles [latitude, longitude] pairs.';
comment on column public.route_path_points.position is
    'Nonnegative ordering within a route; unique per route. Read in ascending order.';

commit;

-- Run once after migrations 001-004, as the project database owner.
-- Configuration only: event processing and alert evaluation are not implemented.
begin;

alter table public.routes
    add column occupancy_timeout_seconds integer not null default 120,
    add constraint routes_occupancy_timeout_positive
        check (occupancy_timeout_seconds > 0);

alter table public.sensor_points
    add column occupancy_role text not null default 'unassigned',
    add constraint sensor_points_occupancy_role_valid
        check (occupancy_role in ('entry', 'exit', 'unassigned'));

comment on column public.routes.occupancy_timeout_seconds is
    'Total time allowed from an unmatched entry before a possible overdue alert. 120 seconds is a prototype default, not a validated traversal duration.';
comment on column public.sensor_points.occupancy_role is
    'Trusted configuration: entry adds one, exit resolves a pending entry, unassigned has no occupancy effect. Does not identify an individual.';

commit;

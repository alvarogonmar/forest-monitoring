-- Run once after migrations 001-005, as the project database owner.
-- Append-only event history; no occupancy balance or alert evaluator is created.
begin;

create table public.detections (
    id uuid primary key,
    device_id uuid not null references public.devices (id),
    sensor_point_id text not null references public.sensor_points (id),
    route_id text not null references public.routes (id),
    event_type text not null,
    occurred_at timestamptz not null,
    received_at timestamptz not null default now(),

    constraint detections_event_type_valid
        check (event_type in ('entry', 'exit')),
    constraint detections_occurred_at_finite
        check (isfinite(occurred_at)),
    constraint detections_received_at_finite
        check (isfinite(received_at))
);

-- Stable chronological history for the monitored route.
create index detections_route_occurred_at_id_idx
    on public.detections (route_id, occurred_at, id);

alter table public.detections enable row level security;

revoke all privileges on table public.detections
    from public, anon, authenticated, service_role;

-- Express authenticates devices and derives route/event type from trusted config.
-- Corrections must be explicit future operations, not edits to raw event history.
grant select, insert on table public.detections to service_role;

comment on table public.detections is
    'Append-only IR entry/exit events, not individual identities. API must authenticate device, check point authorization and snapshot trusted route/role.';
comment on column public.detections.id is
    'UUID generated once per filtered physical event and retained across retries.';
comment on column public.detections.route_id is
    'Route snapshot derived by the API at insertion, not a route supplied by the Pi.';
comment on column public.detections.event_type is
    'Snapshot of the configured point role at insertion. Unassigned points cannot generate occupancy events.';
comment on column public.detections.occurred_at is
    'Original event timestamp from the Pi; immutable across retries.';
comment on column public.detections.received_at is
    'Server receipt timestamp. Confirm ingestion only after the insert commits.';

commit;

-- Expected result: seven columns, all NOT NULL.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'detections'
order by ordinal_position;

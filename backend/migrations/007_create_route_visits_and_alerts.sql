-- Run once after migrations 001-006, as the project database owner.
-- Persistent state only: matching and deadline evaluation require backend code.
begin;

create table public.route_visits (
    id uuid primary key default gen_random_uuid(),
    route_id text not null references public.routes (id),
    entry_detection_id uuid not null unique references public.detections (id),
    entered_at timestamptz not null,
    deadline_at timestamptz not null,
    exit_detection_id uuid unique references public.detections (id),
    exited_at timestamptz,

    constraint route_visits_entered_at_finite
        check (isfinite(entered_at)),
    constraint route_visits_deadline_valid
        check (isfinite(deadline_at) and deadline_at > entered_at),
    constraint route_visits_exit_consistent
        check (
            (exit_detection_id is null and exited_at is null)
            or
            (exit_detection_id is not null and exited_at is not null
             and isfinite(exited_at) and exited_at >= entered_at)
        ),
    constraint route_visits_distinct_events
        check (exit_detection_id is null or exit_detection_id <> entry_detection_id)
);

-- Oldest pending entry first within a route; this is an anonymous approximation.
create index route_visits_pending_route_entry_idx
    on public.route_visits (route_id, entered_at, entry_detection_id)
    where exit_detection_id is null;

-- Supports checking expired entries even when no new sensor messages arrive.
create index route_visits_pending_deadline_idx
    on public.route_visits (deadline_at)
    where exit_detection_id is null;

create table public.occupancy_alerts (
    id uuid primary key default gen_random_uuid(),
    visit_id uuid not null unique references public.route_visits (id),
    created_at timestamptz not null default now(),
    resolved_at timestamptz,

    constraint occupancy_alerts_created_at_finite
        check (isfinite(created_at)),
    constraint occupancy_alerts_resolution_valid
        check (resolved_at is null or
               (isfinite(resolved_at) and resolved_at >= created_at))
);

create index occupancy_alerts_open_created_at_idx
    on public.occupancy_alerts (created_at desc, id desc)
    where resolved_at is null;

alter table public.route_visits enable row level security;
alter table public.occupancy_alerts enable row level security;

revoke all privileges on table public.route_visits, public.occupancy_alerts
    from public, anon, authenticated, service_role;

grant select, insert on table public.route_visits, public.occupancy_alerts
    to service_role;

-- The backend can resolve pending state, but cannot rewrite original deadlines.
grant update (exit_detection_id, exited_at) on table public.route_visits
    to service_role;
grant update (resolved_at) on table public.occupancy_alerts
    to service_role;

comment on table public.route_visits is
    'Anonymous entry/exit matching, not personal identities. Backend must validate event roles, routes, timestamps and FIFO policy in a transaction.';
comment on column public.route_visits.deadline_at is
    'Original entry time plus the route timeout snapshotted at entry. New arrivals or later timeout changes do not reset it.';
comment on column public.route_visits.exited_at is
    'Original event time of the matched exit; null means no matched exit, not proof someone is physically present.';
comment on table public.occupancy_alerts is
    'Possible overdue-presence alerts. One per anonymous visit; not confirmation that a person is missing and not a physical/mobile SOS.';
comment on column public.occupancy_alerts.resolved_at is
    'Server processing time when a matching exit resolves an alert; retain the row as history.';

commit;

-- Expected result: two tables, both with rowsecurity = true.
select tablename, rowsecurity
from pg_catalog.pg_tables
where schemaname = 'public'
  and tablename in ('route_visits', 'occupancy_alerts')
order by tablename;

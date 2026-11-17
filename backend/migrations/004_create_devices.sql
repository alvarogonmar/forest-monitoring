-- Run once after migration 003, as the project database owner.
-- Creates authorization structure only; no devices or credentials are inserted.
begin;

create table public.devices (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    credential_hash text not null unique,
    active boolean not null default false,
    created_at timestamptz not null default now(),

    constraint devices_name_valid
        check (char_length(btrim(name)) between 1 and 120),
    constraint devices_credential_hash_valid
        check (credential_hash ~ '^[0-9a-f]{64}$'),
    constraint devices_created_at_finite
        check (isfinite(created_at))
);

-- A Pi can report for several points; each authorization is explicit.
create table public.device_sensor_points (
    device_id uuid not null references public.devices (id),
    sensor_point_id text not null references public.sensor_points (id),
    primary key (device_id, sensor_point_id)
);

create index device_sensor_points_sensor_point_id_idx
    on public.device_sensor_points (sensor_point_id);

alter table public.devices enable row level security;
alter table public.device_sensor_points enable row level security;

revoke all privileges on table public.devices, public.device_sensor_points
    from public, anon, authenticated, service_role;

-- Express reads these tables to authenticate and authorize a detection.
-- Enrollment, rotation, activation and assignment are owner-managed in the MVP.
grant select on table public.devices, public.device_sensor_points to service_role;

comment on table public.devices is
    'Trusted hardware identities, disabled by default. Never expose credential hashes in API responses.';
comment on column public.devices.credential_hash is
    'Lowercase hex SHA-256 digest of a cryptographically random device token (at least 32 random bytes). Not a user password.';
comment on column public.devices.active is
    'Express must reject device requests when false, including retries.';
comment on table public.device_sensor_points is
    'Explicit authorization pairs. Express must require an active device and an existing pair before accepting a detection.';

commit;

-- Expected result: two tables, both with rowsecurity = true.
select tablename, rowsecurity
from pg_catalog.pg_tables
where schemaname = 'public'
  and tablename in ('devices', 'device_sensor_points')
order by tablename;

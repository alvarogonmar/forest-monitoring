-- Run once after migrations 001-007 in Supabase, as the database owner.
-- Does not create Auth users, grant admin membership, or start a login session.
begin;

create table public.admin_memberships (
    user_id uuid primary key references auth.users (id) on delete cascade,
    active boolean not null default false,
    created_at timestamptz not null default now(),

    constraint admin_memberships_created_at_finite
        check (isfinite(created_at))
);

create table public.admin_sessions (
    session_hash text primary key,
    user_id uuid not null references public.admin_memberships (user_id) on delete cascade,
    csrf_token text not null,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null,
    revoked_at timestamptz,

    constraint admin_sessions_hash_valid
        check (session_hash ~ '^[0-9a-f]{64}$'),
    constraint admin_sessions_csrf_token_valid
        check (csrf_token ~ '^[0-9a-f]{64}$'),
    constraint admin_sessions_created_at_finite
        check (isfinite(created_at)),
    constraint admin_sessions_expiry_valid
        check (isfinite(expires_at)
               and expires_at > created_at
               and expires_at <= created_at + interval '8 hours'),
    constraint admin_sessions_revocation_valid
        check (revoked_at is null or
               (isfinite(revoked_at) and revoked_at >= created_at))
);

create index admin_sessions_user_id_idx
    on public.admin_sessions (user_id);

create index admin_sessions_expires_at_idx
    on public.admin_sessions (expires_at);

alter table public.admin_memberships enable row level security;
alter table public.admin_sessions enable row level security;

revoke all privileges on table public.admin_memberships, public.admin_sessions
    from public, anon, authenticated, service_role;

-- Only the project owner can grant administrative membership in the MVP.
grant select on table public.admin_memberships to service_role;
grant select, insert on table public.admin_sessions to service_role;
grant update (revoked_at) on table public.admin_sessions to service_role;

comment on table public.admin_memberships is
    'Owner-managed administrative authorization for Supabase Auth users. Disabled by default; not derived from user-editable metadata.';
comment on table public.admin_sessions is
    'Server-managed admin sessions. API must enforce expiry, revocation and active membership on every private request.';
comment on column public.admin_sessions.session_hash is
    'Lowercase SHA-256 hex digest of a random cookie token (at least 32 random bytes). Never store the original cookie token here.';
comment on column public.admin_sessions.csrf_token is
    'Independent random 32-byte hex CSRF token returned only to the authenticated same-origin session. Not the authentication credential.';
comment on column public.admin_sessions.revoked_at is
    'Set once at logout; API must never restore a revoked session by clearing this value.';

commit;

-- Expected result: two tables, both with rowsecurity = true.
select tablename, rowsecurity
from pg_catalog.pg_tables
where schemaname = 'public'
  and tablename in ('admin_memberships', 'admin_sessions')
order by tablename;

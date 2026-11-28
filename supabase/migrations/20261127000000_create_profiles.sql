-- Profiles: one row per auth user, holding the role used for permissions.
--
-- Roles:
--   admin   - full rights to every event and every user (user CRUD).
--             NEVER self-assigned: grant it with SQL (see docs/auth_setup.md).
--   manager - event creator. CRUD on their OWN events, incl. inviting guests.
--   guest   - can read events they're invited to and edit their OWN RSVP.
--
-- Why not store the role in auth.users.raw_user_meta_data? Users can update
-- their own metadata from the browser, so a role stored there could be
-- self-promoted. This table is read-only to non-admins.
--
-- Event/RSVP tables (later tickets) enforce "own events" / "own RSVP" in their
-- RLS policies using public.has_role() and public.is_admin() defined below.

create type public.app_role as enum ('admin', 'manager', 'guest');

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null check (char_length(full_name) between 1 and 100),
  role       public.app_role not null default 'guest',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- Role helpers for RLS policies (here and in future migrations).
--
-- SECURITY DEFINER lets them read profiles without tripping RLS on profiles
-- itself (a policy that queries its own table would recurse forever).
-- STABLE + `(select ...)` wrapping in policies lets Postgres evaluate them
-- once per query instead of once per row.
-- ---------------------------------------------------------------------------

create function public.has_role(required public.app_role)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = required
  );
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select public.has_role('admin');
$$;

-- Only signed-in users may call these (anon has no role to check).
revoke execute on function public.has_role(public.app_role) from public, anon;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.has_role(public.app_role) to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

-- Everyone can read their own profile.
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- Admins: full user management (read/update/delete any profile).
-- Creating users goes through Supabase Auth (dashboard or admin API), which
-- fires the trigger below, so there's no insert policy.
create policy "Admins can read all profiles"
  on public.profiles for select
  to authenticated
  using ((select public.is_admin()));

create policy "Admins can update any profile"
  on public.profiles for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete any profile"
  on public.profiles for delete
  to authenticated
  using ((select public.is_admin()));

-- Non-admins have no update policy at all, so they can't change their own
-- role (or anyone else's).

-- ---------------------------------------------------------------------------
-- Sign-up trigger
-- ---------------------------------------------------------------------------

-- Runs when Supabase creates the auth user during signUp(). Copies the name
-- and the CHOSEN role from sign-up metadata. Only 'manager' or 'guest' can be
-- chosen; anything else (including a forged 'admin') becomes 'guest', the
-- least-privileged role.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'New user'), 100),
    case new.raw_user_meta_data ->> 'role'
      when 'manager' then 'manager'::public.app_role
      else 'guest'::public.app_role
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


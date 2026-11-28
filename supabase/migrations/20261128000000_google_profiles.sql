-- Google sign-in support (SCRUM-12).
--
-- Adds two things to public.profiles:
--   avatar_url  - profile picture from Google, when available (https only)
--   role_chosen - false for a brand-new Google user who hasn't picked
--                 Event Creator / Guest yet; true for everyone else
--
-- Why a separate step to pick the role? Google doesn't know our roles, and
-- profiles are read-only to non-admins on purpose (so nobody can promote
-- themselves). choose_account_type() below is the ONE way a user can set their
-- own role: once, and only to manager or guest, never admin.

alter table public.profiles
  add column avatar_url text
    check (avatar_url is null or (avatar_url ~ '^https://' and char_length(avatar_url) <= 2048)),
  -- Existing profiles all picked a role at sign-up, so they default to true.
  add column role_chosen boolean not null default true;

-- Replaces the sign-up trigger from the profiles migration.
--   Email sign-up:  role comes from the sign-up form (manager or guest).
--   Google sign-up: role starts as guest with role_chosen = false, and the
--                   app sends the user to pick one. Name and picture come
--                   from Google's profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  -- app_metadata is set by Supabase itself; users can't edit it.
  email_signup boolean := coalesce(new.raw_app_meta_data ->> 'provider', 'email') = 'email';
  picture      text    := coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture');
begin
  insert into public.profiles (id, full_name, role, avatar_url, role_chosen)
  values (
    new.id,
    left(coalesce(nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')), ''), 'New user'), 100),
    case
      when email_signup and new.raw_user_meta_data ->> 'role' = 'manager' then 'manager'::public.app_role
      else 'guest'::public.app_role
    end,
    case when picture ~ '^https://' and char_length(picture) <= 2048 then picture end,
    email_signup
  );
  return new;
end;
$$;

-- The one-time role choice for a new Google user.
-- Returns true if the role was set, false if it wasn't allowed (not signed in,
-- role already chosen, or anything other than manager/guest).
create function public.choose_account_type(chosen public.app_role)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null or chosen not in ('manager', 'guest') then
    return false;
  end if;

  update public.profiles
  set role = chosen, role_chosen = true
  where id = (select auth.uid()) and role_chosen = false;

  return found;
end;
$$;

revoke execute on function public.choose_account_type(public.app_role) from public, anon;
grant execute on function public.choose_account_type(public.app_role) to authenticated;

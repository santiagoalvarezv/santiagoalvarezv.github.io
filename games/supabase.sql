-- the console's accounts and ranking. paste all of this into supabase: SQL Editor -> New query -> Run.
-- players sign in with a name and a password. supabase auth needs an email behind the scenes, so each player
-- gets a made-up one (a random id @players.santiagoalvarezv.com) that nobody ever sees or receives mail at.

create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  name        text not null check (char_length(name) between 3 and 16),
  login_email text not null,
  points      integer not null default 0,
  games       integer not null default 0,
  last_game   timestamptz,
  created_at  timestamptz not null default now()
);
create unique index if not exists profiles_name_lower on public.profiles (lower(name));

-- nobody writes to the table directly; a player can only read their own row
alter table public.profiles enable row level security;
-- explicit access, so it works even with "automatically expose new tables" switched off
grant usage on schema public to anon, authenticated;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);

-- the public ranking shows only name, points and games
create or replace view public.ranking as
  select name, points, games from public.profiles order by points desc;
grant select on public.ranking to anon, authenticated;

-- a new auth user gets a profile with the name they chose
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, login_email) values (new.id, trim(new.raw_user_meta_data->>'name'), new.email);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- signing in by name: find the hidden email that goes with it
create or replace function public.login_email(p_name text) returns text
language sql stable security definer set search_path = public as $$
  select login_email from public.profiles where lower(name) = lower(trim(p_name));
$$;
create or replace function public.name_taken(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where lower(name) = lower(trim(p_name)));
$$;

-- points from a finished game: 0 to 100, at most one game every 20 seconds
create or replace function public.add_points(p integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p < 0 or p > 100 then raise exception 'bad points'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and last_game > now() - interval '20 seconds') then
    raise exception 'too fast';
  end if;
  update public.profiles set points = points + p, games = games + 1, last_game = now() where id = auth.uid();
end $$;

-- change your own name
create or replace function public.rename(p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if trim(p_name) !~ '^[[:alnum:]_ .-]{3,16}$' then raise exception 'bad name'; end if;
  update public.profiles set name = trim(p_name) where id = auth.uid();
end $$;

revoke execute on function public.add_points(integer), public.rename(text) from public, anon;
grant execute on function public.add_points(integer), public.rename(text) to authenticated;
grant execute on function public.login_email(text), public.name_taken(text) to anon, authenticated;

-- LeadForge schema. Paste into Supabase -> SQL Editor -> Run.
-- SAFE TO RE-RUN: nothing is dropped and no data is deleted (only the old open
-- "dev_open" policies are replaced by real per-user / per-role policies).
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- core tables
create table if not exists public.lead_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  keyword text not null,
  location text not null,
  result_count int not null default 0,
  created_at timestamptz not null default now()
);
-- v2: every search records how it ended, so empty/partial searches show up in history.
alter table public.lead_searches add column if not exists status text not null default 'complete';
alter table public.lead_searches add column if not exists note text;
alter table public.lead_searches add column if not exists apify_run_id text;
create index if not exists lead_searches_user_idx on public.lead_searches(user_id, created_at desc);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  search_id uuid references public.lead_searches(id) on delete set null,
  place_id text not null,
  name text not null,
  category text,
  address text,
  phone text,
  website text,
  email text,
  rating numeric,
  reviews int,
  lat double precision,
  lng double precision,
  stage text not null default 'New'
    check (stage in ('New','Contacted','Interested','Closed Won','Closed Lost')),
  notes text,
  draft_subject text,
  draft_body text,
  contacted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);

create table if not exists public.service_offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  description text,
  target_keyword text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- One lead record per business, linked to every search session that found it.
create table if not exists public.search_leads (
  search_id uuid not null references public.lead_searches(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (search_id, lead_id)
);
create index if not exists search_leads_lead_idx on public.search_leads(lead_id);

insert into public.search_leads (search_id, lead_id)
select search_id, id from public.leads where search_id is not null
on conflict do nothing;

-- ------------------------------------------------------- profiles, roles, settings
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('admin','customer')),
  login_id text,                       -- e.g. admin123 (admin only)
  display_name text,
  company text,
  sender_name text,                    -- signature used in drafts
  email_subject_template text,
  email_body_template text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Admin-only key/value settings (n8n webhook URL, ...). Never readable by customers.
create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

-- Every new auth user becomes a CUSTOMER. The role can only be raised by the
-- bootstrap-admin Edge Function (service role); clients can never choose it.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, display_name)
  values (new.id, 'customer', left(coalesce(new.raw_user_meta_data->>'display_name', ''), 80))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users created before this version get a customer profile.
insert into public.profiles (id, role)
select id, 'customer' from auth.users
on conflict (id) do nothing;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active);
$$;

create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_active);
$$;

-- ------------------------------------------------------------------- security
alter table public.lead_searches enable row level security;
alter table public.leads enable row level security;
alter table public.service_offers enable row level security;
alter table public.search_leads enable row level security;
alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists dev_open on public.lead_searches;
drop policy if exists dev_open on public.leads;
drop policy if exists dev_open on public.service_offers;
drop policy if exists dev_open on public.search_leads;

drop policy if exists own_rows on public.lead_searches;
create policy own_rows on public.lead_searches for all to authenticated
  using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid() and public.is_active_user());

drop policy if exists own_rows on public.leads;
create policy own_rows on public.leads for all to authenticated
  using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid() and public.is_active_user());

drop policy if exists own_rows on public.service_offers;
create policy own_rows on public.service_offers for all to authenticated
  using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid() and public.is_active_user());

drop policy if exists own_rows on public.search_leads;
create policy own_rows on public.search_leads for all to authenticated
  using (
    public.is_active_user()
    and exists (select 1 from public.lead_searches s where s.id = search_id and s.user_id = auth.uid())
  )
  with check (
    public.is_active_user()
    and exists (select 1 from public.lead_searches s where s.id = search_id and s.user_id = auth.uid())
    and exists (select 1 from public.leads l where l.id = lead_id and l.user_id = auth.uid())
  );

drop policy if exists read_own_or_admin on public.profiles;
create policy read_own_or_admin on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists update_own on public.profiles;
create policy update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists admin_only on public.app_settings;
create policy admin_only on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Table privileges: anonymous visitors get nothing. Customers can never write role / is_active.
revoke all on public.lead_searches, public.leads, public.service_offers, public.search_leads,
              public.profiles, public.app_settings from anon;
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, company, sender_name, email_subject_template, email_body_template)
  on public.profiles to authenticated;
grant select, insert, update, delete on public.lead_searches, public.leads,
  public.service_offers, public.search_leads, public.app_settings to authenticated;
grant usage on schema public to anon, authenticated;

-- ------------------------------------------------------------- customer actions
-- Delete one search and the leads that no other search still references.
create or replace function public.delete_search(p_search uuid) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare ids uuid[]; n_leads int := 0;
begin
  select coalesce(array_agg(lead_id), '{}') into ids from search_leads where search_id = p_search;
  delete from lead_searches where id = p_search and user_id = auth.uid();
  delete from leads l
   where l.id = any(ids) and l.user_id = auth.uid()
     and not exists (select 1 from search_leads sl where sl.lead_id = l.id);
  get diagnostics n_leads = row_count;
  return jsonb_build_object('leads_deleted', n_leads);
end $$;

-- Wipe the caller's whole search history together with its leads.
create or replace function public.reset_my_searches() returns jsonb
language plpgsql security invoker set search_path = public as $$
declare n_leads int; n_searches int;
begin
  delete from leads where user_id = auth.uid();
  get diagnostics n_leads = row_count;
  delete from lead_searches where user_id = auth.uid();
  get diagnostics n_searches = row_count;
  return jsonb_build_object('searches_deleted', n_searches, 'leads_deleted', n_leads);
end $$;

-- --------------------------------------------------------------- admin actions
-- Aggregate counts only: the admin panel never reads customers' lead rows.
create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare legacy uuid := '00000000-0000-0000-0000-000000000001'; result jsonb;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  select jsonb_build_object(
    'users', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'role', p.role, 'login', coalesce(p.login_id, u.email), 'name', p.display_name,
        'is_active', p.is_active, 'created_at', p.created_at, 'last_sign_in_at', u.last_sign_in_at,
        'searches', (select count(*) from lead_searches s where s.user_id = p.id),
        'leads',    (select count(*) from leads l where l.user_id = p.id),
        'services', (select count(*) from service_offers o where o.user_id = p.id)
      ) order by p.created_at desc)
      from profiles p join auth.users u on u.id = p.id), '[]'::jsonb),
    'legacy', jsonb_build_object(
      'searches', (select count(*) from lead_searches where user_id = legacy),
      'leads',    (select count(*) from leads where user_id = legacy),
      'services', (select count(*) from service_offers where user_id = legacy))
  ) into result;
  result := result || jsonb_build_object('stats', jsonb_build_object(
    'customers',       (select count(*) from profiles where role = 'customer'),
    'active_customers',(select count(*) from profiles where role = 'customer' and is_active),
    'signups_7d',      (select count(*) from profiles where role = 'customer' and created_at > now() - interval '7 days'),
    'searches_7d',     (select count(*) from lead_searches where created_at > now() - interval '7 days' and user_id <> legacy),
    'searches_30d',    (select count(*) from lead_searches where created_at > now() - interval '30 days' and user_id <> legacy),
    'leads',           (select count(*) from leads where user_id <> legacy),
    'contacted',       (select count(*) from leads where contacted_at is not null and user_id <> legacy)));
  return result;
end $$;

-- Recent searches across all customers (what was searched and how it ended, never the lead rows).
create or replace function public.admin_recent_searches(p_limit int default 50) returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(r) from (
      select s.id, coalesce(p.login_id, u.email, 'deleted user') as account, s.keyword, s.location,
             s.result_count, s.status, s.note, s.created_at
      from lead_searches s
      left join profiles p on p.id = s.user_id
      left join auth.users u on u.id = s.user_id
      where s.user_id <> '00000000-0000-0000-0000-000000000001'
      order by s.created_at desc limit least(greatest(p_limit, 1), 200)) r), '[]'::jsonb);
end $$;

-- Remove a customer's searches, leads and services but keep the account.
create or replace function public.admin_wipe_user_data(p_user uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare nl int; ns int;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if exists (select 1 from profiles where id = p_user and role = 'admin') then raise exception 'cannot modify an admin'; end if;
  delete from leads where user_id = p_user; get diagnostics nl = row_count;
  delete from lead_searches where user_id = p_user; get diagnostics ns = row_count;
  delete from service_offers where user_id = p_user;
  return jsonb_build_object('searches_deleted', ns, 'leads_deleted', nl);
end $$;

-- Permanently delete a customer account and everything they own.
create or replace function public.admin_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if exists (select 1 from profiles where id = p_user and role = 'admin') then raise exception 'cannot delete an admin'; end if;
  delete from leads where user_id = p_user;
  delete from lead_searches where user_id = p_user;
  delete from service_offers where user_id = p_user;
  delete from auth.users where id = p_user;
end $$;

create or replace function public.admin_set_user_active(p_user uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  update profiles set is_active = p_active where id = p_user and role <> 'admin';
end $$;

-- Hand the pre-login (shared demo user) data to a real account.
create or replace function public.admin_claim_legacy(p_user uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare legacy uuid := '00000000-0000-0000-0000-000000000001'; ns int; nl int; nv int;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  update leads set user_id = p_user
   where user_id = legacy
     and not exists (select 1 from leads x where x.user_id = p_user and x.place_id = leads.place_id);
  get diagnostics nl = row_count;
  update lead_searches set user_id = p_user where user_id = legacy;
  get diagnostics ns = row_count;
  update service_offers set user_id = p_user where user_id = legacy;
  get diagnostics nv = row_count;
  return jsonb_build_object('searches', ns, 'leads', nl, 'services', nv);
end $$;

revoke execute on function public.admin_overview(), public.admin_set_user_active(uuid, boolean),
  public.admin_claim_legacy(uuid), public.delete_search(uuid), public.reset_my_searches(),
  public.admin_recent_searches(int), public.admin_wipe_user_data(uuid), public.admin_delete_user(uuid)
  from public, anon;
grant execute on function public.admin_overview(), public.admin_set_user_active(uuid, boolean),
  public.admin_claim_legacy(uuid), public.delete_search(uuid), public.reset_my_searches(),
  public.admin_recent_searches(int), public.admin_wipe_user_data(uuid), public.admin_delete_user(uuid)
  to authenticated;

notify pgrst, 'reload schema';

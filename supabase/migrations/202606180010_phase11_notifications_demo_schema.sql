create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  base44_id text unique,
  is_demo boolean not null default true,
  recipient_profile_id uuid references public.profiles(id),
  recipient_email text,
  recipient_role text,
  title text not null,
  message text not null,
  type text not null default 'info',
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  link_path text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint notifications_title_check check (length(trim(title)) > 0),
  constraint notifications_message_check check (length(trim(message)) > 0)
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid references public.profiles(id),
  user_email text,
  disabled_types text[] not null default '{}',
  is_demo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint notification_preferences_user_check check (profile_id is not null or nullif(trim(user_email), '') is not null)
);

create index if not exists idx_notifications_org_created
  on public.notifications(organization_id, created_at desc);
create index if not exists idx_notifications_org_read
  on public.notifications(organization_id, read_at, archived_at);
create index if not exists idx_notification_preferences_org_user
  on public.notification_preferences(organization_id, profile_id, user_email)
  where archived_at is null;

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists notifications_select_member on public.notifications;
drop policy if exists notifications_write_member on public.notifications;
drop policy if exists notification_preferences_select_member on public.notification_preferences;
drop policy if exists notification_preferences_write_member on public.notification_preferences;

create policy notifications_select_member on public.notifications for select using (public.is_member(organization_id));
create policy notifications_write_member on public.notifications for all using (public.is_member(organization_id)) with check (public.is_member(organization_id));
create policy notification_preferences_select_member on public.notification_preferences for select using (public.is_member(organization_id));
create policy notification_preferences_write_member on public.notification_preferences for all using (public.is_member(organization_id)) with check (public.is_member(organization_id));

create or replace function public.list_demo_notifications(
  p_organization_id uuid,
  p_recipient_email text default null,
  p_include_archived boolean default false
)
returns setof public.notifications
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.notifications n
  where n.organization_id = p_organization_id
    and (p_include_archived or n.archived_at is null)
    and (
      p_recipient_email is null
      or n.recipient_email is null
      or lower(n.recipient_email) = lower(p_recipient_email)
    )
  order by n.created_at desc;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.notifications;
begin
  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id
  returning * into v_record;

  if v_record.id is null then
    raise exception 'Notification not found';
  end if;

  return v_record;
end;
$$;

create or replace function public.save_demo_notification_preferences(
  p_organization_id uuid,
  p_user_email text,
  p_disabled_types text[]
)
returns public.notification_preferences
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.notification_preferences;
begin
  select * into v_record
  from public.notification_preferences
  where organization_id = p_organization_id
    and lower(user_email) = lower(p_user_email)
    and archived_at is null
  limit 1;

  if v_record.id is null then
    insert into public.notification_preferences (organization_id, user_email, disabled_types, is_demo)
    values (p_organization_id, p_user_email, coalesce(p_disabled_types, '{}'), true)
    returning * into v_record;
  else
    update public.notification_preferences
    set disabled_types = coalesce(p_disabled_types, '{}'),
        updated_at = now()
    where id = v_record.id
    returning * into v_record;
  end if;

  return v_record;
end;
$$;

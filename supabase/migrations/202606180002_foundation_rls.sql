alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.app_settings enable row level security;
alter table public.migration_batches enable row level security;
alter table public.migration_id_map enable row level security;

create or replace function public.is_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships om
    join public.profiles p on p.id = om.profile_id
    where om.organization_id = target_organization_id
      and om.profile_id = auth.uid()
      and om.archived_at is null
      and om.status = 'active'
      and p.is_active = true
      and p.archived_at is null
  );
$$;

create or replace function public.is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships om
    join public.roles r on r.id = om.role_id
    join public.profiles p on p.id = om.profile_id
    where om.organization_id = target_organization_id
      and om.profile_id = auth.uid()
      and om.archived_at is null
      and om.status = 'active'
      and p.is_active = true
      and p.archived_at is null
      and r.key in ('admin', 'supervisor')
  );
$$;

create policy organizations_select_member on public.organizations for select using (public.is_member(id));
create policy profiles_select_self on public.profiles for select using (id = auth.uid());
create policy memberships_select_member on public.organization_memberships for select using (public.is_member(organization_id));
create policy roles_select_member on public.roles for select using (organization_id is null or public.is_member(organization_id));
create policy permissions_select_authenticated on public.permissions for select using (auth.uid() is not null);
create policy role_permissions_select_member on public.role_permissions for select using (public.is_member(organization_id));
create policy app_settings_select_member on public.app_settings for select using (public.is_member(organization_id));

create policy roles_write_admin on public.roles for all using (organization_id is not null and public.is_org_admin(organization_id)) with check (organization_id is not null and public.is_org_admin(organization_id));
create policy role_permissions_write_admin on public.role_permissions for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy app_settings_write_admin on public.app_settings for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

-- Migration tables are intentionally service-role only. No anon/authenticated policies are created.

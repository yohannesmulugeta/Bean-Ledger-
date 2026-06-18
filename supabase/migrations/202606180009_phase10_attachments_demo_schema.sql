create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  base44_id text unique,
  entity_type text not null,
  entity_id uuid,
  section text,
  section_ref text,
  original_filename text not null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text,
  file_size_bytes bigint,
  description text,
  uploaded_by text,
  is_demo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint attachments_entity_type_check check (
    entity_type in (
      'purchase_record',
      'warehouse_receipt',
      'export_contract',
      'buyer_inspection',
      'material_register_entry'
    )
  ),
  constraint attachments_filename_check check (length(trim(original_filename)) > 0),
  constraint attachments_bucket_check check (
    storage_bucket in ('demo-documents', 'demo-receipts', 'demo-export-documents')
  ),
  constraint attachments_storage_path_check check (length(trim(storage_path)) > 0 and position('..' in storage_path) = 0),
  constraint attachments_file_size_check check (file_size_bytes is null or file_size_bytes >= 0)
);

create index if not exists idx_attachments_org_entity_active
  on public.attachments(organization_id, entity_type, entity_id, archived_at);
create index if not exists idx_attachments_org_bucket_path
  on public.attachments(organization_id, storage_bucket, storage_path);
create unique index if not exists idx_attachments_entity_section_filename_active
  on public.attachments(organization_id, entity_type, entity_id, coalesce(section, ''), coalesce(section_ref, ''), lower(original_filename))
  where archived_at is null;

alter table public.attachments enable row level security;

drop policy if exists attachments_select_member on public.attachments;
drop policy if exists attachments_write_member on public.attachments;
create policy attachments_select_member on public.attachments for select using (public.is_member(organization_id));
create policy attachments_write_member on public.attachments for all using (public.is_member(organization_id)) with check (public.is_member(organization_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('demo-documents', 'demo-documents', false, 10485760, array['application/pdf','text/plain','image/jpeg','image/png','image/heic']),
  ('demo-receipts', 'demo-receipts', false, 10485760, array['application/pdf','text/plain','image/jpeg','image/png','image/heic']),
  ('demo-export-documents', 'demo-export-documents', false, 10485760, array['application/pdf','text/plain','image/jpeg','image/png','image/heic'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists demo_document_objects_select_member on storage.objects;
drop policy if exists demo_document_objects_insert_member on storage.objects;
drop policy if exists demo_document_objects_update_member on storage.objects;
create policy demo_document_objects_select_member on storage.objects for select using (
  bucket_id in ('demo-documents', 'demo-receipts', 'demo-export-documents')
  and exists (
    select 1 from public.organization_memberships om
    where om.profile_id = auth.uid()
      and om.status = 'active'
      and om.archived_at is null
      and name like om.organization_id::text || '/%'
  )
);
create policy demo_document_objects_insert_member on storage.objects for insert with check (
  bucket_id in ('demo-documents', 'demo-receipts', 'demo-export-documents')
  and exists (
    select 1 from public.organization_memberships om
    where om.profile_id = auth.uid()
      and om.status = 'active'
      and om.archived_at is null
      and name like om.organization_id::text || '/%'
  )
);
create policy demo_document_objects_update_member on storage.objects for update using (
  bucket_id in ('demo-documents', 'demo-receipts', 'demo-export-documents')
  and exists (
    select 1 from public.organization_memberships om
    where om.profile_id = auth.uid()
      and om.status = 'active'
      and om.archived_at is null
      and name like om.organization_id::text || '/%'
  )
) with check (
  bucket_id in ('demo-documents', 'demo-receipts', 'demo-export-documents')
  and exists (
    select 1 from public.organization_memberships om
    where om.profile_id = auth.uid()
      and om.status = 'active'
      and om.archived_at is null
      and name like om.organization_id::text || '/%'
  )
);

create or replace function public.list_attachments_for_entity(
  p_organization_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_include_archived boolean default false
)
returns setof public.attachments
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.attachments a
  where a.organization_id = p_organization_id
    and a.entity_type = p_entity_type
    and (p_entity_id is null or a.entity_id = p_entity_id)
    and (p_include_archived or a.archived_at is null)
  order by a.created_at desc;
$$;

create or replace function public.create_attachment_metadata(p_payload jsonb)
returns public.attachments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.attachments;
begin
  if coalesce(trim(p_payload->>'original_filename'), '') = '' then
    raise exception 'Attachment filename is required';
  end if;

  insert into public.attachments (
    organization_id, base44_id, entity_type, entity_id, section, section_ref,
    original_filename, storage_bucket, storage_path, mime_type, file_size_bytes,
    description, uploaded_by, is_demo
  ) values (
    (p_payload->>'organization_id')::uuid,
    nullif(p_payload->>'base44_id', ''),
    p_payload->>'entity_type',
    nullif(p_payload->>'entity_id', '')::uuid,
    nullif(p_payload->>'section', ''),
    nullif(p_payload->>'section_ref', ''),
    p_payload->>'original_filename',
    p_payload->>'storage_bucket',
    p_payload->>'storage_path',
    nullif(p_payload->>'mime_type', ''),
    nullif(p_payload->>'file_size_bytes', '')::bigint,
    nullif(p_payload->>'description', ''),
    nullif(p_payload->>'uploaded_by', ''),
    coalesce((p_payload->>'is_demo')::boolean, true)
  )
  returning * into v_record;

  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_record.organization_id, auth.uid(), v_record.is_demo, 'Created', 'attachments', v_record.id, v_record.original_filename, 'Demo attachment metadata created', to_jsonb(v_record));

  return v_record;
end;
$$;

create or replace function public.archive_attachment(p_attachment_id uuid, p_reason text default null)
returns public.attachments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.attachments;
begin
  update public.attachments
  set archived_at = coalesce(archived_at, now()), updated_at = now()
  where id = p_attachment_id
  returning * into v_record;

  if v_record.id is null then
    raise exception 'Attachment not found';
  end if;

  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_record.organization_id, auth.uid(), v_record.is_demo, 'Archived', 'attachments', v_record.id, v_record.original_filename, p_reason, to_jsonb(v_record));

  return v_record;
end;
$$;

create or replace function public.restore_attachment(p_attachment_id uuid, p_reason text default null)
returns public.attachments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.attachments;
begin
  update public.attachments
  set archived_at = null, updated_at = now()
  where id = p_attachment_id
  returning * into v_record;

  if v_record.id is null then
    raise exception 'Attachment not found';
  end if;

  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_record.organization_id, auth.uid(), v_record.is_demo, 'Restored', 'attachments', v_record.id, v_record.original_filename, p_reason, to_jsonb(v_record));

  return v_record;
end;
$$;

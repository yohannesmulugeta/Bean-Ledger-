-- Member policies must not query organization_memberships as the caller.
-- The public demo gets access only to the fixed synthetic tenant path.
drop policy if exists demo_document_objects_select_member on storage.objects;
drop policy if exists demo_document_objects_insert_member on storage.objects;
drop policy if exists demo_document_objects_update_member on storage.objects;

create policy demo_document_objects_select_member
on storage.objects for select to authenticated
using (
  bucket_id in ('demo-documents', 'demo-receipts', 'demo-export-documents')
  and public.is_member((storage.foldername(name))[1]::uuid)
);

create policy demo_document_objects_insert_member
on storage.objects for insert to authenticated
with check (
  bucket_id in ('demo-documents', 'demo-receipts', 'demo-export-documents')
  and public.is_member((storage.foldername(name))[1]::uuid)
);

create policy demo_document_objects_update_member
on storage.objects for update to authenticated
using (
  bucket_id in ('demo-documents', 'demo-receipts', 'demo-export-documents')
  and public.is_member((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id in ('demo-documents', 'demo-receipts', 'demo-export-documents')
  and public.is_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists demo_document_objects_select_anon on storage.objects;
drop policy if exists demo_document_objects_insert_anon on storage.objects;

create policy demo_document_objects_select_anon
on storage.objects for select to anon
using (
  bucket_id in ('demo-documents', 'demo-receipts', 'demo-export-documents')
  and name like '11111111-1111-4111-8111-111111111111/%'
);

create policy demo_document_objects_insert_anon
on storage.objects for insert to anon
with check (
  bucket_id in ('demo-documents', 'demo-receipts', 'demo-export-documents')
  and name like '11111111-1111-4111-8111-111111111111/%'
);

create or replace function public.list_attachments_for_entity(
  p_organization_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_include_archived boolean default false
)
returns setof public.attachments
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    if p_organization_id <> '11111111-1111-4111-8111-111111111111'::uuid then
      raise exception 'Not authorized';
    end if;
  elsif not public.is_member(p_organization_id) then
    raise exception 'Not authorized';
  end if;

  return query
  select *
  from public.attachments a
  where a.organization_id = p_organization_id
    and a.entity_type = p_entity_type
    and (p_entity_id is null or a.entity_id = p_entity_id)
    and (p_include_archived or a.archived_at is null)
    and (auth.uid() is not null or a.is_demo)
  order by a.created_at desc;
end;
$$;

create or replace function public.create_attachment_metadata(p_payload jsonb)
returns public.attachments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_organization_id uuid := (p_payload->>'organization_id')::uuid;
  v_record public.attachments;
begin
  if coalesce(trim(p_payload->>'original_filename'), '') = '' then
    raise exception 'Attachment filename is required';
  end if;

  if auth.uid() is null then
    if v_organization_id <> '11111111-1111-4111-8111-111111111111'::uuid
       or not coalesce((p_payload->>'is_demo')::boolean, true) then
      raise exception 'Not authorized';
    end if;
  elsif not public.is_member(v_organization_id) then
    raise exception 'Not authorized';
  end if;

  insert into public.attachments (
    organization_id, base44_id, entity_type, entity_id, section, section_ref,
    original_filename, storage_bucket, storage_path, mime_type, file_size_bytes,
    description, uploaded_by, is_demo
  ) values (
    v_organization_id,
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

revoke all on function public.list_attachments_for_entity(uuid, text, uuid, boolean) from public;
revoke all on function public.create_attachment_metadata(jsonb) from public;
grant execute on function public.list_attachments_for_entity(uuid, text, uuid, boolean) to anon, authenticated;
grant execute on function public.create_attachment_metadata(jsonb) to anon, authenticated;

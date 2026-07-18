create or replace function public.archive_attachment(p_attachment_id uuid, p_reason text default null)
returns public.attachments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_record public.attachments;
begin
  select * into v_record
  from public.attachments
  where id = p_attachment_id
  for update;

  if not found then raise exception 'Attachment not found'; end if;

  if auth.uid() is null then
    if not (v_record.is_demo and v_record.organization_id = '11111111-1111-4111-8111-111111111111'::uuid) then
      raise exception 'Not authorized';
    end if;
  elsif not public.is_member(v_record.organization_id) then
    raise exception 'Not authorized';
  end if;

  update public.attachments
  set archived_at = coalesce(archived_at, now()), updated_at = now()
  where id = p_attachment_id
  returning * into v_record;

  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_record.organization_id, auth.uid(), v_record.is_demo, 'Archived', 'attachments', v_record.id, v_record.original_filename, p_reason, to_jsonb(v_record));

  return v_record;
end;
$$;

create or replace function public.restore_attachment(p_attachment_id uuid, p_reason text default null)
returns public.attachments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_record public.attachments;
begin
  select * into v_record
  from public.attachments
  where id = p_attachment_id
  for update;

  if not found then raise exception 'Attachment not found'; end if;

  if auth.uid() is null then
    if not (v_record.is_demo and v_record.organization_id = '11111111-1111-4111-8111-111111111111'::uuid) then
      raise exception 'Not authorized';
    end if;
  elsif not public.is_member(v_record.organization_id) then
    raise exception 'Not authorized';
  end if;

  update public.attachments
  set archived_at = null, updated_at = now()
  where id = p_attachment_id
  returning * into v_record;

  insert into public.audit_logs (organization_id, profile_id, is_demo, action_type, entity_table, entity_id, record_description, reason, changes)
  values (v_record.organization_id, auth.uid(), v_record.is_demo, 'Restored', 'attachments', v_record.id, v_record.original_filename, p_reason, to_jsonb(v_record));

  return v_record;
end;
$$;

revoke all on function public.archive_attachment(uuid, text) from public;
revoke all on function public.restore_attachment(uuid, text) from public;
grant execute on function public.archive_attachment(uuid, text) to anon, authenticated;
grant execute on function public.restore_attachment(uuid, text) to anon, authenticated;

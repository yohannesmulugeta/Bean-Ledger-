// @ts-nocheck
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { DEMO_META } from './demoData';
import { createDemoId, readDemoStore, writeDemoStore } from './demoStore';

export const ATTACHMENT_ENTITY_TYPES = [
  'purchase_record',
  'warehouse_receipt',
  'export_contract',
  'buyer_inspection',
  'material_register_entry',
];

const BUCKET_BY_ENTITY = {
  purchase_record: 'demo-receipts',
  warehouse_receipt: 'demo-receipts',
  export_contract: 'demo-export-documents',
  buyer_inspection: 'demo-documents',
  material_register_entry: 'demo-documents',
};

const nowIso = () => new Date().toISOString();

function slug(value) {
  return String(value || 'document')
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

export function validateAttachmentInput({ entityType, fileName }) {
  if (!ATTACHMENT_ENTITY_TYPES.includes(entityType)) {
    throw new Error(`Invalid attachment entity type: ${entityType}`);
  }
  if (!String(fileName || '').trim()) {
    throw new Error('Attachment filename is required');
  }
}

export function buildAttachmentPath({ organizationId = DEMO_META.organizationId, entityType, entityId, fileName }) {
  validateAttachmentInput({ entityType, fileName });
  const entityPart = entityId || 'unlinked';
  return `${organizationId}/${entityType}/${entityPart}/${Date.now()}-${slug(fileName)}`;
}

function bucketFor(entityType, override) {
  return override || BUCKET_BY_ENTITY[entityType] || 'demo-documents';
}

function decorate(record) {
  const fileName = record.original_filename || record.file_name;
  return {
    ...record,
    file_name: fileName,
    file_size: record.file_size_bytes ?? record.file_size,
    uploaded_at: record.created_at || record.uploaded_at,
    archived: Boolean(record.archived_at),
    file_url: record.file_url || `#demo-document-${record.id}`,
  };
}

function duplicateExists(rows, payload, excludingId = null) {
  return rows.some((row) => (
    row.id !== excludingId
    && !row.archived_at
    && row.entity_type === payload.entity_type
    && row.entity_id === payload.entity_id
    && (row.section || '') === (payload.section || '')
    && (row.section_ref || '') === (payload.section_ref || '')
    && String(row.original_filename || '').toLowerCase() === String(payload.original_filename || '').toLowerCase()
  ));
}

function payloadFrom({ entityType, entityId, file, metadata = {}, storagePath }) {
  const fileName = metadata.original_filename || metadata.file_name || file?.name;
  validateAttachmentInput({ entityType, fileName });
  return {
    organization_id: metadata.organization_id || DEMO_META.organizationId,
    base44_id: metadata.base44_id ?? null,
    entity_type: entityType,
    entity_id: entityId || null,
    section: metadata.section || null,
    section_ref: metadata.section_ref || null,
    original_filename: fileName,
    storage_bucket: bucketFor(entityType, metadata.storage_bucket),
    storage_path: storagePath || metadata.storage_path || buildAttachmentPath({ entityType, entityId, fileName }),
    mime_type: metadata.mime_type || file?.type || 'application/octet-stream',
    file_size_bytes: Number(metadata.file_size_bytes ?? file?.size ?? 0),
    description: metadata.description || null,
    uploaded_by: metadata.uploaded_by || 'Demo Admin',
    is_demo: metadata.is_demo ?? true,
  };
}

async function createMetadata(payload) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('create_attachment_metadata', { p_payload: payload });
    if (error) throw error;
    return decorate(data);
  }

  const store = readDemoStore();
  if (duplicateExists(store.attachments || [], payload)) {
    throw new Error('This demo document is already attached to the selected record');
  }
  const timestamp = nowIso();
  const record = {
    id: createDemoId(),
    ...payload,
    created_at: timestamp,
    updated_at: timestamp,
    archived_at: null,
  };
  store.attachments = [...(store.attachments || []), record];
  store.auditLogs.push({
    id: createDemoId(),
    organization_id: payload.organization_id,
    action_type: 'Created',
    entity_table: 'attachments',
    entity_id: record.id,
    record_description: record.original_filename,
    reason: 'Demo attachment metadata created',
    changes: { demo: true },
    is_demo: true,
    created_at: timestamp,
  });
  writeDemoStore(store);
  return decorate(record);
}

export const attachmentService = {
  buildAttachmentPath,
  validateAttachmentInput,

  async listForEntity(entityType, entityId, { includeArchived = false } = {}) {
    validateAttachmentInput({ entityType, fileName: 'placeholder' });
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('list_attachments_for_entity', {
        p_organization_id: DEMO_META.organizationId,
        p_entity_type: entityType,
        p_entity_id: entityId || null,
        p_include_archived: includeArchived,
      });
      if (error) throw error;
      return (data || []).map(decorate);
    }

    return (readDemoStore().attachments || [])
      .filter((row) => row.entity_type === entityType && (!entityId || row.entity_id === entityId))
      .filter((row) => includeArchived || !row.archived_at)
      .map(decorate)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  },

  async uploadForEntity(entityType, entityId, file, metadata = {}) {
    const payload = payloadFrom({ entityType, entityId, file, metadata });
    if (isSupabaseConfigured && file) {
      const { data: existing } = await supabase
        .from('attachments')
        .select('id')
        .eq('organization_id', DEMO_META.organizationId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('section', payload.section)
        .eq('section_ref', payload.section_ref)
        .eq('original_filename', payload.original_filename)
        .is('archived_at', null)
        .maybeSingle();
      if (existing) throw new Error('This demo document is already attached to the selected record');

      const { error: uploadError } = await supabase.storage
        .from(payload.storage_bucket)
        .upload(payload.storage_path, file, { upsert: false, contentType: payload.mime_type });
      if (uploadError) throw uploadError;
    }
    return createMetadata(payload);
  },

  async createMetadata(entityType, entityId, metadata = {}) {
    const payload = payloadFrom({ entityType, entityId, file: null, metadata });
    return createMetadata(payload);
  },

  async archiveAttachment(id, reason = 'Demo attachment archived') {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('archive_attachment', { p_attachment_id: id, p_reason: reason });
      if (error) throw error;
      return decorate(data);
    }
    const store = readDemoStore();
    const index = (store.attachments || []).findIndex((row) => row.id === id);
    if (index < 0) throw new Error('Attachment not found');
    store.attachments[index] = { ...store.attachments[index], archived_at: nowIso(), updated_at: nowIso() };
    writeDemoStore(store);
    return decorate(store.attachments[index]);
  },

  async restoreAttachment(id, reason = 'Demo attachment restored') {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('restore_attachment', { p_attachment_id: id, p_reason: reason });
      if (error) throw error;
      return decorate(data);
    }
    const store = readDemoStore();
    const index = (store.attachments || []).findIndex((row) => row.id === id);
    if (index < 0) throw new Error('Attachment not found');
    store.attachments[index] = { ...store.attachments[index], archived_at: null, updated_at: nowIso() };
    writeDemoStore(store);
    return decorate(store.attachments[index]);
  },

  async getSignedUrl(id) {
    const storeRecord = !isSupabaseConfigured
      ? (readDemoStore().attachments || []).find((row) => row.id === id)
      : null;
    if (!isSupabaseConfigured) {
      if (!storeRecord) throw new Error('Attachment not found');
      const body = encodeURIComponent(`Demo document placeholder\n${storeRecord.original_filename}\nNo production file is stored here.`);
      return `data:text/plain;charset=utf-8,${body}`;
    }

    const { data: record, error } = await supabase.from('attachments').select('*').eq('id', id).single();
    if (error) throw error;
    const { data, error: signError } = await supabase.storage
      .from(record.storage_bucket)
      .createSignedUrl(record.storage_path, 600);
    if (signError) throw signError;
    return data.signedUrl;
  },
};

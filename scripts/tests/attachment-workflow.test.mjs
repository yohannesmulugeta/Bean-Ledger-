import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEMO_META, seedAttachments } from '../../src/services/demoData.js';

const ATTACHMENT_ENTITY_TYPES = [
  'purchase_record',
  'warehouse_receipt',
  'export_contract',
  'buyer_inspection',
  'material_register_entry',
];

function validateAttachmentInput({ entityType, fileName }) {
  if (!ATTACHMENT_ENTITY_TYPES.includes(entityType)) throw new Error(`Invalid attachment entity type: ${entityType}`);
  if (!String(fileName || '').trim()) throw new Error('Attachment filename is required');
}

function slug(value) {
  return String(value || 'document').trim().replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').toLowerCase();
}

function buildAttachmentPath({ organizationId = DEMO_META.organizationId, entityType, entityId, fileName }) {
  validateAttachmentInput({ entityType, fileName });
  return `${organizationId}/${entityType}/${entityId || 'unlinked'}/${Date.now()}-${slug(fileName)}`;
}

function createState() {
  return { attachments: seedAttachments.map((item) => ({ ...item })) };
}

function active(rows) {
  return rows.filter((row) => !row.archived_at);
}

function listForEntity(state, entityType, entityId, includeArchived = false) {
  return state.attachments
    .filter((row) => row.entity_type === entityType && (!entityId || row.entity_id === entityId))
    .filter((row) => includeArchived || !row.archived_at);
}

function createAttachment(state, payload) {
  validateAttachmentInput({ entityType: payload.entity_type, fileName: payload.original_filename });
  if (state.attachments.some((row) => (
    !row.archived_at
    && row.entity_type === payload.entity_type
    && row.entity_id === payload.entity_id
    && row.section === payload.section
    && row.section_ref === payload.section_ref
    && row.original_filename.toLowerCase() === payload.original_filename.toLowerCase()
  ))) {
    throw new Error('This demo document is already attached to the selected record');
  }
  const record = {
    id: `attachment-${state.attachments.length + 1}`,
    organization_id: DEMO_META.organizationId,
    base44_id: null,
    storage_bucket: 'demo-documents',
    storage_path: buildAttachmentPath({
      entityType: payload.entity_type,
      entityId: payload.entity_id,
      fileName: payload.original_filename,
    }),
    is_demo: true,
    created_at: '2026-06-18T00:00:00Z',
    updated_at: '2026-06-18T00:00:00Z',
    archived_at: null,
    ...payload,
  };
  state.attachments.push(record);
  return record;
}

function archiveAttachment(state, id) {
  const row = state.attachments.find((item) => item.id === id);
  if (!row) throw new Error('Attachment not found');
  row.archived_at = '2026-06-18T01:00:00Z';
  return row;
}

function restoreAttachment(state, id) {
  const row = state.attachments.find((item) => item.id === id);
  if (!row) throw new Error('Attachment not found');
  row.archived_at = null;
  return row;
}

assert.ok(ATTACHMENT_ENTITY_TYPES.includes('purchase_record'), 'purchase attachments are allowed');
assert.throws(() => validateAttachmentInput({ entityType: 'notification', fileName: 'bad.txt' }), /invalid attachment entity type/i);
assert.throws(() => validateAttachmentInput({ entityType: 'purchase_record', fileName: '' }), /filename is required/i);

const state = createState();
assert.equal(seedAttachments.every((row) => row.is_demo), true, 'seed attachments are demo flagged');
assert.equal(seedAttachments.some((row) => row.archived_at), true, 'archived demo attachment seed exists');
assert.equal(seedAttachments.some((row) => row.file_url), false, 'no permanent signed URL is stored in seed attachments');

const purchaseAttachment = seedAttachments.find((row) => row.entity_type === 'purchase_record' && !row.archived_at);
const purchaseRows = listForEntity(state, 'purchase_record', purchaseAttachment.entity_id);
assert.equal(purchaseRows.length, 1, 'list by entity returns purchase attachment');
assert.equal(listForEntity(state, 'warehouse_receipt', purchaseAttachment.entity_id).length, 0, 'entity filtering excludes wrong entity type');

const created = createAttachment(state, {
  entity_type: 'buyer_inspection',
  entity_id: 'f1111111-1111-4111-8111-000000000001',
  section: 'inspection_document',
  section_ref: 'cupping_sheet',
  original_filename: 'demo-cupping-sheet.txt',
  mime_type: 'text/plain',
  file_size_bytes: 42,
  description: 'Synthetic test file',
});
assert.equal(created.is_demo, true, 'new metadata defaults to demo data');
assert.match(created.storage_path, /buyer_inspection\/f1111111-1111-4111-8111-000000000001\/.*demo-cupping-sheet\.txt/, 'storage path includes entity and file name');
assert.equal(Object.hasOwn(created, 'file_url'), false, 'created metadata does not store signed URL');
assert.throws(() => createAttachment(state, {
  entity_type: 'buyer_inspection',
  entity_id: 'f1111111-1111-4111-8111-000000000001',
  section: 'inspection_document',
  section_ref: 'cupping_sheet',
  original_filename: 'demo-cupping-sheet.txt',
}), /already attached/i, 'duplicate active upload is rejected');

archiveAttachment(state, created.id);
assert.equal(active(listForEntity(state, 'buyer_inspection', created.entity_id, true)).some((row) => row.id === created.id), false, 'archive removes attachment from active list');
restoreAttachment(state, created.id);
assert.equal(listForEntity(state, 'buyer_inspection', created.entity_id).some((row) => row.id === created.id), true, 'restore returns attachment to active list');
assert.equal(listForEntity(state, 'material_register_entry', 'missing-id').length, 0, 'empty state returns no rows');

const migration = readFileSync('supabase/migrations/202606180009_phase10_attachments_demo_schema.sql', 'utf8');
['attachments', 'demo-documents', 'demo-receipts', 'demo-export-documents', 'create_attachment_metadata', 'archive_attachment', 'restore_attachment'].forEach((token) => {
  assert.ok(migration.includes(token), `${token} is present in migration`);
});
assert.ok(!migration.includes('service_role'), 'migration does not expose service role credentials');

console.log('Phase 10 attachment workflow tests passed');

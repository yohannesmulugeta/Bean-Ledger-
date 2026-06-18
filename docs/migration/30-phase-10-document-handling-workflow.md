# Phase 10 Document Handling Workflow

This phase preserves the existing document UI style and routes migrated modules through `src/services/attachmentService.js`.

## Demo Behavior

- Uploads are demo-only.
- Files are stored in private demo buckets when Supabase is configured.
- Local fallback stores metadata only and opens a generated placeholder text URL.
- Delete actions archive metadata instead of permanently deleting rows.
- Restore is available in the generic demo document panel.
- Duplicate active uploads for the same entity, section, section reference, and filename are rejected.

## Pages Connected

- Purchase records
- Warehouse receipts
- Export contracts
- Buyer inspections
- Material register

## Existing Source Behavior Reviewed

Existing Base44 attachment components used:

- `base44.integrations.Core.UploadFile({ file })`
- `base44.entities.Attachment.filter(...)`
- `base44.entities.Attachment.create(...)`
- `base44.entities.Attachment.delete(...)`

Existing fields:

- `entity_type`
- `entity_id`
- `section`
- `section_ref`
- `file_url`
- `file_name`
- `file_size`
- `uploaded_at`
- `uploaded_by`

Existing preview behavior used permanent `file_url` links. Phase 10 replaces this with temporary signed URLs where Supabase Storage is available.

## Demo Warning

The UI now shows “Demo documents only” warnings in the migrated document areas.

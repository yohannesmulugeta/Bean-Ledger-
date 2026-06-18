# Future Base44 Attachment Migration Plan

Phase 10 does not import real Base44 files. This plan describes the later production-safe path.

## Future Inputs

Required before real migration:

- Complete Base44 attachment export
- Source attachment IDs
- Entity type and entity ID references
- Original file URLs or file handles
- Checksums where available
- File size and MIME type

## Proposed Steps

1. Export Base44 attachment metadata locally.
2. Reconcile attachment `entity_type` and `entity_id` to migrated Supabase UUIDs through `migration_id_map` and preserved `base44_id`.
3. Download files to a local quarantine directory.
4. Validate filename, MIME type, size, and checksum.
5. Upload files into private Supabase Storage buckets.
6. Insert `attachments` rows with `base44_id`, `storage_bucket`, and `storage_path`.
7. Generate reconciliation reports for missing files, orphaned references, duplicate filenames, and failed uploads.

## Safety Rules

- Never store service-role credentials in frontend code.
- Never store permanent signed URLs in `attachments`.
- Keep private buckets private.
- Do not delete Base44 files until a reconciliation report proves successful migration.
- Preserve original Base44 IDs for rollback and audit.

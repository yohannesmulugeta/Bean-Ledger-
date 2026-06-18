# Phase 10 Attachments Schema

Phase 10 adds a demo-only attachment metadata layer for migrated KKGT modules. It does not import Base44 files, upload real customer files, run `supabase db push`, or deploy.

## Migration

`supabase/migrations/202606180009_phase10_attachments_demo_schema.sql`

## Table

`public.attachments`

Key fields:

- `id uuid primary key`
- `organization_id uuid not null`
- `base44_id text nullable`
- `entity_type text not null`
- `entity_id uuid nullable`
- `section text`
- `section_ref text`
- `original_filename text not null`
- `storage_bucket text not null`
- `storage_path text not null`
- `mime_type text`
- `file_size_bytes bigint`
- `description text`
- `uploaded_by text`
- `is_demo boolean default true`
- `created_at timestamptz`
- `updated_at timestamptz`
- `archived_at timestamptz`

Compatibility fields `section` and `section_ref` preserve the existing Base44 attachment slot behavior.

## Entity Types

- `purchase_record`
- `warehouse_receipt`
- `export_contract`
- `buyer_inspection`
- `material_register_entry`

## Storage Buckets

- `demo-documents`
- `demo-receipts`
- `demo-export-documents`

Buckets are private. Permanent signed URLs are not stored in the database.

## RPC Functions

- `list_attachments_for_entity`
- `create_attachment_metadata`
- `archive_attachment`
- `restore_attachment`

## Seed Data

Synthetic metadata rows were added for purchase, warehouse, export contract, buyer inspection, material invoice, and one archived document placeholder.

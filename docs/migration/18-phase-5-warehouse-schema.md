# Phase 5 Warehouse Schema

Phase 5 adds demo-only warehouse receipt and stock movement tables on top of the Phase 4 Supplier/Purchase foundation.

## Migration

- `supabase/migrations/202606180004_phase5_warehouse_demo_schema.sql`

## Tables

- `warehouse_receipts`
- `warehouse_receipt_history`
- `stock_movements`

## Key Rules

- UUID primary keys.
- Nullable `base44_id` for future Base44 migration.
- `organization_id` on operational records.
- Numeric KG values, never floats.
- Non-negative dispatch and shortage.
- Received KG must be greater than zero.
- Received KG cannot exceed dispatch KG in this demo workflow.
- Active receipt numbers are unique within an organization.
- One active warehouse receipt per purchase.
- Operational records use `archived_at` instead of permanent deletion.

## RPC Functions

- `validate_warehouse_receipt_payload`
- `create_warehouse_receipt`
- `update_warehouse_receipt`
- `archive_warehouse_receipt`
- `restore_warehouse_receipt`
- `calculate_supplier_available_kg`

Create, update, archive, and restore functions update receipt records, stock movements, history, audit logs, and purchase recalculation inside one database transaction.

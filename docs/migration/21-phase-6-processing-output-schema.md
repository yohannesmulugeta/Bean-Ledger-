# Phase 6 Processing and Output Schema

Date: 2026-06-18

Phase 6 adds the demo-only Supabase foundation for the core coffee flow after warehouse receipt:

`purchase -> warehouse receipt -> sample / processing -> output report`

No production Supabase project was used.

## Migration

Created:

- `supabase/migrations/202606180005_phase6_processing_output_demo_schema.sql`

## Tables

### `sample_logs`

Purpose: records Warehouse sample deductions from supplier available KG.

Key columns:

- `id uuid primary key`
- `organization_id`
- `supplier_id`
- `purchase_record_id`
- `warehouse_receipt_id`
- `base44_id`
- `sample_type`
- `sample_kg`
- `sample_date`
- `sample_datetime`
- `is_demo`
- `created_at`, `created_by`, `updated_at`, `updated_by`
- `archived_at`

Constraints:

- `sample_kg > 0`
- valid sample type values
- foreign keys to organization, supplier, purchase, and warehouse receipt where applicable

### `processing_logs`

Purpose: records Standard demo processing deductions from supplier available KG.

Key columns:

- `id uuid primary key`
- `organization_id`
- `supplier_id`
- `purchase_record_id`
- `warehouse_receipt_id`
- `base44_id`
- `entry_type`
- `entry_mode`
- `processing_date`
- `bags_sent`
- `kg_sent`
- `actual_weighed_kg`
- `batch_variance_kg`
- `is_demo`
- `created_at`, `created_by`, `updated_at`, `updated_by`
- `archived_at`

Constraints:

- `actual_weighed_kg > 0`
- bag and KG fields cannot be negative
- valid entry type and entry mode values

### `output_reports`

Purpose: records demo processing output and creates export/reject stock pool movements.

Key columns:

- `id uuid primary key`
- `organization_id`
- `processing_log_id`
- `supplier_id`
- `base44_id`
- `entry_type`
- `start_date`, `end_date`
- `total_kg_processed`
- `export_bags`, `export_kg`
- `reject_bags`, `reject_kg`
- `waste_kg`
- `reject_pct`, `waste_pct`
- `export_status`
- `is_demo`
- `created_at`, `created_by`, `updated_at`, `updated_by`
- `archived_at`

Constraints:

- `total_kg_processed > 0`
- bag and KG fields cannot be negative
- `end_date >= start_date`
- valid entry type and export status values

## Stock Movement Changes

The `stock_movements` movement type constraint now allows:

- `warehouse_received`
- `warehouse_receipt_archived`
- `sample_deduction`
- `processing_deduction`
- `output_export`
- `output_reject`
- `stock_adjustment`

## RPC Functions

Created:

- `validate_supplier_available`
- `calculate_output_totals`
- `create_sample_log`
- `update_sample_log`
- `archive_sample_log`
- `restore_sample_log`
- `create_processing_log`
- `update_processing_log`
- `archive_processing_log`
- `restore_processing_log`
- `create_output_report`
- `update_output_report`
- `archive_output_report`
- `restore_output_report`

Replaced:

- `calculate_supplier_available_kg`

## Business Constants

- `1 feresula = 17 KG`
- `standard/reject bag = 85 KG`
- `export bag = 60 KG`
- `1 KG = 2.2046 LB`

## Output Formulas

- `export_kg = export_bags * 60`
- `reject_kg = reject_bags * 85`
- `waste_kg = total_kg_processed - export_kg - reject_kg`
- negative waste is rejected

## Demo Boundary

This is a demo operational schema only. It uses synthetic seed data and keeps Base44 code for unmigrated modules.

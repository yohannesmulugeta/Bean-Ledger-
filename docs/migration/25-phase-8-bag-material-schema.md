# Phase 8 Bag and Material Schema

Date: 2026-06-18

Phase 8 adds the demo-only Supabase foundation for the Bag Ledger and Materials Register workflows.

No production Supabase project was used. No real Base44 data was imported.

## Migration

Created:

- `supabase/migrations/202606180007_phase8_bags_materials_demo_schema.sql`

## Tables

Created:

- `bag_receipts`
- `reject_bag_usages`
- `supplier_bag_returns`
- `supplier_bag_payments`
- `supplier_bag_settlements`
- `material_register_entries`
- `material_movements`

Each operational table includes:

- `id uuid primary key`
- `organization_id`
- nullable `base44_id`
- `is_demo`
- timestamps
- archive fields
- constraints for invalid negative quantities and money
- foreign keys where relevant
- indexes for organization, holder, category, item, and archive filters

## RPC Functions

Created:

- `calculate_supplier_bag_balance`
- `create_bag_receipt`
- `update_bag_receipt`
- `archive_bag_receipt`
- `restore_bag_receipt`
- `create_reject_bag_usage`
- `update_reject_bag_usage`
- `archive_reject_bag_usage`
- `restore_reject_bag_usage`
- `create_supplier_bag_return`
- `record_supplier_bag_payment`
- `create_supplier_bag_settlement`
- `calculate_material_balance`
- `create_material_register_entry`
- `update_material_register_entry`
- `archive_material_register_entry`
- `restore_material_register_entry`

Helper functions:

- `bag_holder_mode`
- `bag_holder_name`
- `material_item_key`
- `validate_material_usage`
- `log_demo_action`

## Demo Boundary

This is a demo operational schema only. It preserves `base44_id` for future migration and keeps Base44 code for modules outside Phase 8.

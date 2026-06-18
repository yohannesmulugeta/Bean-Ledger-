# Phase 7 Export Contract and Buyer Inspection Schema

Date: 2026-06-18

Phase 7 adds the demo-only Supabase foundation for:

`output report -> buyer inspection sample -> export contract -> export payment`

No production Supabase project was used. No real Base44 export data was imported.

## Migration

Created:

- `supabase/migrations/202606180006_phase7_export_contract_demo_schema.sql`

## Tables

### `export_contracts`

Purpose: records demo export contract headers and authoritative calculated totals.

Key columns:

- `id uuid primary key`
- `organization_id`
- `output_report_id`
- `supplier_id`
- `base44_id`
- `contract_no`
- `contract_pi_number`
- `certificate_no`
- `contract_date`
- `stock_pool`
- `coffee_type`
- `coffee_grade`
- `destination_country`
- `buyer_name`
- `payment_terms`
- `export_bags`
- `export_kg`
- `export_sample_kg`
- `actual_shipped_kg`
- `pricing_method`
- `price_per_lb_usd`
- `price_per_kg_usd`
- `contract_rate_etb`
- calculated USD, ETB, cost, payment, balance, and profit fields
- `is_demo`
- `created_at`, `created_by`, `updated_at`, `updated_by`
- `archived_at`

Constraints:

- export bags cannot be negative
- KG fields cannot be negative
- prices, rates, totals, costs, and payments cannot be negative
- payment status and contract status are constrained to known demo values
- `contract_no` is unique per organization for active rows

### `export_contract_costs`

Purpose: stores additional ETB costs linked to an export contract.

Key columns:

- `id uuid primary key`
- `organization_id`
- `export_contract_id`
- `base44_id`
- `name`
- `amount_etb`
- `is_demo`
- timestamps and archive fields

Constraints:

- `amount_etb >= 0`
- foreign key to `export_contracts`

### `export_contract_materials`

Purpose: stores export material usage/cost rows linked to an export contract.

Key columns:

- `id uuid primary key`
- `organization_id`
- `export_contract_id`
- `base44_id`
- `name`
- `quantity`
- `unit_cost_etb`
- `total_cost_etb`
- `is_demo`
- timestamps and archive fields

Constraints:

- quantity and cost values cannot be negative
- foreign key to `export_contracts`

### `export_contract_payments`

Purpose: stores export contract payment receipts.

Key columns:

- `id uuid primary key`
- `organization_id`
- `export_contract_id`
- `base44_id`
- `payment_date`
- `amount_usd`
- `actual_rate_etb`
- `amount_etb`
- `bank_name`
- `reference_no`
- `note`
- `is_demo`
- timestamps and archive fields

Constraints:

- USD, ETB, and rate values cannot be negative
- foreign key to `export_contracts`

### `buyer_inspections`

Purpose: records buyer inspection samples and their result.

Key columns:

- `id uuid primary key`
- `organization_id`
- `export_contract_id`
- `base44_id`
- `inspection_date`
- `buyer_name`
- `coffee_type`
- `kg_to_inspect`
- `sample_kg_taken`
- `result`
- `kg_approved`
- `kg_rejected`
- `action_taken`
- `notes`
- `is_demo`
- timestamps and archive fields

Constraints:

- inspection KG fields cannot be negative
- result and action values are constrained to known demo values
- foreign key to `export_contracts`

## Stock Movement Changes

`stock_movements` now includes nullable `coffee_type`.

The movement type constraint now allows:

- `export_contract_deduction`
- `buyer_inspection_sample`

Phase 7 does not remove Phase 4, Phase 5, or Phase 6 movement types.

## RPC Functions

Created:

- `stock_pool_for_contract`
- `calculate_export_available_stock`
- `validate_export_stock`
- `calculate_export_contract_totals`
- `recalculate_export_contract`
- `replace_export_child_rows`
- `create_export_contract`
- `update_export_contract`
- `archive_export_contract`
- `restore_export_contract`
- `record_export_payment`
- `update_export_payment`
- `archive_export_payment`
- `create_buyer_inspection`
- `update_buyer_inspection`
- `archive_buyer_inspection`

## Business Constants

- `export bag = 60 KG`
- `reject bag = 85 KG`
- `1 KG = 2.2046 LB`

## Export Contract Formulas

- `export_kg = export_bags * 60`
- `actual_shipped_kg = export_kg - export_sample_kg`
- `total_lb = actual_shipped_kg * 2.2046`
- per-lb value: `total_export_value_usd = total_lb * price_per_lb_usd`
- per-KG value: `total_export_value_usd = actual_shipped_kg * price_per_kg_usd`
- `total_export_value_etb = total_export_value_usd * contract_rate_etb`
- `total_costs_etb = additional_costs + materials`
- `grand_total_revenue_etb = total_export_value_etb + reject_sales_etb`
- `profit_etb = grand_total_revenue_etb - total_costs_etb`
- `profit_usd = profit_etb / contract_rate_etb`
- `balance_etb = total_export_value_etb - payments_etb`

The PostgreSQL RPC is authoritative for persisted totals.

## Demo Boundary

This is a demo operational schema only. It uses synthetic seed rows marked with `is_demo = true`, preserves nullable `base44_id` for future migration, and keeps Base44 code for modules outside Phase 7.

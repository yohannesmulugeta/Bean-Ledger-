# Phase 7 Export Stock and Profit Workflow

Date: 2026-06-18

This document explains the demo-only export stock flow added in Phase 7.

## Stock Flow

Phase 6 creates export stock from output reports:

```text
output_export -> export_available
output_reject -> reject_available
```

Phase 7 consumes export stock:

```text
buyer_inspection_sample -> deducts sample KG from export_available
export_contract_deduction -> deducts export bags * 60 KG from export_available
```

Archived buyer inspections and archived export contracts do not reduce available stock.

## Available Stock Formula

For each organization, stock pool, and coffee type:

```text
available_kg =
  output_export
  - buyer_inspection_sample
  - export_contract_deduction
```

For reject stock:

```text
available_kg = output_reject
```

The Phase 7 seed produces:

- `export_available / Unwashed Lekempti = 236 KG`
- `reject_available / Unwashed Lekempti = 170 KG`

## Contract Creation Guardrail

`create_export_contract` validates stock before writing the contract and its stock movement.

If requested export KG exceeds available export stock, the RPC raises:

```text
Requested export KG exceeds available stock
```

The failed transaction leaves no export contract row and no stock movement row.

## Archive and Restore Behavior

Archive behavior:

- `archive_export_contract` sets `archived_at` on the contract.
- linked `export_contract_deduction` movements are archived.
- stock becomes available again.

Restore behavior:

- `restore_export_contract` validates stock again.
- the contract and linked deduction movement are unarchived only when stock is available.

Buyer inspection archive behavior follows the same pattern for sample stock movements.

## Profit Calculation

The UI can preview calculations, but persisted totals come from PostgreSQL.

The authoritative calculation is:

```text
export_kg = export_bags * 60
actual_shipped_kg = export_kg - export_sample_kg
total_lb = actual_shipped_kg * 2.2046
total_export_value_usd = total_lb * price_per_lb_usd
total_export_value_etb = total_export_value_usd * contract_rate_etb
total_costs_etb = additional_costs + materials
grand_total_revenue_etb = total_export_value_etb + reject_sales_etb
profit_etb = grand_total_revenue_etb - total_costs_etb
profit_usd = profit_etb / contract_rate_etb
balance_etb = total_export_value_etb - payments_etb
```

For per-KG contracts, USD value uses:

```text
total_export_value_usd = actual_shipped_kg * price_per_kg_usd
```

## Demo Data

Phase 7 seed rows are synthetic only:

- one active export contract with partial payment
- one archived export contract
- one passed buyer inspection
- export additional cost rows
- export material cost row
- export payment row
- stock movements for contract deduction and inspection sample deduction

All new rows are marked `is_demo = true`.

## Out of Scope

Phase 7 does not migrate:

- bags
- materials register workflows
- notifications
- attachments/files
- dashboards/reports
- full Supabase Auth
- real Base44 data import
- production deployment

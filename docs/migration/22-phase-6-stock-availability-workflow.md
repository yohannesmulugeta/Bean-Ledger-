# Phase 6 Stock Availability Workflow

Date: 2026-06-18

## Supplier Available KG

Phase 6 makes `stock_movements` the authority for supplier available KG.

Formula:

```text
available_kg =
  warehouse_received
  - sample_deduction
  - processing_deduction
  +/- stock_adjustment
```

Output report movements do not deduct supplier available KG again because supplier stock was already consumed when processing was created.

## Movement Behavior

### Warehouse Receipt

Creates:

- `movement_type = warehouse_received`
- `stock_pool = supplier_available`
- positive KG

### Sample Log

Creates:

- `movement_type = sample_deduction`
- `stock_pool = supplier_available`
- positive KG that is subtracted by `calculate_supplier_available_kg`

Archive:

- archives the linked movement

Restore:

- unarchives the linked movement after availability validation

### Processing Log

Creates:

- `movement_type = processing_deduction`
- `stock_pool = supplier_available`
- positive KG that is subtracted by `calculate_supplier_available_kg`

Archive:

- archives the linked movement

Restore:

- unarchives the linked movement after availability validation

### Output Report

Creates:

- `movement_type = output_export`
- `stock_pool = export_available`
- `quantity_kg = export_bags * 60`

Creates:

- `movement_type = output_reject`
- `stock_pool = reject_available`
- `quantity_kg = reject_bags * 85`

Archive:

- archives linked export/reject movements

Restore:

- unarchives linked export/reject movements

## Atomicity

All stock-changing Phase 6 writes are routed through PostgreSQL RPC functions. A failed validation raises an exception and rolls back the whole operation.

Verified locally:

- over-available sample create fails with zero sample rows written
- failed sample create writes zero stock movements
- impossible output negative waste is rejected by calculation tests

## Seeded Demo Availability

After Phase 6 seed:

- Demo Wollega Cooperative: `1484.000 KG`
- Demo Guji Washing Station: `550.000 KG`
- Demo Sidama Export Farm: `0 KG`

These values are synthetic and must not be treated as production records.

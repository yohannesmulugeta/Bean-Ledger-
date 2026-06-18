# Phase 5 Warehouse Workflow

The demo warehouse workflow is limited to warehouse receipts and supplier coffee availability.

## Receipt Flow

1. User selects a purchase by coffee code.
2. The form displays supplier and dispatch KG from the purchase.
3. User enters received KG, receipt number, date, warehouse, and notes.
4. The UI displays shortage KG as `dispatch KG - received KG`.
5. Save calls `warehouseService`.
6. Supabase mode calls warehouse RPC functions.
7. Local demo mode updates the synthetic demo store consistently.
8. Purchase warehouse KG, commission, grand total, and balance are recalculated.
9. Stock movement and warehouse history rows are written.

## Supplier Availability

For Phase 5:

```text
Available KG = active warehouse received stock movements
```

Samples, processing, exports, bags, and stock adjustments are intentionally not included yet.

Later phases should extend this to:

```text
Available KG =
  warehouse received KG
  - sample KG
  - processing KG
  +/- approved stock adjustments
```

## Out of Scope

- Processing
- Output reports
- Export contracts
- Buyer inspections
- Bags
- Materials
- Notifications
- Attachments
- Users and full Supabase Auth
- Production data

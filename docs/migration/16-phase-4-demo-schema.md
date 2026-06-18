# Phase 4 Demo Supabase Schema

Phase 4 creates the first demo-only operational Supabase surface for KKGT Flow. It does not import real Base44 exports and does not connect to production Supabase.

## Scope

- Demo-only organization, profile, roles, permissions, suppliers, purchases, additional purchase costs, purchase payments, and audit logs.
- Supplier and Purchase modules only.
- Synthetic records marked with `is_demo = true`.
- Future Base44 migration support through nullable `base44_id` columns.
- Soft deletion through `archived_at`.

Out of scope for this phase: warehouse, processing, exports, bags, materials, notifications, production auth, and production deployment.

## Migration

Created migration:

- `supabase/migrations/202606180003_phase4_demo_supplier_purchase_schema.sql`

Tables created:

- `suppliers`
- `purchase_records`
- `purchase_additional_costs`
- `purchase_payments`
- `audit_logs`

Existing foundation tables extended with `is_demo`:

- `organizations`
- `profiles`
- `roles`
- `permissions`
- `organization_memberships`

## Calculation RPCs

Authoritative purchase formulas live in PostgreSQL:

- `calculate_purchase_totals(...)`
- `recalculate_purchase_record(p_purchase_record_id uuid)`
- `recalculate_purchase_record_trigger()`

Preserved formulas:

- `1 feresula = 17 KG`
- `net_feresula = dispatch_kg / 17`
- `purchase_price = unit_price * net_feresula`
- `warehouse_feresula = warehouse_received_kg / 17`
- `commission = warehouse_feresula * unit_price * commission_percent`
- `grand_total = purchase_price + commission + additional_costs`
- `balance = grand_total - payments`
- balances within `+/- 1 ETB` are treated as settled

## Safety Constraints

- UUID primary keys.
- Nullable `base44_id` for future source ID preservation.
- `organization_id` on business tables.
- Numeric money/KG fields with non-negative checks.
- `timestamptz` timestamps.
- `archived_at` instead of permanent deletion.
- Active supplier names unique per organization.
- Active coffee codes unique per organization.
- Foreign keys and indexes for organization, supplier, child purchase rows, and audit lookup.

## Demo Seed

`supabase/seed.sql` contains synthetic local-only seed rows:

- one demo organization
- one demo profile/auth user
- demo admin and purchaser roles
- demo supplier/purchase permissions
- three demo suppliers
- three demo purchases
- additional costs
- partial and completed payments

All seed records are labeled as demo data with `is_demo = true` where applicable.

# Phase 9 Dashboard And Reports Schema

Phase 9 adds a local-only demo reporting contract for migrated KKGT operational modules. It does not connect to production Supabase, does not deploy, and does not import real Base44 records.

## Migration

`supabase/migrations/202606180008_phase9_dashboard_reports_demo_schema.sql`

## Read-Only Reporting Objects

- `public.demo_dashboard_summary_v`
- `public.get_demo_dashboard_summary(p_organization_id uuid)`
- `public.get_demo_report_snapshot(p_organization_id uuid)`
- `public.get_demo_audit_log_feed(p_organization_id uuid)`
- `public.get_demo_archived_records_feed(p_organization_id uuid)`

## Active Record Rules

Dashboard active totals use `archived_at is null`.

The archived-record feed intentionally returns only rows with `archived_at is not null`.

## Modules Covered

- Suppliers
- Purchases
- Warehouse receipts
- Sample logs
- Processing logs
- Output reports
- Export contracts
- Buyer inspections
- Bag balances
- Material balances
- Audit logs
- Archived migrated records

## Demo Data

The migration adds synthetic audit rows marked `is_demo = true`. They are labels and history examples only, not production records.

## Production Safety

Do not run `supabase db push` for this phase. Validate through local reset only.

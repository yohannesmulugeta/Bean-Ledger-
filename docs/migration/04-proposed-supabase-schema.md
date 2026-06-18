# Proposed Supabase Operational Schema

This phase creates only foundational auth/tenant/migration tables. The operational tables below are proposed for later phased migrations after full data export and reconciliation. All tables should include `id uuid primary key`, `organization_id uuid`, `base44_id text`, `created_at`, `created_by`, `updated_at`, `updated_by`, and `archived_at` where records are user-archivable.

## Supplier and Purchase Domain

- `suppliers`: supplier master data, agent, region, coffee type, opening stock, phone, station, agreement dates.
- `purchase_records`: coffee code, supplier FK, purchase date, dispatch KG, unit price, calculated feresula, purchase price, commission, grand total, payment status, archived metadata.
- `purchase_additional_costs`: one row per purchase cost item.
- `purchase_payments`: normalized replacement for `PurchaseRecord.payment_history`; CPV/reference, bank, amount ETB, date, created by.
- `warehouse_receipts`: purchase FK, coffee code, supplier FK, dispatch KG, warehouse received KG, bags, GRN, dispatch number, received date.
- `samples`: normalized `SampleLog` for warehouse, export inspection, export, and arrival samples with nullable FKs.

## Processing, Output, and Stock Domain

- `processing_logs`: supplier/receipt/inspection links, entry type, KG sent, actual weighed KG, coffee type, status, archive metadata.
- `output_reports`: processing FK, entry type, export bags/KG, reject bags/KG, waste KG, additional pool-1 KG, final registrar fields.
- `stock_movements`: append-only ledger of stock-affecting events from receipts, samples, processing, outputs, inspections, contracts, and archive/restore actions.

## Export Domain

- `export_contracts`: contract details, buyer, destination, stock pool, export KG/bags, shipped KG, pricing method, rates, USD/ETB values, status, payment status.
- `export_costs`: normalized `cost_rows` plus legacy named cost fields during migration.
- `export_materials`: normalized `material_rows` linked to contracts and material movements.
- `export_payments`: normalized export payment history in USD and ETB.

## Bags and Materials

- `bag_movements`: receipts, reject usage, supplier/agent returns, and cash settlements as ledger rows; preserve 85 KG reject/standard bag rule.
- `material_movements`: export/general purchases and usage from `MaterialRegisterEntry`, with item type and bag size.

## System Tables

- `notifications`: recipient profile/role, type, title, message, link, severity, read state, related entity.
- `notification_preferences`: normalized disabled notification types per user.
- `audit_logs`: append-only replacement for `ActivityLog` and `UserActivityLog`.
- `warehouse_receipt_history`: append-only receipt-specific history.
- `attachments`: metadata for Supabase Storage objects with parent table/id, section, section ref, file name, mime type, size, uploaded by.

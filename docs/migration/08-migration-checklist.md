# Migration Checklist

1. Source preservation: keep Base44 source, docs, schema exports, and migration commits intact.
2. Complete Base44 data export: export every entity, including legacy duplicates and audit/history.
3. Attachment export: download Base44-hosted files, checksum them, and map to attachment metadata.
4. Authentication: implement Supabase Auth, invites, initial admin, password reset, disabled users.
5. Schema creation: create operational tables in small domain migrations.
6. RLS: enforce organization, role, and permission rules per table.
7. Suppliers: migrate supplier master and reconcile name duplicates.
8. Purchases: migrate purchase records and preserve formulas.
9. Payments: normalize purchase payment history and reconcile totals.
10. Warehouse receipts: migrate receipts, GRN data, and bag sync behavior.
11. Samples: migrate sample types and deduction rules.
12. Processing: migrate processing logs and recleaning links.
13. Output reports: preserve export/reject/waste formulas.
14. Stock calculations: replace calculated views with tested SQL/services.
15. Export contracts: migrate contract, pricing, costs, payments, and material rows.
16. Bags: migrate receipts, reject usage, returns, payments, and settlement adjustments.
17. Materials: migrate material purchases/usages.
18. Notifications: migrate preferences, notifications, and Telegram behavior.
19. Audit logs: migrate ActivityLog, UserActivityLog, WarehouseReceiptHistory as immutable logs.
20. Data migration: run staged import with migration batches and id map.
21. Reconciliation: compare entity counts, money totals, KG totals, stock pools, and samples.
22. Automated tests: add unit, integration, RLS, import, and formula regression tests.
23. Staging deployment: deploy to staging Supabase/Vercel only after local validation.
24. Production cutover: freeze Base44 writes, final export/import, validate, switch DNS/app config.
25. Rollback: preserve Base44 read-only fallback, backups, and documented rollback steps.

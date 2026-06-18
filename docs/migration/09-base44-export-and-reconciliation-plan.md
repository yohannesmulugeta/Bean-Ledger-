# Base44 Export and Reconciliation Plan

Generated on 2026-06-18T10:11:59.267Z.

This is a local-only migration export foundation. It does not connect to Supabase, does not link a Supabase project, and does not call the Base44 API. It assumes the user manually places Base44 JSON exports into `exports/base44/manual-drop/`, then the local scripts normalize and reconcile them.

## Required export files

| # | Entity | Expected file | Required fields | Known list caps in app code | Risk |
| --- | --- | --- | --- | --- | --- |
| 1 | `ActivityLog` | `ActivityLog.json` | `user_email`, `action_type`, `screen_name` | 500, 1000, 2000, 5000 | Existing UI/backup reads may stop at 5000 records. |
| 2 | `Attachment` | `Attachment.json` | `entity_type`, `entity_id`, `section`, `file_url`, `file_name` | 5000 | Existing UI/backup reads may stop at 5000 records. |
| 3 | `BagReceipt` | `BagReceipt.json` | `bags_received` | 500, 5000 | Existing UI/backup reads may stop at 5000 records. |
| 4 | `BuyerInspection` | `BuyerInspection.json` | `inspection_date`, `buyer_name`, `coffee_type`, `kg_to_inspect`, `sample_kg_taken` | 5000 | Existing UI/backup reads may stop at 5000 records. |
| 5 | `Export` | `Export.json` | `contract_number`, `buyer_name`, `buyer_country`, `coffee_type`, `quantity_kg` | - | - |
| 6 | `ExportContract` | `ExportContract.json` | `contract_no`, `destination_country`, `contract_date` | 500, 1000, 5000 | Existing UI/backup reads may stop at 5000 records. |
| 7 | `MaterialEntry` | `MaterialEntry.json` | `entry_date`, `item_name`, `quantity`, `unit_cost_etb` | - | - |
| 8 | `MaterialRegisterEntry` | `MaterialRegisterEntry.json` | `date`, `quantity` | 1000, 5000 | Existing UI/backup reads may stop at 5000 records. |
| 9 | `Notification` | `Notification.json` | `recipient_email`, `type`, `title`, `message` | 500, 1000, 5000 | Existing UI/backup reads may stop at 5000 records. |
| 10 | `NotificationSettings` | `NotificationSettings.json` | `user_email` | - | - |
| 11 | `OutputReport` | `OutputReport.json` | `start_date`, `end_date` | 500, 1000, 5000 | Existing UI/backup reads may stop at 5000 records. |
| 12 | `ProcessingBatch` | `ProcessingBatch.json` | `batch_number`, `lot_number`, `coffee_type`, `process_type`, `input_quantity_kg` | - | - |
| 13 | `ProcessingLog` | `ProcessingLog.json` | `date` | 500, 1000, 2000, 5000 | Existing UI/backup reads may stop at 5000 records. |
| 14 | `Purchase` | `Purchase.json` | `supplier_name`, `coffee_type`, `quantity_kg`, `price_per_kg`, `purchase_date` | - | - |
| 15 | `PurchaseRecord` | `PurchaseRecord.json` | `supplier_name`, `purchase_date` | 500, 1000, 2000, 5000 | Existing UI/backup reads may stop at 5000 records. |
| 16 | `RejectBagUsage` | `RejectBagUsage.json` | `date`, `bags_used` | 500, 5000 | Existing UI/backup reads may stop at 5000 records. |
| 17 | `RolePermission` | `RolePermission.json` | `role` | 500 | Existing UI reads are capped. |
| 18 | `SampleLog` | `SampleLog.json` | `sample_kg` | 500, 1000, 5000 | Existing UI/backup reads may stop at 5000 records. |
| 19 | `SecuritySetting` | `SecuritySetting.json` | `key`, `value` | - | - |
| 20 | `Supplier` | `Supplier.json` | `supplier_name` | 500, 5000 | Existing UI/backup reads may stop at 5000 records. |
| 21 | `SupplierBagPayment` | `SupplierBagPayment.json` | `payment_date`, `amount_etb` | 500, 5000 | Existing UI/backup reads may stop at 5000 records. |
| 22 | `SupplierBagReturn` | `SupplierBagReturn.json` | `return_date`, `bags_returned` | 500, 5000 | Existing UI/backup reads may stop at 5000 records. |
| 23 | `SupplierBagSettlement` | `SupplierBagSettlement.json` | `supplier_name` | 5000 | Existing UI/backup reads may stop at 5000 records. |
| 24 | `User` | `User.json` | `invited_by`, `approved_by`, `approved_at`, `rejected_by`, `rejected_at`, `rejection_reason`, `last_sign_in_at`, `internal_note` | - | - |
| 25 | `UserActivityLog` | `UserActivityLog.json` | `user_email`, `action` | - | - |
| 26 | `UserInvite` | `UserInvite.json` | `email`, `role` | - | - |
| 27 | `WarehouseInventory` | `WarehouseInventory.json` | `lot_number`, `coffee_type`, `quantity_kg`, `warehouse_location` | - | - |
| 28 | `WarehouseReceipt` | `WarehouseReceipt.json` | `coffee_code`, `supplier_name`, `received_date` | 500, 1000, 2000, 5000 | Existing UI/backup reads may stop at 5000 records. |
| 29 | `WarehouseReceiptHistory` | `WarehouseReceiptHistory.json` | `receipt_id`, `action_type`, `user_email`, `action_at` | 1000, 5000 | Existing UI/backup reads may stop at 5000 records. |

## Local workflow

1. Run `npm run migration:base44:prepare`.
2. Export every Base44 entity as JSON from Base44 or from an approved offline backup source.
3. Put the files into `exports/base44/manual-drop/` using names like `PurchaseRecord.json`.
4. Run `npm run migration:base44:package`.
5. Run `npm run migration:base44:reconcile`.
6. Review the generated report under `exports/base44/runs/<timestamp>/reconciliation-report.md`.

## Truncation detection rules

- Any entity count exactly equal to `500`, `1000`, `2000`, or `5000` is flagged as a likely cap boundary.
- Any entity with app code using a fixed `5000` cap must be treated as incomplete unless the Base44 export source proves the total count is below the cap.
- Attachments are reconciled separately through the `Attachment` entity and any URL-like fields found in other entity exports.

## Source ID preservation

The package script writes `id-map.json` with:

- `source_entity`
- `source_id`
- `record_hash`
- `normalized_file`

Future Supabase import scripts must use this map and write `base44_id` into every migrated row.

## Current fixed-limit reads found

| File | Entity | Operation | Cap |
| --- | --- | --- | --- |
| `src/components/admin/DownloadBackupButton.jsx` | `Supplier` | `list` | 5000 |
| `src/components/admin/DownloadBackupButton.jsx` | `PurchaseRecord` | `list` | 5000 |
| `src/components/admin/DownloadBackupButton.jsx` | `WarehouseReceipt` | `list` | 5000 |
| `src/components/admin/DownloadBackupButton.jsx` | `SampleLog` | `list` | 5000 |
| `src/components/admin/DownloadBackupButton.jsx` | `ProcessingLog` | `list` | 5000 |
| `src/components/admin/DownloadBackupButton.jsx` | `OutputReport` | `list` | 5000 |
| `src/components/admin/DownloadBackupButton.jsx` | `ExportContract` | `list` | 5000 |
| `src/components/admin/DownloadBackupButton.jsx` | `BuyerInspection` | `list` | 5000 |
| `src/components/admin/DownloadBackupButton.jsx` | `BagReceipt` | `list` | 5000 |
| `src/components/admin/DownloadBackupButton.jsx` | `RejectBagUsage` | `list` | 5000 |
| `src/components/admin/DownloadBackupButton.jsx` | `SupplierBagReturn` | `list` | 5000 |
| `src/components/admin/DownloadBackupButton.jsx` | `SupplierBagPayment` | `list` | 5000 |
| `src/components/admin/DownloadBackupButton.jsx` | `SupplierBagSettlement` | `list` | 5000 |
| `src/components/admin/DownloadBackupButton.jsx` | `MaterialRegisterEntry` | `list` | 5000 |
| `src/components/admin/DownloadBackupButton.jsx` | `ActivityLog` | `list` | 5000 |
| `src/components/admin/DownloadBackupButton.jsx` | `WarehouseReceiptHistory` | `list` | 5000 |
| `src/components/admin/DownloadBackupButton.jsx` | `Notification` | `list` | 5000 |
| `src/components/admin/DownloadBackupButton.jsx` | `RolePermission` | `list` | 500 |
| `src/components/admin/DownloadBackupButton.jsx` | `Attachment` | `list` | 5000 |
| `src/components/bagledger/BagReceiptsSection.jsx` | `Supplier` | `list` | 500 |
| `src/components/bagledger/BagReceiptsSection.jsx` | `BagReceipt` | `list` | 500 |
| `src/components/bagledger/RejectBagUsageSection.jsx` | `Supplier` | `list` | 500 |
| `src/components/bagledger/RejectBagUsageSection.jsx` | `RejectBagUsage` | `list` | 500 |
| `src/components/bagledger/SupplierBagSummary.jsx` | `BagReceipt` | `list` | 500 |
| `src/components/bagledger/SupplierBagSummary.jsx` | `RejectBagUsage` | `list` | 500 |
| `src/components/bagledger/SupplierBagSummary.jsx` | `SupplierBagPayment` | `list` | 500 |
| `src/components/bagledger/SupplierBagSummary.jsx` | `SupplierBagReturn` | `list` | 500 |
| `src/components/bagledger/SupplierBagSummary.jsx` | `Supplier` | `list` | 500 |
| `src/components/dashboard/SupplierBalancesTable.jsx` | `PurchaseRecord` | `list` | 500 |
| `src/components/dashboard/SupplierBalancesTable.jsx` | `WarehouseReceipt` | `list` | 500 |
| `src/components/materials/ExportMaterialsTab.jsx` | `MaterialRegisterEntry` | `list` | 1000 |
| `src/components/materials/GeneralPurchaseTab.jsx` | `MaterialRegisterEntry` | `list` | 1000 |
| `src/components/purchases/DuplicateReport.jsx` | `PurchaseRecord` | `list` | 500 |
| `src/components/shared/ArchivedRecordsSection.jsx` | `ActivityLog` | `filter` | 500 |
| `src/components/warehouse/WarehouseHistoryTab.jsx` | `WarehouseReceiptHistory` | `list` | 1000 |
| `src/pages/ActivityLog.jsx` | `ActivityLog` | `list` | 1000 |
| `src/pages/BuyerInspections.jsx` | `BuyerInspection` | `list` | 5000 |
| `src/pages/BuyerInspections.jsx` | `ExportContract` | `list` | 500 |
| `src/pages/BuyerInspections.jsx` | `OutputReport` | `list` | 500 |
| `src/pages/Dashboard.jsx` | `PurchaseRecord` | `list` | 500 |
| `src/pages/Dashboard.jsx` | `WarehouseReceipt` | `list` | 500 |
| `src/pages/Dashboard.jsx` | `ExportContract` | `list` | 500 |
| `src/pages/ExportContracts.jsx` | `ExportContract` | `list` | 5000 |
| `src/pages/ExportContracts.jsx` | `OutputReport` | `list` | 500 |
| `src/pages/NotificationHistory.jsx` | `Notification` | `list` | 1000 |
| `src/pages/NotificationHistory.jsx` | `Notification` | `filter` | 500 |
| `src/pages/OutputReportPage.jsx` | `OutputReport` | `list` | 5000 |
| `src/pages/OutputReportPage.jsx` | `ProcessingLog` | `list` | 2000 |
| `src/pages/ProcessingLogPage.jsx` | `ProcessingLog` | `list` | 5000 |
| `src/pages/ProcessingLogPage.jsx` | `WarehouseReceipt` | `list` | 500 |
| `src/pages/ProcessingLogPage.jsx` | `PurchaseRecord` | `list` | 500 |
| `src/pages/PurchaseOrdersReport.jsx` | `PurchaseRecord` | `list` | 2000 |
| `src/pages/PurchaseOrdersReport.jsx` | `WarehouseReceipt` | `list` | 2000 |
| `src/pages/PurchaseOrdersReport.jsx` | `ProcessingLog` | `list` | 2000 |
| `src/pages/PurchaseRegistration.jsx` | `PurchaseRecord` | `list` | 5000 |
| `src/pages/PurchaseRegistration.jsx` | `WarehouseReceipt` | `list` | 500 |
| `src/pages/Reports.jsx` | `PurchaseRecord` | `list` | 1000 |
| `src/pages/Reports.jsx` | `WarehouseReceipt` | `list` | 1000 |
| `src/pages/Reports.jsx` | `SampleLog` | `list` | 1000 |
| `src/pages/Reports.jsx` | `ProcessingLog` | `list` | 1000 |
| `src/pages/Reports.jsx` | `OutputReport` | `list` | 1000 |
| `src/pages/Reports.jsx` | `ExportContract` | `list` | 1000 |
| `src/pages/SampleLogPage.jsx` | `SampleLog` | `list` | 500 |
| `src/pages/SampleLogPage.jsx` | `WarehouseReceipt` | `list` | 500 |
| `src/pages/SampleLogPage.jsx` | `PurchaseRecord` | `list` | 500 |
| `src/pages/StockReport.jsx` | `PurchaseRecord` | `list` | 500 |
| `src/pages/StockReport.jsx` | `WarehouseReceipt` | `list` | 500 |
| `src/pages/StockReport.jsx` | `ProcessingLog` | `list` | 500 |
| `src/pages/StockReport.jsx` | `OutputReport` | `list` | 500 |
| `src/pages/UserActivityReport.jsx` | `ActivityLog` | `list` | 2000 |
| `src/pages/UserActivityReport.jsx` | `PurchaseRecord` | `list` | 1000 |
| `src/pages/UserActivityReport.jsx` | `WarehouseReceipt` | `list` | 1000 |
| `src/pages/UserActivityReport.jsx` | `ProcessingLog` | `list` | 1000 |
| `src/pages/UserActivityReport.jsx` | `OutputReport` | `list` | 1000 |
| `src/pages/WarehouseReceipt.jsx` | `WarehouseReceipt` | `list` | 5000 |
| `src/pages/WarehouseReceipt.jsx` | `PurchaseRecord` | `list` | 500 |
| `src/pages/WarehouseReceipt.jsx` | `Supplier` | `list` | 500 |
| `src/pages/WarehouseReceiptReport.jsx` | `WarehouseReceipt` | `filter` | 5000 |
| `src/pages/WarehouseReceiptReport.jsx` | `PurchaseRecord` | `filter` | 5000 |
| `src/pages/WarehouseReceiptReport.jsx` | `SampleLog` | `filter` | 5000 |
| `src/pages/WarehouseReceiptReport.jsx` | `ProcessingLog` | `filter` | 5000 |

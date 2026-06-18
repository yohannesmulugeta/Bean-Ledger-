# Base44 Export Inventory

Generated locally on 2026-06-18T10:25:27.217Z

Manual drop folder: `exports/base44/manual-drop`

Latest run folder: `exports\base44\runs\2026-06-18T10-25-26-425Z`

CSV parsing assumption: when CSV files are supplied, values are preserved as strings and no numeric conversion is performed during packaging.


| Entity | File | Format | Rows | Unique IDs | Duplicate IDs | Earliest Created | Latest Created | Archived | Missing IDs | Missing Required | Malformed JSON | Parents | Attachment Refs | Legacy Class | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ActivityLog | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | - | BLOCKED_MISSING_EXPORT |
| Attachment | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | polymorphic | 0 | - | BLOCKED_MISSING_EXPORT |
| BagReceipt | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | - | BLOCKED_MISSING_EXPORT |
| BuyerInspection | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | - | BLOCKED_MISSING_EXPORT |
| Export | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | LEGACY_REVIEW_REQUIRED: overlaps ExportContract | BLOCKED_MISSING_EXPORT |
| ExportContract | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | BuyerInspection | 0 | - | BLOCKED_MISSING_EXPORT |
| MaterialEntry | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | LEGACY_REVIEW_REQUIRED: overlaps MaterialRegisterEntry | BLOCKED_MISSING_EXPORT |
| MaterialRegisterEntry | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | - | BLOCKED_MISSING_EXPORT |
| Notification | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | - | BLOCKED_MISSING_EXPORT |
| NotificationSettings | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | - | BLOCKED_MISSING_EXPORT |
| OutputReport | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | ProcessingLog, BuyerInspection | 0 | - | BLOCKED_MISSING_EXPORT |
| ProcessingBatch | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | LEGACY_REVIEW_REQUIRED: overlaps ProcessingLog | BLOCKED_MISSING_EXPORT |
| ProcessingLog | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | WarehouseReceipt | 0 | - | BLOCKED_MISSING_EXPORT |
| Purchase | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | LEGACY_REVIEW_REQUIRED: overlaps PurchaseRecord | BLOCKED_MISSING_EXPORT |
| PurchaseRecord | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | - | BLOCKED_MISSING_EXPORT |
| RejectBagUsage | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | - | BLOCKED_MISSING_EXPORT |
| RolePermission | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | - | BLOCKED_MISSING_EXPORT |
| SampleLog | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | WarehouseReceipt, ExportContract, BuyerInspection | 0 | - | BLOCKED_MISSING_EXPORT |
| SecuritySetting | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | - | BLOCKED_MISSING_EXPORT |
| Supplier | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | - | BLOCKED_MISSING_EXPORT |
| SupplierBagPayment | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | - | BLOCKED_MISSING_EXPORT |
| SupplierBagReturn | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | - | BLOCKED_MISSING_EXPORT |
| SupplierBagSettlement | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | - | BLOCKED_MISSING_EXPORT |
| User | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | - | BLOCKED_MISSING_EXPORT |
| UserActivityLog | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | LEGACY_REVIEW_REQUIRED: overlaps ActivityLog | BLOCKED_MISSING_EXPORT |
| UserInvite | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | - | BLOCKED_MISSING_EXPORT |
| WarehouseInventory | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | - | 0 | LEGACY_REVIEW_REQUIRED: may conflict with calculated stock workflows | BLOCKED_MISSING_EXPORT |
| WarehouseReceipt | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | PurchaseRecord, PurchaseRecord | 0 | - | BLOCKED_MISSING_EXPORT |
| WarehouseReceiptHistory | - | - | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0 | WarehouseReceipt | 0 | - | BLOCKED_MISSING_EXPORT |

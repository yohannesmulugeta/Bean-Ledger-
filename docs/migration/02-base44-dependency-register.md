# Base44 Dependency Register

Generated from source scan on 2026-06-18. Replacement recommendations assume Supabase Auth, Postgres tables, Storage, and Edge Functions.

| File path | Imported Base44 API | Entity/function used | Read operation | Write operation | Upload operation | Authentication operation | Recommended Supabase replacement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `src/api/base44Client.js` | `@base44/sdk` | Base44 config/runtime | - | - | no | - | Remove Base44 dependency or replace with app config |
| `src/components/AuthLayout.jsx` | Base44 client/function SDK | Base44 config/runtime | - | - | no | - | Remove Base44 dependency or replace with app config |
| `src/components/UserNotRegisteredError.jsx` | `@/api/base44Client` | Base44 config/runtime | - | - | no | logout | Supabase Auth service wrapper |
| `src/components/admin/DownloadBackupButton.jsx` | `@/api/base44Client` | entity:Supplier, entity:PurchaseRecord, entity:WarehouseReceipt, entity:SampleLog, entity:ProcessingLog, entity:OutputReport, entity:ExportContract, entity:BuyerInspection, entity:BagReceipt, entity:RejectBagUsage, entity:SupplierBagReturn, entity:SupplierBagPayment, entity:SupplierBagSettlement, entity:MaterialRegisterEntry, entity:ActivityLog, entity:WarehouseReceiptHistory, entity:Notification, entity:RolePermission, entity:Attachment | list | - | no | - | Supabase table service wrapper with RLS |
| `src/components/attachments/ExportDocsPanel.jsx` | `@/api/base44Client` | entity:Attachment | filter | create, delete | yes | me | Supabase Storage plus attachments table |
| `src/components/attachments/FileAttachments.jsx` | `@/api/base44Client` | Base44 config/runtime | - | - | yes | me | Supabase Storage plus attachments table |
| `src/components/attachments/PurchaseAttachmentsPanel.jsx` | `@/api/base44Client` | entity:Attachment | filter | create, delete | no | - | Supabase table service wrapper with RLS |
| `src/components/attachments/WarehouseAttachmentsPanel.jsx` | `@/api/base44Client` | entity:Attachment | filter | create, delete | no | - | Supabase table service wrapper with RLS |
| `src/components/bagledger/BagReceiptsSection.jsx` | `@/api/base44Client` | entity:Supplier, entity:BagReceipt | list | create, update | no | - | Supabase table service wrapper with RLS |
| `src/components/bagledger/RejectBagUsageSection.jsx` | `@/api/base44Client` | entity:Supplier, entity:RejectBagUsage | list | create, update, delete | no | - | Supabase table service wrapper with RLS |
| `src/components/bagledger/SupplierBagSummary.jsx` | `@/api/base44Client` | entity:BagReceipt, entity:RejectBagUsage, entity:SupplierBagPayment, entity:SupplierBagReturn, entity:Supplier | list | - | no | - | Supabase table service wrapper with RLS |
| `src/components/bagledger/SupplierDetailPanel.jsx` | `@/api/base44Client` | entity:SupplierBagReturn, entity:SupplierBagPayment | - | update, create, delete | no | - | Supabase table service wrapper with RLS |
| `src/components/dashboard/RecentActivity.jsx` | `@/api/base44Client` | entity:ActivityLog | list | - | no | - | Supabase table service wrapper with RLS |
| `src/components/dashboard/SupplierBalancesTable.jsx` | `@/api/base44Client` | entity:PurchaseRecord, entity:WarehouseReceipt, entity:SampleLog, entity:ProcessingLog | list | - | no | - | Supabase table service wrapper with RLS |
| `src/components/layout/Sidebar.jsx` | Base44 client/function SDK | Base44 config/runtime | - | - | no | - | Remove Base44 dependency or replace with app config |
| `src/components/materials/ExportMaterialsTab.jsx` | `@/api/base44Client` | entity:MaterialRegisterEntry | list | create, update, delete | no | - | Supabase table service wrapper with RLS |
| `src/components/materials/GeneralPurchaseTab.jsx` | `@/api/base44Client` | entity:MaterialRegisterEntry | list | create, update, delete | no | - | Supabase table service wrapper with RLS |
| `src/components/purchases/DuplicateReport.jsx` | `@/api/base44Client` | entity:PurchaseRecord | list | - | no | - | Supabase table service wrapper with RLS |
| `src/components/shared/ArchivedRecordsSection.jsx` | `@/api/base44Client` | entity:entityName, entity:ActivityLog | filter | - | no | - | Supabase table service wrapper with RLS |
| `src/components/warehouse/ReceiptInlineHistory.jsx` | `@/api/base44Client` | entity:WarehouseReceiptHistory | filter | - | no | - | Supabase table service wrapper with RLS |
| `src/components/warehouse/WarehouseHistoryTab.jsx` | `@/api/base44Client` | entity:WarehouseReceiptHistory | list | - | no | - | Supabase table service wrapper with RLS |
| `src/hooks/useNotifications.js` | `@/api/base44Client` | entity:Notification, entity:User | filter, list | update | no | - | Supabase table service wrapper with RLS |
| `src/hooks/useOfflineSync.js` | `@/api/base44Client` | entity:action.entity_name | list | - | no | - | Supabase table service wrapper with RLS |
| `src/lib/AuthContext.jsx` | `@base44/sdk`, `@/api/base44Client` | Base44 config/runtime | - | - | no | me, logout, redirectToLogin | Supabase Auth service wrapper |
| `src/lib/PageNotFound.jsx` | `@/api/base44Client` | Base44 config/runtime | - | - | no | me | Supabase Auth service wrapper |
| `src/lib/activityLogger.js` | `@/api/base44Client` | entity:ActivityLog | - | create | no | me | Supabase Auth service wrapper |
| `src/lib/app-params.js` | Base44 client/function SDK | Base44 config/runtime | - | - | no | - | Remove Base44 dependency or replace with app config |
| `src/lib/archiveService.js` | `@/api/base44Client` | entity:entityName, entity:BagReceipt, entity:WarehouseReceipt, entity:ProcessingLog, entity:SampleLog, entity:PurchaseRecord, function:recalcPurchaseFromReceipt | filter | update | no | me | Supabase Auth service wrapper |
| `src/lib/notificationService.js` | `@/api/base44Client` | entity:User, entity:Notification, function:sendTelegramMessage | list, filter | create | no | - | Supabase table service wrapper with RLS |
| `src/lib/role-hooks.js` | `@/api/base44Client` | entity:RolePermission, entity:SecuritySetting | list | - | no | - | Supabase table service wrapper with RLS |
| `src/lib/warehouseHistoryService.js` | `@/api/base44Client` | entity:WarehouseReceiptHistory | - | create | no | me | Supabase Auth service wrapper |
| `src/pages/ActivityLog.jsx` | `@/api/base44Client` | entity:ActivityLog | list | - | no | - | Supabase table service wrapper with RLS |
| `src/pages/BuyerInspections.jsx` | `@/api/base44Client` | entity:BuyerInspection, entity:Supplier, entity:ExportContract, entity:OutputReport, entity:SampleLog, entity:ProcessingLog | list | create, update, delete | no | - | Supabase table service wrapper with RLS |
| `src/pages/Dashboard.jsx` | `@/api/base44Client` | entity:PurchaseRecord, entity:WarehouseReceipt, entity:SampleLog, entity:ProcessingLog, entity:OutputReport, entity:Supplier, entity:ExportContract, entity:BuyerInspection | list | - | no | - | Supabase table service wrapper with RLS |
| `src/pages/DataAudit.jsx` | `@/api/base44Client` | entity:Supplier, entity:PurchaseRecord, entity:WarehouseReceipt, entity:SampleLog, entity:ProcessingLog, entity:OutputReport, entity:ExportContract, entity:BuyerInspection, entity:BagReceipt, entity:RejectBagUsage, entity:SupplierBagPayment, entity:SupplierBagReturn, entity:MaterialRegisterEntry | list | - | no | - | Supabase table service wrapper with RLS |
| `src/pages/ExportContracts.jsx` | `@/api/base44Client` | entity:ExportContract, entity:OutputReport, entity:Supplier, entity:BuyerInspection, entity:SampleLog | list | create, update, delete | no | - | Supabase table service wrapper with RLS |
| `src/pages/Exports.jsx` | `@/api/base44Client` | entity:Export | list | create, update, delete | no | - | Supabase table service wrapper with RLS |
| `src/pages/ForgotPassword.jsx` | `@/api/base44Client` | Base44 config/runtime | - | - | no | resetPasswordRequest | Supabase Auth service wrapper |
| `src/pages/Login.jsx` | `@/api/base44Client` | Base44 config/runtime | - | - | no | loginViaEmailPassword | Supabase Auth service wrapper |
| `src/pages/MasterData.jsx` | `@/api/base44Client` | entity:Supplier | list | create, update, delete | no | - | Supabase table service wrapper with RLS |
| `src/pages/NotificationHistory.jsx` | `@/api/base44Client` | entity:Notification | list, filter | update | no | - | Supabase table service wrapper with RLS |
| `src/pages/NotificationSettings.jsx` | `@/api/base44Client` | entity:NotificationSettings | filter | update, create | no | - | Supabase table service wrapper with RLS |
| `src/pages/OutputReportPage.jsx` | `@/api/base44Client` | entity:OutputReport, entity:Supplier, entity:ProcessingLog, entity:BuyerInspection, entity:ExportContract, entity:SampleLog | list | create, update | no | - | Supabase table service wrapper with RLS |
| `src/pages/Permissions.jsx` | `@/api/base44Client` | entity:RolePermission | list | update, create | no | - | Supabase table service wrapper with RLS |
| `src/pages/Processing.jsx` | `@/api/base44Client` | entity:ProcessingBatch | list | create, update, delete | no | - | Supabase table service wrapper with RLS |
| `src/pages/ProcessingLogPage.jsx` | `@/api/base44Client` | entity:ProcessingLog, entity:Supplier, entity:WarehouseReceipt, entity:SampleLog, entity:BuyerInspection, entity:PurchaseRecord | list | create, update | no | - | Supabase table service wrapper with RLS |
| `src/pages/PurchaseOrdersReport.jsx` | `@/api/base44Client` | entity:PurchaseRecord, entity:WarehouseReceipt, entity:Supplier, entity:ProcessingLog | list | - | no | - | Supabase table service wrapper with RLS |
| `src/pages/PurchaseRegistration.jsx` | `@/api/base44Client` | entity:PurchaseRecord, entity:Supplier, entity:WarehouseReceipt, entity:Attachment | list, filter | create, update | no | - | Supabase table service wrapper with RLS |
| `src/pages/Purchases.jsx` | `@/api/base44Client` | entity:Purchase | list | create, update, delete | no | - | Supabase table service wrapper with RLS |
| `src/pages/Register.jsx` | `@/api/base44Client` | Base44 config/runtime | - | - | no | register | Supabase Auth service wrapper |
| `src/pages/Reports.jsx` | `@/api/base44Client` | entity:PurchaseRecord, entity:WarehouseReceipt, entity:SampleLog, entity:ProcessingLog, entity:OutputReport, entity:Supplier, entity:ExportContract | list | - | no | - | Supabase table service wrapper with RLS |
| `src/pages/ResetPassword.jsx` | `@/api/base44Client` | Base44 config/runtime | - | - | no | resetPassword | Supabase Auth service wrapper |
| `src/pages/SampleLogPage.jsx` | `@/api/base44Client` | entity:SampleLog, entity:Supplier, entity:WarehouseReceipt, entity:ProcessingLog, entity:OutputReport, entity:PurchaseRecord, entity:ExportContract, entity:BuyerInspection | list | create, update | no | - | Supabase table service wrapper with RLS |
| `src/pages/StockReport.jsx` | `@/api/base44Client` | entity:PurchaseRecord, entity:WarehouseReceipt, entity:SampleLog, entity:ProcessingLog, entity:OutputReport, entity:Supplier, entity:ExportContract, entity:BuyerInspection | list | - | no | - | Supabase table service wrapper with RLS |
| `src/pages/UserActivityReport.jsx` | `@/api/base44Client` | entity:ActivityLog, entity:PurchaseRecord, entity:WarehouseReceipt, entity:ProcessingLog, entity:OutputReport, entity:User | list | - | no | - | Supabase table service wrapper with RLS |
| `src/pages/UsersManagement.jsx` | `@/api/base44Client` | entity:User, entity:UserInvite, entity:RolePermission, entity:UserActivityLog, entity:ActivityLog, entity:SecuritySetting | list | update, create | no | - | Supabase table service wrapper with RLS |
| `src/pages/WarehousePage.jsx` | `@/api/base44Client` | entity:WarehouseInventory | list | create, update, delete | no | - | Supabase table service wrapper with RLS |
| `src/pages/WarehouseReceipt.jsx` | `@/api/base44Client` | entity:WarehouseReceipt, entity:Attachment, entity:PurchaseRecord, entity:Supplier, entity:SampleLog, entity:ProcessingLog, entity:BagReceipt | list, filter | update, create, delete | no | - | Supabase table service wrapper with RLS |
| `src/pages/WarehouseReceiptReport.jsx` | `@/api/base44Client` | entity:WarehouseReceipt, entity:PurchaseRecord, entity:SampleLog, entity:ProcessingLog, entity:Supplier | filter, list | - | no | - | Supabase table service wrapper with RLS |
| `base44/functions/backfillGrandTotals/entry.ts` | `@base44/sdk` | Base44 config/runtime | - | - | no | me | Supabase Edge Function using service role server-side only |
| `base44/functions/backupDaily/entry.ts` | `@base44/sdk` | Base44 config/runtime | - | - | no | - | Supabase Edge Function using service role server-side only |
| `base44/functions/backupMonthly/entry.ts` | `@base44/sdk` | Base44 config/runtime | - | - | no | - | Supabase Edge Function using service role server-side only |
| `base44/functions/backupWeekly/entry.ts` | `@base44/sdk` | Base44 config/runtime | - | - | no | - | Supabase Edge Function using service role server-side only |
| `base44/functions/createDemoUser/entry.ts` | `@base44/sdk` | Base44 config/runtime | - | - | no | me, inviteUser | Supabase Edge Function using service role server-side only |
| `base44/functions/migrateProcessingLogs/entry.ts` | `@base44/sdk` | Base44 config/runtime | - | - | no | me | Supabase Edge Function using service role server-side only |
| `base44/functions/recalcPurchaseFromReceipt/entry.ts` | `@base44/sdk` | Base44 config/runtime | - | - | no | - | Supabase Edge Function using service role server-side only |
| `base44/functions/sendTelegramMessage/entry.ts` | Base44 client/function SDK | function:sendTelegramMessage | - | - | no | - | Supabase Edge Function using service role server-side only |
| `base44/functions/telegramOnExportContract/entry.ts` | `@base44/sdk` | Base44 config/runtime | - | - | no | - | Supabase Edge Function using service role server-side only |
| `base44/functions/telegramOnOutputReport/entry.ts` | `@base44/sdk` | Base44 config/runtime | - | - | no | - | Supabase Edge Function using service role server-side only |
| `base44/functions/telegramOnProcessing/entry.ts` | `@base44/sdk` | Base44 config/runtime | - | - | no | - | Supabase Edge Function using service role server-side only |
| `base44/functions/telegramOnPurchase/entry.ts` | `@base44/sdk` | Base44 config/runtime | - | - | no | - | Supabase Edge Function using service role server-side only |
| `base44/functions/telegramOnWarehouseReceipt/entry.ts` | `@base44/sdk` | Base44 config/runtime | - | - | no | - | Supabase Edge Function using service role server-side only |
| `base44/functions/telegramWeeklySummary/entry.ts` | `@base44/sdk` | Base44 config/runtime | - | - | no | - | Supabase Edge Function using service role server-side only |
| `base44/functions/weeklyPaymentSummary/entry.ts` | `@base44/sdk` | Base44 config/runtime | - | - | no | - | Supabase Edge Function using service role server-side only |
| `vite.config.js` | `@base44/sdk`, `@base44/vite-plugin` | Base44 config/runtime | - | - | no | - | Remove Base44 dependency or replace with app config |
| `package.json` | `@base44/sdk`, `@base44/vite-plugin` | Base44 config/runtime | - | - | no | - | Remove Base44 dependency or replace with app config |

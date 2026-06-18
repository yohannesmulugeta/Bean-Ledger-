# Current System Audit

Generated from the Base44 source in this repository on 2026-06-18. This is a migration foundation document only; it does not change runtime behavior.

## Pages and routes

| Route | Current component/guard |
| --- | --- |
| `/login` | Navigate to="/" replace / |
| `/register` | Navigate to="/" replace / |
| `/signup` | Navigate to="/" replace / |
| `/forgot-password` | Navigate to="/" replace / |
| `/reset-password` | Navigate to="/" replace / |
| `/` | ModuleRouteGuard path="/"Dashboard //ModuleRouteGuard |
| `/purchases` | ModuleRouteGuard path="/purchases"Purchases //ModuleRouteGuard |
| `/warehouse` | ModuleRouteGuard path="/warehouse"WarehousePage //ModuleRouteGuard |
| `/processing` | ModuleRouteGuard path="/processing"Processing //ModuleRouteGuard |
| `/exports` | ModuleRouteGuard path="/exports"Exports //ModuleRouteGuard |
| `/master-data` | ModuleRouteGuard path="/master-data"MasterData //ModuleRouteGuard |
| `/purchase-registration` | ModuleRouteGuard path="/purchase-registration"PurchaseRegistration //ModuleRouteGuard |
| `/warehouse-receipt` | ModuleRouteGuard path="/warehouse-receipt"WarehouseReceiptPage //ModuleRouteGuard |
| `/sample-log` | ModuleRouteGuard path="/sample-log"SampleLogPage //ModuleRouteGuard |
| `/processing-log` | ModuleRouteGuard path="/processing-log"ProcessingLogPage //ModuleRouteGuard |
| `/output-report` | ModuleRouteGuard path="/output-report"OutputReportPage //ModuleRouteGuard |
| `/reports` | ModuleRouteGuard path="/reports"Reports //ModuleRouteGuard |
| `/buyer-inspections` | ModuleRouteGuard path="/buyer-inspections"BuyerInspections //ModuleRouteGuard |
| `/export-contracts` | ModuleRouteGuard path="/export-contracts"ExportContracts //ModuleRouteGuard |
| `/materials-register` | ModuleRouteGuard path="/materials-register"MaterialsRegister //ModuleRouteGuard |
| `/bag-ledger` | ModuleRouteGuard path="/bag-ledger"BagLedger //ModuleRouteGuard |
| `/stock-report` | ModuleRouteGuard path="/stock-report"StockReport //ModuleRouteGuard |
| `/notification-settings` | NotificationSettings / |
| `/activity-log` | ModuleRouteGuard path="/activity-log"ActivityLog //ModuleRouteGuard |
| `/notification-history` | NotificationHistory / |
| `/permissions` | ModuleRouteGuard path="/permissions"Permissions //ModuleRouteGuard |
| `/user-report` | ModuleRouteGuard path="/user-report"UserActivityReport //ModuleRouteGuard |
| `/purchase-orders-report` | ModuleRouteGuard path="/purchase-orders-report"PurchaseOrdersReport //ModuleRouteGuard |
| `/warehouse-receipt-report` | ModuleRouteGuard path="/warehouse-receipt-report"WarehouseReceiptReport //ModuleRouteGuard |
| `/users-management` | ModuleRouteGuard path="/users-management"UsersManagement //ModuleRouteGuard |
| `/data-audit` | ModuleRouteGuard path="/data-audit"DataAudit //ModuleRouteGuard |
| `*` | PageNotFound / |

Auth pages `/login`, `/register`, `/signup`, `/forgot-password`, and `/reset-password` currently redirect to `/` in `src/App.jsx`, even though page components exist. Legacy summary pages remain routed: `/purchases`, `/warehouse`, and `/processing`.

## Base44 entities and fields

### ActivityLog
Source: `base44/entities/ActivityLog.jsonc`
Required: `user_email`, `action_type`, `screen_name`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `user_email` | string | yes |  | Email of the user who performed the action |
| `action_type` | string | yes | Created, Edited, Archived, Restored | Type of action performed |
| `screen_name` | string | yes |  | Screen / module where the action happened (e.g. 'Purchase Registration') |
| `entity_type` | string | no |  | Entity type acted on (e.g. 'PurchaseRecord') |
| `entity_id` | string | no |  | ID of the affected record |
| `record_description` | string | no |  | Human-readable description of the record (e.g. 'Purchase KKGT/Wollega/001/2026 - Supplier ABC') |
| `changes` | string | no |  | JSON array of edited fields: [{field, old_value, new_value}] |
| `reason` | string | no |  | Optional reason (e.g. archive_reason) |

### Attachment
Source: `base44/entities/Attachment.jsonc`
Required: `entity_type`, `entity_id`, `section`, `file_url`, `file_name`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `entity_type` | string | yes |  | Parent entity type: purchase_record \| warehouse_receipt \| export_contract |
| `entity_id` | string | yes |  | ID of the parent record |
| `section` | string | yes |  | Subsection label, e.g. contract_document \| payment_voucher \| grn_certificate \| dispatch_note \| weighbridge_ticket \| export_doc |
| `section_ref` | string | no |  | Optional reference e.g. CPV reference number or document name |
| `file_url` | string | yes |  | URL of the uploaded PDF |
| `file_name` | string | yes |  | Original file name |
| `uploaded_by` | string | no |  | User who uploaded |

### BagReceipt
Source: `base44/entities/BagReceipt.jsonc`
Required: `bags_received`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `receipt_mode` | string | no | agent, supplier | How this receipt was added. agent = tracked at agent level. supplier = tracked at individual supplier level. Immutable after save. |
| `agent_name` | string | no |  | Agent name (required when receipt_mode=agent; reference when receipt_mode=supplier) |
| `warehouse_receipt_id` | string | no |  | Linked WarehouseReceipt id (when source=warehouse) |
| `supplier_name` | string | no |  | Supplier name (required when receipt_mode=supplier; null when receipt_mode=agent) |
| `date` | string | no | date | Date of bag receipt |
| `warehouse_received_kg` | number | no |  | Warehouse received net KG (optional for manual entries) |
| `bags_received` | number | yes |  | Physical bag count |
| `source` | string | no | warehouse, manual | warehouse = auto-created from Warehouse Receipt; manual = manually added |
| `note` | string | no |  |  |
| `archived` | boolean | no |  | Soft-delete flag. |
| `archived_by` | string | no |  |  |
| `archived_at` | string | no |  |  |
| `archive_reason` | string | no |  |  |

### BuyerInspection
Source: `base44/entities/BuyerInspection.jsonc`
Required: `inspection_date`, `buyer_name`, `coffee_type`, `kg_to_inspect`, `sample_kg_taken`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `inspection_date` | string | yes | date | Date the inspection was conducted |
| `buyer_name` | string | yes |  | Buyer who sent the inspector |
| `coffee_type` | string | yes |  | Coffee type being inspected |
| `kg_to_inspect` | number | yes |  | Quantity of coffee being checked |
| `sample_kg_taken` | number | yes |  | Small sample KG taken by inspector to their lab — deducted from total coffee type stock |
| `result` | string | no | Pending, Passed, Failed | Outcome of the inspection |
| `kg_approved` | number | no |  | KG approved for export (when Passed) |
| `linked_contract_id` | string | no |  | Linked export contract id (when Passed and contract chosen) |
| `linked_contract_no` | string | no |  | Linked contract number for display |
| `rejection_reason` | string | no | Too Much Moisture, Grade Too Low, Defects, Smell/Taste Issue, Other | Reason for failure |
| `kg_rejected` | number | no |  | KG rejected (when Failed) |
| `action_taken` | string | no | Reprocess, Sell Locally, Hold in Warehouse | Action chosen for rejected coffee |
| `notes` | string | no |  |  |

### Export
Source: `base44/entities/Export.jsonc`
Required: `contract_number`, `buyer_name`, `buyer_country`, `coffee_type`, `quantity_kg`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `contract_number` | string | yes |  | Export contract number |
| `buyer_name` | string | yes |  | Name of the buyer/importer |
| `buyer_country` | string | yes |  | Destination country |
| `coffee_type` | string | yes | Arabica, Robusta, Mixed |  |
| `grade` | string | no | Grade 1, Grade 2, Grade 3, Grade 4, Grade 5 |  |
| `quantity_kg` | number | yes |  | Export quantity in kg |
| `price_per_kg_usd` | number | no |  | Price per kg in USD |
| `total_value_usd` | number | no |  | Total export value in USD |
| `shipment_date` | string | no | date |  |
| `status` | string | no | Contract Signed, Preparing, In Transit, Delivered, Completed |  |
| `shipping_method` | string | no | Sea Freight, Air Freight, Land Transport |  |
| `batch_numbers` | string | no |  | Comma-separated batch numbers included |
| `notes` | string | no |  |  |

### ExportContract
Source: `base44/entities/ExportContract.jsonc`
Required: `contract_no`, `destination_country`, `contract_date`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `stock_pool` | string | no | Fresh, Recleaned | Which stock pool this contract draws from. |
| `contract_no` | string | yes |  | Auto-generated: KKGT/EXP/001/2026 |
| `contract_pi_number` | string | no |  | Contract PI Number — optional, manually entered |
| `certificate_no` | string | no |  | Certificate number — e.g. ICO-2026-001 |
| `contract_date` | string | yes | date |  |
| `coffee_type` | string | no |  |  |
| `coffee_grade` | string | no |  |  |
| `destination_country` | string | yes |  |  |
| `buyer_name` | string | no |  |  |
| `payment_terms` | string | no | Letter of Credit (LC), Cash Against Documents (CAD), Advance Payment, Open Account, Other |  |
| `custom_payment_terms` | string | no |  | Free-text payment terms when payment_terms = Other |
| `expected_payment_date` | string | no | date |  |
| `export_kg` | number | no |  |  |
| `export_sample_kg` | number | no |  | KG taken as export sample — deducted from export_kg to get actual_shipped_kg |
| `actual_shipped_kg` | number | no |  | export_kg - export_sample_kg |
| `export_bags` | number | no |  |  |
| `pricing_method` | string | no | per_lb, per_kg | per_lb = price in USD per pound. per_kg = price in USD per kilogram. |
| `price_per_lb_usd` | number | no |  | Price per pound in USD (used when pricing_method = per_lb) |
| `price_per_kg_usd` | number | no |  | Price per kilogram in USD (used when pricing_method = per_kg) |
| `total_lb` | number | no |  | Total pounds = actual_shipped_kg × 2.2046 (per_lb contracts) |
| `contract_rate_etb` | number | no |  | USD/ETB rate. Optional — can be added later via 'Add Rate' button. |
| `rate_status` | string | no | Rate Pending, Rate Confirmed |  |
| `rate_confirmed_date` | string | no | date |  |
| `total_export_value_usd` | number | no |  |  |
| `total_export_value_etb` | number | no |  |  |
| `cost_rows` | string | no |  | JSON array: [{name, amount_etb}] |
| `material_rows` | string | no |  | JSON array: [{name, quantity, unit_cost_etb}] |
| `total_materials_etb` | number | no |  |  |
| `total_costs_etb` | number | no |  |  |
| `reject_sales_etb` | number | no |  |  |
| `grand_total_revenue_etb` | number | no |  |  |
| `profit_etb` | number | no |  |  |
| `profit_usd` | number | no |  |  |
| `profit_margin_pct` | number | no |  |  |
| `payment_history` | string | no |  |  |
| `total_received_usd` | number | no |  |  |
| `total_received_etb` | number | no |  |  |
| `payment_status` | string | no | Unpaid, Partial, Fully Received |  |
| `remark` | string | no |  |  |
| `status` | string | no | Pending, In Progress, Shipped, Completed |  |
| `commodity` | string | no |  |  |
| `export_date` | string | no | date |  |
| `total_export_value_usd_legacy` | number | no |  |  |
| `usd_rate_etb` | number | no |  |  |
| `arrival_inputs` | string | no |  |  |
| `purchase_cost_etb` | number | no |  |  |
| `commission_on_purchase_etb` | number | no |  |  |
| `cleaning_charges_etb` | number | no |  |  |
| `recleaning_charges_etb` | number | no |  |  |
| `packing_bag_green_pro_etb` | number | no |  |  |
| `bag_mark_craft_etb` | number | no |  |  |
| `bag_printing_etb` | number | no |  |  |
| `loading_unloading_etb` | number | no |  |  |
| `warehouse_expenses_etb` | number | no |  |  |
| `local_transportation_etb` | number | no |  |  |
| `edr_clearance_train_fee_etb` | number | no |  |  |
| `demurrage_etb` | number | no |  |  |
| `freight_etb` | number | no |  |  |
| `commission_on_sales_etb` | number | no |  |  |
| `bl_container_fee_etb` | number | no |  |  |
| `fumigation_etb` | number | no |  |  |
| `coo_etb` | number | no |  |  |
| `container_picking_etb` | number | no |  |  |
| `ico_etb` | number | no |  |  |
| `private_co_weight_quality_etb` | number | no |  |  |
| `coffee_association_etb` | number | no |  |  |
| `plomp_payment_etb` | number | no |  |  |
| `other_costs_etb` | number | no |  |  |
| `total_reject_sales_etb` | number | no |  |  |
| `total_expenses_etb` | number | no |  |  |
| `export_total_sales_price_etb` | number | no |  |  |
| `grand_total_sales_etb` | number | no |  |  |
| `total_profit_etb` | number | no |  |  |
| `profit_usd_legacy` | number | no |  |  |

### MaterialEntry
Source: `base44/entities/MaterialEntry.jsonc`
Required: `entry_date`, `item_name`, `quantity`, `unit_cost_etb`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `entry_date` | string | yes | date | Date of the material entry |
| `item_name` | string | yes |  | Name of the material item, e.g. Jute Bags, GrainPro, Craft Paper |
| `quantity` | number | yes |  | Quantity purchased |
| `unit_cost_etb` | number | yes |  | Unit cost in ETB |
| `total_cost_etb` | number | no |  | Auto-calculated: quantity * unit_cost_etb |
| `purpose` | string | no |  | Optional purpose of purchase |
| `note` | string | no |  | Optional free-text note |

### MaterialRegisterEntry
Source: `base44/entities/MaterialRegisterEntry.jsonc`
Required: `date`, `quantity`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `category` | string | no | export, general | Which tab this entry belongs to: export = Export Materials, general = General Purchase |
| `date` | string | yes | date | Date of the material entry |
| `item_type` | string | no | Bag, Craft, Plaster, Green Pro | Export item type (only for category=export) |
| `bag_size` | string | no | 30kg, 50kg, 60kg | Bag size variant (only when item_type=Bag) |
| `entry_type` | string | no | Purchase, Usage | Stock IN (Purchase) or OUT (Usage) - only for category=export |
| `item_name` | string | no |  | Item name (used for category=general) |
| `quantity` | number | yes |  | Quantity purchased or used |
| `unit_cost_etb` | number | no |  | Unit cost in ETB (required for Purchase entries) |
| `total_cost_etb` | number | no |  | Total cost = quantity × unit_cost_etb |
| `purpose` | string | no |  | Optional purpose |
| `note` | string | no |  | Optional note |

### Notification
Source: `base44/entities/Notification.jsonc`
Required: `recipient_email`, `type`, `title`, `message`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `recipient_email` | string | yes |  | Email of the user who should receive this notification |
| `recipient_role` | string | no |  | Role this notification targets (for role-based filtering) |
| `type` | string | yes |  | Notification type key e.g. new_purchase, payment_recorded, warehouse_confirmed, low_stock, etc. |
| `title` | string | yes |  | Short title shown in bell dropdown |
| `message` | string | yes |  | Full notification message |
| `link_path` | string | no |  | App path to navigate to e.g. /purchase-registration |
| `link_label` | string | no |  | Label for the link e.g. View Purchase |
| `is_read` | boolean | no |  |  |
| `severity` | string | no | info, warning, critical |  |
| `entity_type` | string | no |  | Related entity type |
| `entity_id` | string | no |  | Related entity id |

### NotificationSettings
Source: `base44/entities/NotificationSettings.jsonc`
Required: `user_email`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `user_email` | string | yes |  | Email of the user these settings belong to |
| `disabled_types` | string | no |  | JSON array of notification type keys the user has disabled |

### OutputReport
Source: `base44/entities/OutputReport.jsonc`
Required: `start_date`, `end_date`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `entry_type` | string | no | Standard, Recleaned | Standard = Pool 1 fresh stock. Recleaned = Pool 2, came from a recleaning processing entry. |
| `inspection_ref` | string | no |  | Linked Buyer Inspection id (Recleaned only) |
| `buyer_name` | string | no |  | Buyer reference (Recleaned only) |
| `rejection_reason` | string | no |  | Original rejection reason (Recleaned only) |
| `date` | string | no | date | Legacy single date field — kept for backward compat. Use start_date/end_date instead. |
| `start_date` | string | yes | date | Processing start date (required) |
| `end_date` | string | yes | date | Processing end date (required) |
| `supplier_name` | string | no |  | Supplier whose coffee is being processed |
| `coffee_type` | string | no |  | Coffee type (auto-filled from supplier) |
| `total_kg_processed` | number | no |  | Auto-summed from ProcessingLog for that date |
| `additional_pool1_kg` | number | no |  | Additional KG drawn from Pool 1 (Fresh Stock) to supplement a Recleaning entry. Only set on Recleaned entries. |
| `export_bags` | number | no |  |  |
| `export_kg` | number | no |  | export_bags × 60 |
| `reject_bags` | number | no |  |  |
| `reject_kg` | number | no |  | reject_bags × 85 |
| `waste_kg` | number | no |  | total_kg_processed - export_kg - reject_kg |
| `reject_pct` | number | no |  | reject_kg / total_kg_processed * 100 |
| `waste_pct` | number | no |  | waste_kg / total_kg_processed * 100 |
| `registrar_name` | string | no |  |  |
| `remark` | string | no |  |  |
| `export_status` | string | no | Available for Export, Exported | Whether this output has been linked to an export contract |
| `archived` | boolean | no |  | Soft-delete flag. When true, hidden from all normal views. |
| `archived_by` | string | no |  | Email of user who archived the record |
| `archived_at` | string | no |  | ISO date-time when archived |
| `archive_reason` | string | no |  | Optional reason provided when archiving |

### ProcessingBatch
Source: `base44/entities/ProcessingBatch.jsonc`
Required: `batch_number`, `lot_number`, `coffee_type`, `process_type`, `input_quantity_kg`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `batch_number` | string | yes |  | Unique batch identifier |
| `lot_number` | string | yes |  | Source lot from warehouse |
| `coffee_type` | string | yes | Arabica, Robusta, Mixed |  |
| `process_type` | string | yes | Washed, Natural, Honey, Semi-Washed | Processing method |
| `input_quantity_kg` | number | yes |  | Input quantity in kg |
| `output_quantity_kg` | number | no |  | Output quantity after processing in kg |
| `status` | string | no | Pending, Washing, Drying, Hulling, Grading, Completed |  |
| `start_date` | string | no | date |  |
| `end_date` | string | no | date |  |
| `output_grade` | string | no | Grade 1, Grade 2, Grade 3, Grade 4, Grade 5 |  |
| `notes` | string | no |  |  |

### ProcessingLog
Source: `base44/entities/ProcessingLog.jsonc`
Required: `date`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `entry_type` | string | no | Standard, Recleaning | Standard = fresh warehouse stock. Recleaning = reprocessing rejected coffee. |
| `entry_mode` | string | no | By Bags, By KG | How quantity was entered. By Bags = user enters bags, KG inferred as bags×85. By KG = user enters KG directly with no rounding. |
| `buyer_name` | string | no |  |  |
| `inspection_ref` | string | no |  |  |
| `date` | string | yes | date |  |
| `supplier_name` | string | no |  |  |
| `coffee_type` | string | no |  |  |
| `coffee_code` | string | no |  | Linked PurchaseRecord coffee_code (used by archive cascade) |
| `bags_sent` | number | no |  |  |
| `kg_sent` | number | no |  |  |
| `actual_weighed_kg` | number | no |  |  |
| `batch_variance_kg` | number | no |  |  |
| `batch_no` | string | no |  |  |
| `remark` | string | no |  |  |
| `archived` | boolean | no |  | Soft-delete flag. When true, hidden from all normal views. |
| `archived_by` | string | no |  | Email of user who archived the record |
| `archived_at` | string | no |  | ISO date-time when archived |
| `archive_reason` | string | no |  | Optional reason provided when archiving |

### Purchase
Source: `base44/entities/Purchase.jsonc`
Required: `supplier_name`, `coffee_type`, `quantity_kg`, `price_per_kg`, `purchase_date`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `supplier_name` | string | yes |  | Name of the farmer or supplier |
| `supplier_location` | string | no |  | Location/region of the supplier |
| `coffee_type` | string | yes | Arabica, Robusta, Mixed | Type of coffee purchased |
| `grade` | string | no | Grade 1, Grade 2, Grade 3, Grade 4, Grade 5, Ungraded | Quality grade of the coffee |
| `quantity_kg` | number | yes |  | Quantity purchased in kilograms |
| `price_per_kg` | number | yes |  | Price per kilogram in ETB |
| `total_cost` | number | no |  | Total purchase cost in ETB |
| `purchase_date` | string | yes | date | Date of purchase |
| `payment_status` | string | no | Pending, Partial, Paid |  |
| `notes` | string | no |  | Additional notes |

### PurchaseRecord
Source: `base44/entities/PurchaseRecord.jsonc`
Required: `supplier_name`, `purchase_date`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `coffee_code` | string | no |  | Auto-generated coffee code e.g. KKGT/Region/001/2026 |
| `purchase_date` | string | yes | date | Date of purchase |
| `supplier_name` | string | yes |  | Name of the supplier |
| `agent` | string | no |  | Agent name |
| `region` | string | no |  | Region of the supplier |
| `coffee_type` | string | no |  | Type of coffee |
| `net_dispatch_weight_kg` | number | no |  | Net dispatch weight in kilograms |
| `other_cost_etb` | number | no |  | Other costs in ETB |
| `unit_price_etb_per_feresula` | number | no |  | Unit price in ETB per Feresula |
| `commission_percent` | number | no |  | Commission percentage |
| `remark` | string | no |  | Additional remarks |
| `net_feresula` | number | no |  | Calculated: Net Dispatch Weight KG / 17 |
| `commission_etb` | number | no |  | Calculated: Unit Price × Net Feresula × Commission% / 100 |
| `total_purchase_price` | number | no |  | Calculated: Unit Price × Net Feresula |
| `grand_total_etb` | number | no |  | Calculated: Total Purchase Price + Other Cost + Commission ETB |
| `balance_etb` | number | no |  | Stored balance (Grand Total - Total Paid). Use live calculation from payment_history for display. |
| `payment_history` | string | no |  | JSON array of payment entries: [{payment_no, payment_date, bank_name, branch_account, amount_etb, cpv_reference, payment_type, note}] |
| `total_paid_etb` | number | no |  | Stored sum of payments. Always recompute from payment_history for display — this field may be stale. |
| `additional_costs` | string | no |  | JSON array of additional cost rows: [{name, amount}] |
| `archived` | boolean | no |  | Soft-delete flag. When true, hidden from all normal views. |
| `archived_by` | string | no |  | Email of user who archived the record |
| `archived_at` | string | no |  | ISO date-time when archived |
| `archive_reason` | string | no |  | Optional reason provided when archiving |

### RejectBagUsage
Source: `base44/entities/RejectBagUsage.jsonc`
Required: `date`, `bags_used`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `reject_mode` | string | no | agent, supplier | agent = deducted from agent-level summary. supplier = deducted from supplier-level summary. |
| `agent_name` | string | no |  | Agent name (used when reject_mode=agent) |
| `date` | string | yes | date | Date of reject bag usage |
| `supplier_name` | string | no |  | Supplier whose bags were used (used when reject_mode=supplier) |
| `bags_used` | number | yes |  | Number of bags used for reject |
| `amount_etb` | number | no |  | Auto-calculated: bags_used × 153 ETB |
| `note` | string | no |  |  |

### RolePermission
Source: `base44/entities/RolePermission.jsonc`
Required: `role`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `role` | string | yes | admin, supervisor, purchaser, warehouse_keeper, process_manager, final_registrar, export_manager, accountant, auditor, viewer, unassigned | Role key |
| `allowed_paths` | string | no |  | JSON array of allowed route paths for sidebar filtering |
| `permissions_data` | string | no |  | JSON object: { module_key: { can_view, can_create, can_edit, can_delete, can_archive, can_restore, can_export, can_import, can_approve, can_manage_payments, can_view_financials, can_manage_attachments } } |

### SampleLog
Source: `base44/entities/SampleLog.jsonc`
Required: `sample_kg`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `sample_type` | string | no | Warehouse, Export Inspection, Export, Arrival | Warehouse = deducts from supplier remaining KG. Export Inspection = legacy pool deduction. Export = linked to an export contract, deducts from coffee-type pool. Arrival = linked to a warehouse receipt, deducts from that receipt's received KG. |
| `supplier_name` | string | no |  | Supplier name — required for Warehouse type |
| `coffee_type` | string | no |  | Coffee type — required for Export Inspection / Export types |
| `buyer_name` | string | no |  | Buyer who sent the inspector (Export Inspection only) |
| `inspection_ref` | string | no |  | Reference / id of linked Buyer Inspection record (Export Inspection only) |
| `export_contract_id` | string | no |  | Linked ExportContract id (Export type only, optional) |
| `export_contract_no` | string | no |  | Contract number for display (Export type only) |
| `warehouse_receipt_id` | string | no |  | Linked WarehouseReceipt id (Arrival type only, optional) |
| `coffee_code` | string | no |  |  |
| `sample_date` | string | no | date |  |
| `sample_datetime` | string | no |  |  |
| `sample_kg` | number | yes |  |  |
| `company_recipient` | string | no |  |  |
| `keeper_name` | string | no |  |  |
| `notes` | string | no |  |  |
| `remark` | string | no |  |  |
| `archived` | boolean | no |  | Soft-delete flag. When true, hidden from all normal views. |
| `archived_by` | string | no |  | Email of user who archived the record |
| `archived_at` | string | no |  | ISO date-time when archived |
| `archive_reason` | string | no |  | Optional reason provided when archiving |

### SecuritySetting
Source: `base44/entities/SecuritySetting.jsonc`
Required: `key`, `value`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `key` | string | yes |  | Setting key e.g. require_approval, allow_supervisor_manage_users |
| `value` | string | yes |  | Setting value as string |
| `description` | string | no |  | Human-readable description |
| `updated_by` | string | no |  | Email of user who last updated |
| `updated_at` | string | no |  | ISO date-time of last update |

### Supplier
Source: `base44/entities/Supplier.jsonc`
Required: `supplier_name`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `supplier_name` | string | yes |  | Name of the supplier |
| `region` | string | no | Wollega, Yirgacheffe, Sidama, Jimma, Harrar, Kaffa, Guji, Bench, Gedeo, Other |  |
| `agent` | string | no |  | Agent name |
| `coffee_type` | string | no | Unwashed Lekempti, Washed Yirgacheffe, Natural Sidama, Washed Sidama, Unwashed Harrar, Washed Jimma, Natural Guji, Washed Guji, Other |  |
| `opening_stock_kg` | number | no |  | Opening stock in kilograms |
| `phone_number` | string | no |  | Supplier phone number |
| `coffee_origin` | string | no |  | Coffee origin e.g. Wollega, Guji, Sidama |
| `station_name` | string | no |  | SH. Station Name |
| `agreement_date` | string | no | date | Agreement start date |
| `agreement_expiry_date` | string | no | date | Agreement expiry date |

### SupplierBagPayment
Source: `base44/entities/SupplierBagPayment.jsonc`
Required: `payment_date`, `amount_etb`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `supplier_name` | string | no |  | Supplier the cash was paid to (supplier-level) |
| `agent_name` | string | no |  | Agent the cash was paid to (agent-level) |
| `payment_date` | string | yes | date | Date the payment was made |
| `bank_name` | string | no |  | Bank name |
| `branch_account` | string | no |  | Branch / account info |
| `reference_no` | string | no |  | CPV reference / document number |
| `payment_type` | string | no | Advance, Final Payment | Type of payment |
| `amount_etb` | number | yes |  | Amount paid in ETB |
| `note` | string | no |  |  |

### SupplierBagReturn
Source: `base44/entities/SupplierBagReturn.jsonc`
Required: `return_date`, `bags_returned`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `supplier_name` | string | no |  | Supplier the bags were returned to (supplier-level) |
| `agent_name` | string | no |  | Agent the bags were returned to (agent-level) |
| `return_date` | string | yes | date | Date the bags were returned |
| `bags_returned` | number | yes |  | Number of bags returned in this entry |
| `note` | string | no |  |  |

### SupplierBagSettlement
Source: `base44/entities/SupplierBagSettlement.jsonc`
Required: `supplier_name`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `supplier_name` | string | yes |  | Supplier identifier |
| `bags_received_adjustment` | number | no |  | Manual correction added to (or subtracted from) total bags received from the receipts log |
| `bags_used_adjustment` | number | no |  | Manual correction added to (or subtracted from) total bags used for reject |
| `loss_percent_override` | number | no |  | Override loss allowance percent for this supplier (defaults to 1%) |
| `bags_returned` | boolean | no |  | Whether physical bags have been returned to the supplier |
| `bags_returned_date` | string | no | date | Date bags were returned |
| `bags_returned_count` | number | no |  | Number of bags physically returned |
| `bags_returned_note` | string | no |  |  |
| `cash_paid` | boolean | no |  | Legacy flag — cashPaid is now derived from SupplierBagPayment totals |
| `cash_paid_date` | string | no | date | Legacy |
| `note` | string | no |  |  |

### User
Source: `base44/entities/User.jsonc`
Required: `invited_by`, `approved_by`, `approved_at`, `rejected_by`, `rejected_at`, `rejection_reason`, `last_sign_in_at`, `internal_note`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `role` | string | no | admin, supervisor, purchaser, warehouse_keeper, process_manager, final_registrar, export_manager, accountant, auditor, viewer, unassigned | User role determining access level |
| `is_active` | boolean | no |  | Whether this user can access the ERP |
| `status` | string | no | active, inactive, pending_approval, invited, unassigned | User status |
| `invited_by` | string | yes |  | Email of the user who invited this user |
| `approved_by` | string | yes |  | Email of the user who approved this user |
| `approved_at` | string | yes |  | ISO date-time when user was approved |
| `rejected_by` | string | yes |  | Email of user who rejected |
| `rejected_at` | string | yes |  | ISO date-time when rejected |
| `rejection_reason` | string | yes |  | Reason for rejection |
| `last_sign_in_at` | string | yes |  | ISO date-time of last sign-in |
| `internal_note` | string | yes |  | Internal admin note about this user |

### UserActivityLog
Source: `base44/entities/UserActivityLog.jsonc`
Required: `user_email`, `action`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `user_email` | string | yes |  | Email of the user who performed the action |
| `user_name` | string | no |  | Full name at time of action |
| `user_role` | string | no |  | Role at time of action |
| `action` | string | yes |  | Action performed e.g. Created, Edited, Archived, Login, Role Changed |
| `module_key` | string | no |  | Module key e.g. purchase_registration, export_contracts |
| `module_label` | string | no |  | Human-readable module label |
| `record_id` | string | no |  | ID of the affected record |
| `record_label` | string | no |  | Human-readable record label |
| `details` | string | no |  | Summary/details of the action |
| `old_values` | string | no |  | JSON string of old values |
| `new_values` | string | no |  | JSON string of new values |

### UserInvite
Source: `base44/entities/UserInvite.jsonc`
Required: `email`, `role`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `email` | string | yes |  | Email to invite |
| `role` | string | yes | admin, supervisor, purchaser, warehouse_keeper, process_manager, final_registrar, export_manager, accountant, auditor, viewer, unassigned | Assigned role on acceptance |
| `note` | string | no |  | Optional note for the invite |
| `status` | string | no | pending, accepted, expired, cancelled | Invite status |
| `invited_by` | string | no |  | Email of user who created the invite |
| `accepted_by` | string | no |  | Email of user who accepted |
| `accepted_at` | string | no |  | ISO date-time when accepted |
| `expires_at` | string | no |  | ISO date-time when invite expires |
| `single_use` | boolean | no |  | Whether invite is single-use |
| `require_manual_approval` | boolean | no |  | Whether user must be manually approved after first login |

### WarehouseInventory
Source: `base44/entities/WarehouseInventory.jsonc`
Required: `lot_number`, `coffee_type`, `quantity_kg`, `warehouse_location`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `lot_number` | string | yes |  | Unique lot identifier |
| `coffee_type` | string | yes | Arabica, Robusta, Mixed |  |
| `grade` | string | no | Grade 1, Grade 2, Grade 3, Grade 4, Grade 5, Ungraded |  |
| `quantity_kg` | number | yes |  | Current quantity in warehouse (kg) |
| `warehouse_location` | string | yes |  | Warehouse name or section |
| `status` | string | no | In Storage, In Processing, Ready for Export, Exported |  |
| `received_date` | string | no | date |  |
| `source_purchase_id` | string | no |  | Reference to the purchase record |
| `moisture_content` | number | no |  | Moisture content percentage |
| `notes` | string | no |  |  |

### WarehouseReceipt
Source: `base44/entities/WarehouseReceipt.jsonc`
Required: `coffee_code`, `supplier_name`, `received_date`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `coffee_code` | string | yes |  | Linked to PurchaseRecord coffee_code |
| `purchase_record_id` | string | no |  | ID of the linked PurchaseRecord |
| `supplier_name` | string | yes |  | Auto-filled from linked Purchase |
| `net_dispatch_weight_kg` | number | no |  | Pulled from linked Purchase |
| `warehouse_received_net_kg` | number | no |  | Actual received weight in KG |
| `bags_received` | number | no |  | Physical bag count received in warehouse (auto-syncs to Bag Ledger) |
| `grn_code` | string | no |  | Goods Received Note code |
| `dispatch_no` | string | no |  | Dispatch number |
| `received_date` | string | yes | date | Date received (defaults to today) |
| `remark` | string | no |  | Additional remarks |
| `archived` | boolean | no |  | Soft-delete flag. When true, hidden from all normal views. |
| `archived_by` | string | no |  | Email of user who archived the record |
| `archived_at` | string | no |  | ISO date-time when archived |
| `archive_reason` | string | no |  | Optional reason provided when archiving |

### WarehouseReceiptHistory
Source: `base44/entities/WarehouseReceiptHistory.jsonc`
Required: `receipt_id`, `action_type`, `user_email`, `action_at`
| Field | Type | Required | Enum/format | Notes |
| --- | --- | --- | --- | --- |
| `receipt_id` | string | yes |  | ID of the linked WarehouseReceipt |
| `coffee_code` | string | no |  | Coffee code at time of action |
| `supplier_name` | string | no |  | Supplier name at time of action |
| `grn_code` | string | no |  | GRN code at time of action |
| `action_type` | string | yes | Created, Edited, Archived, Restored | Type of action performed |
| `user_email` | string | yes |  | Email of user who performed the action |
| `user_name` | string | no |  | Full name of user who performed the action |
| `user_role` | string | no |  | Role of user who performed the action |
| `action_at` | string | yes |  | ISO datetime of when the action was performed |
| `changes` | string | no |  | JSON array of changed fields: [{field, label, old_value, new_value}] |
| `reason` | string | no |  | Optional reason (e.g. for archive actions) |
| `kg_impact` | string | no |  | JSON object with KG change impact details if warehouse_received_net_kg changed |

## Relationship map

- `PurchaseRecord` links to `WarehouseReceipt` by `purchase_record_id` and `coffee_code`; purchase payment rows currently live in `payment_history` JSON.
- `WarehouseReceipt` links to `BagReceipt`, `Attachment`, `WarehouseReceiptHistory`, `SampleLog`, and `ProcessingLog` by receipt id, coffee code, or supplier name depending on the workflow.
- `Supplier` is used as a master lookup by purchases, warehouse receipts, samples, processing, export contracts, bag ledger, and reports, usually by supplier name rather than stable FK.
- `SampleLog` can link to `WarehouseReceipt`, `ExportContract`, and `BuyerInspection`; its deduction behavior depends on `sample_type`.
- `ProcessingLog` consumes supplier availability and feeds `OutputReport`; recleaning entries can originate from failed buyer inspections.
- `OutputReport` creates export/reject/waste quantities and feeds stock pools and export contracts.
- `ExportContract` consumes stock pools; cost, material, arrival, and payment details are JSON strings that should become child tables.
- `Attachment` is a polymorphic parent reference using `entity_type` and `entity_id`.
- `ActivityLog`, `UserActivityLog`, and `WarehouseReceiptHistory` are audit/history surfaces and should be append-only after migration.

## Base44 SDK and backend calls

See `docs/migration/02-base44-dependency-register.md` for the file-level register. Summary: 76 files reference Base44 directly or through Base44 function code. Operations found include entity `list`, `filter`, `create`, `update`, `delete`, auth methods, `UploadFile`, and function invocation.

Backend functions present in source: `backfillGrandTotals`, `backupDaily`, `backupMonthly`, `backupWeekly`, `createDemoUser`, `migrateProcessingLogs`, `recalcPurchaseFromReceipt`, `sendTelegramMessage`, `telegramOnExportContract`, `telegramOnOutputReport`, `telegramOnProcessing`, `telegramOnPurchase`, `telegramOnWarehouseReceipt`, `telegramWeeklySummary`, `weeklyPaymentSummary`. The previously suspected `recalcPurchaseFromReceipt` and `sendTelegramMessage` functions are present under `base44/functions`.

## Attachment and upload workflows

- `src/components/attachments/FileAttachments.jsx` uploads purchase and warehouse files with `base44.integrations.Core.UploadFile`, then writes `Attachment` metadata.
- `src/components/attachments/ExportDocsPanel.jsx` uploads export contract documents with `UploadFile`.
- `PurchaseAttachmentsPanel` sections: contract documents, GRN certificates, payment vouchers.
- `WarehouseAttachmentsPanel` sections: GRN certificate, dispatch note, weighbridge ticket.
- `ExportDocsPanel` sections cover export document slots using `section_ref`.
- Supabase replacement: Storage bucket plus `attachments` metadata table scoped by organization and parent table/id.

## Roles, permissions, settings

Roles: `admin`, `supervisor`, `purchaser`, `warehouse_keeper`, `process_manager`, `final_registrar`, `export_manager`, `accountant`, `auditor`, `viewer`, `unassigned`.

Permission actions: `can_view`, `can_create`, `can_edit`, `can_delete`, `can_archive`, `can_restore`, `can_export`, `can_import`, `can_approve`, `can_manage_payments`, `can_view_financials`, `can_manage_attachments`.

Role defaults, modules, routes, and action permissions live in `src/lib/role-hooks.js`. Stored overrides currently use `RolePermission.allowed_paths` and `RolePermission.permissions_data` JSON strings. Security settings are stored as key/value strings in `SecuritySetting`.

## Scheduled and notification behavior

Base44 functions include daily, weekly, and monthly backups; weekly payment summaries; Telegram notifications for purchase, warehouse receipt, processing, output report, export contract, and weekly summary; and frontend notifications in `src/lib/notificationService.js`. Notification preferences are stored per user in `NotificationSettings.disabled_types` JSON.

## Business, stock, and financial calculations to preserve

- 1 feresula = 17 KG.
- Standard/reject bag = 85 KG, centralized as `BAG_WEIGHT_KG` in `src/lib/constants.js`.
- Export bag = 60 KG in output/export calculations.
- 1 KG = 2.2046 LB in export pricing.
- Payment balance tolerance is approximately +/-1 ETB in `src/lib/paymentUtils.js`.
- Supplier availability = warehouse received KG - warehouse/sample KG - processing KG, implemented in `src/lib/availabilityUtils.js`.
- Fresh/recleaned stock pools are separated in `src/lib/stockPools.js`; buyer inspection samples, export inspection samples, export contracts, and pool-1 support for recleaning deduct from availability.
- Purchase total = purchase price + commission + additional costs; balance is derived from grand total minus JSON payment history.
- Output report formula = export KG, reject KG, and waste KG derived from processing totals and bag counts.
- Export financials include KG-to-LB conversion, USD value, ETB conversion, costs/materials/reject income, profit, and margin.

## JSON-string fields to normalize

- `ActivityLog.changes`
- `ExportContract.cost_rows`
- `ExportContract.material_rows`
- `ExportContract.payment_history`
- `ExportContract.arrival_inputs`
- `NotificationSettings.disabled_types`
- `PurchaseRecord.payment_history`
- `PurchaseRecord.additional_costs`
- `RolePermission.allowed_paths`
- `RolePermission.permissions_data`
- `UserActivityLog.old_values`
- `UserActivityLog.new_values`
- `WarehouseReceiptHistory.changes`
- `WarehouseReceiptHistory.kg_impact`

## Environment variables and hosted assets

- Existing Base44 config comes from `src/lib/app-params.js`, `base44/config.jsonc`, and the Base44 Vite plugin.
- Supabase placeholders are added in `.env.example`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Real `.env` files are ignored by Git.
- Base44-hosted assets found:
  - src/components/AuthLayout.jsx -> https://media.base44.com/images/public/6a3288c4b01eb57cd2f94a14/8fc255d08_generated_image.png
  - src/components/UserNotRegisteredError.jsx -> https://media.base44.com/images/public/6a3288c4b01eb57cd2f94a14/8fc255d08_generated_image.png
  - src/components/layout/Sidebar.jsx -> https://media.base44.com/images/public/6a3288c4b01eb57cd2f94a14/8fc255d08_generated_image.png

## Legacy or duplicated entities

- `Purchase` and `PurchaseRecord` overlap; `PurchaseRecord` is the richer current workflow.
- `ProcessingBatch` and `ProcessingLog` overlap; `ProcessingLog` is used by current operational screens and reports.
- `Export` and `ExportContract` overlap; `ExportContract` is the richer current workflow.
- `MaterialEntry` and `MaterialRegisterEntry` overlap; `MaterialRegisterEntry` is used by current material tabs.
- `UserActivityLog` and `ActivityLog` overlap; both are still read by admin/reporting screens.
- `WarehouseInventory` appears as a legacy/manual stock table while current coffee stock is calculated from receipts, samples, processing, outputs, inspections, and contracts.

## Security weaknesses

- Public demo fallback grants admin-like access when auth user is absent in `src/lib/role-hooks.js` and `src/lib/useUser.js`.
- `src/api/base44Client.js` uses `requiresAuth: false`.
- Login/register/reset routes are redirected away from their pages in `src/App.jsx`.
- `ProtectedRoute` exists but is not mounted around the main route tree.
- Route and permission enforcement is frontend-only; no RLS exists yet for Supabase business data.
- Role and permission changes are client writable through Base44 entities.
- Audit/history entities can be modified through ordinary SDK calls unless backend rules prevent it.
- File URLs are Base44-hosted and not yet governed by Supabase Storage policies.
- Some list calls cap reads at 500/1000/5000 records, which can truncate exports and reports.

## Existing build, lint, and type-check status

Baseline commands are recorded in `docs/migration/07-code-quality-baseline.md`.

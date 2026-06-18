# RLS Policy Matrix

Anonymous users must have no direct ERP business-data access. Delete operations should be disabled for business data; use archive columns and append audit rows.

| Table | Select | Insert | Update | Archive | Delete | Organization isolation | Role/permission requirement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `organizations` | active members only | admin/system only | users with edit permission | admin/system only | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member; admin for writes |
| `profiles` | active members only | admin/system only | users with edit permission | admin/system only | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member; admin for writes |
| `roles` | active members only | admin/system only | users with edit permission | admin/system only | no direct delete | `organization_id` must match current membership, except global role seeds | admin or supervisor with manage permission |
| `permissions` | active members only | admin/system only | users with edit permission | admin/system only | no direct delete | `organization_id` must match current membership, except global role seeds | admin or supervisor with manage permission |
| `role_permissions` | active members only | admin/system only | users with edit permission | admin/system only | no direct delete | `organization_id` must match current membership, except global role seeds | admin or supervisor with manage permission |
| `organization_memberships` | active members only | admin/system only | users with edit permission | admin/system only | no direct delete | `organization_id` must match current membership, except global role seeds | admin or supervisor with manage permission |
| `app_settings` | active members only | admin/system only | users with edit permission | admin/system only | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member; admin for writes |
| `migration_batches` | active members only | admin/system only | users with edit permission | admin/system only | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member; admin for writes |
| `migration_id_map` | active members only | admin/system only | users with edit permission | admin/system only | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member; admin for writes |
| `suppliers` | active members only | users with create permission | users with edit permission | users with archive permission | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member with module permission |
| `purchase_records` | active members only | users with create permission | users with edit permission | users with archive permission | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member with module permission |
| `purchase_additional_costs` | active members only | users with create permission | users with edit permission | users with archive permission | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member with module permission |
| `purchase_payments` | active members only | users with create permission | users with edit permission | users with archive permission | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member with module permission |
| `warehouse_receipts` | active members only | users with create permission | users with edit permission | users with archive permission | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member with module permission |
| `samples` | active members only | users with create permission | users with edit permission | users with archive permission | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member with module permission |
| `processing_logs` | active members only | users with create permission | users with edit permission | users with archive permission | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member with module permission |
| `output_reports` | active members only | users with create permission | users with edit permission | users with archive permission | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member with module permission |
| `stock_movements` | active members only | users with create permission | users with edit permission | users with archive permission | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member with module permission |
| `export_contracts` | active members only | users with create permission | users with edit permission | users with archive permission | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member with module permission |
| `export_costs` | active members only | users with create permission | users with edit permission | users with archive permission | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member with module permission |
| `export_materials` | active members only | users with create permission | users with edit permission | users with archive permission | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member with module permission |
| `export_payments` | active members only | users with create permission | users with edit permission | users with archive permission | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member with module permission |
| `bag_movements` | active members only | users with create permission | users with edit permission | users with archive permission | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member with module permission |
| `material_movements` | active members only | users with create permission | users with edit permission | users with archive permission | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member with module permission |
| `notifications` | active members only | users with create permission | users with edit permission | users with archive permission | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member with module permission |
| `notification_preferences` | active members only | users with create permission | users with edit permission | users with archive permission | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member with module permission |
| `audit_logs` | active members only | users with create permission | never | users with archive permission | no direct delete | `organization_id` must match current membership, except global role seeds | system/admin append-only; no user update |
| `warehouse_receipt_history` | active members only | users with create permission | never | users with archive permission | no direct delete | `organization_id` must match current membership, except global role seeds | system/admin append-only; no user update |
| `attachments` | active members only | users with create permission | users with edit permission | users with archive permission | no direct delete | `organization_id` must match current membership, except global role seeds | active organization member with module permission |

## Non-negotiable rules

- Users cannot change their own role or membership.
- Users cannot access another organization.
- Audit and history rows are immutable after insert.
- Approval permissions cannot be bypassed by direct table writes.
- Calculated balances and stock totals should be derived from ledger/child rows, not edited directly by clients.

Initial RLS policies are created only for foundational tables in `supabase/migrations`. Operational policies are design-only until those tables are created.

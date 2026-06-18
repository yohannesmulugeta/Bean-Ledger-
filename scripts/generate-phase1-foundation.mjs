import fs from 'node:fs';
import path from 'node:path';

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
const rel = (file) => file.replaceAll('\\', '/');
const esc = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function stripJsonc(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '');
}

ensureDir('docs/migration');
ensureDir('supabase/migrations');
ensureDir('supabase/functions');
ensureDir('supabase/tests');
ensureDir('src/services');

const entityFiles = walk('base44/entities').filter((file) => file.endsWith('.jsonc')).sort();
const entities = entityFiles.map((file) => {
  const json = JSON.parse(stripJsonc(fs.readFileSync(file, 'utf8')));
  const required = json.required || [];
  return {
    file: rel(file),
    name: json.name,
    required,
    fields: Object.entries(json.properties || {}).map(([name, spec]) => ({
      name,
      type: spec.type || 'unknown',
      format: spec.format || '',
      enum: Array.isArray(spec.enum) ? spec.enum.join(', ') : '',
      required: required.includes(name),
      description: spec.description || '',
    })),
  };
});

const codeFiles = walk('src').filter((file) => /\.(jsx?|tsx?)$/.test(file)).sort();
const baseFunctionFiles = walk('base44/functions').filter((file) => file.endsWith('.ts')).sort();
const scanFiles = [...codeFiles, ...baseFunctionFiles, 'vite.config.js', 'package.json'].filter((file) => fs.existsSync(file));

const dependencies = [];
for (const file of scanFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (!/base44|@base44|UploadFile|functions\.invoke/.test(source)) continue;

  const imports = [];
  if (/@base44\/sdk/.test(source)) imports.push('@base44/sdk');
  if (/@base44\/vite-plugin/.test(source)) imports.push('@base44/vite-plugin');
  if (/@\/api\/base44Client/.test(source)) imports.push('@/api/base44Client');

  const entitiesUsed = [...source.matchAll(/base44\.entities(?:\[([^\]]+)\]|\.([A-Za-z0-9_]+))/g)]
    .map((match) => (match[1] || match[2] || '').replace(/["'`]/g, ''))
    .filter(Boolean);
  const ops = [...source.matchAll(/base44\.entities(?:\[[^\]]+\]|\.[A-Za-z0-9_]+)\.([a-zA-Z]+)/g)].map((match) => match[1]);
  const funcs = [...source.matchAll(/base44\.functions\.invoke\(['"]([^'"]+)/g)].map((match) => match[1]);
  const auth = [...source.matchAll(/base44\.auth\.([a-zA-Z]+)/g)].map((match) => match[1]);

  dependencies.push({
    file: rel(file),
    imports: [...new Set(imports)],
    entities: [...new Set(entitiesUsed)],
    ops: [...new Set(ops)],
    funcs: [...new Set(funcs)],
    auth: [...new Set(auth)],
    upload: /UploadFile/.test(source),
  });
}

const appSource = fs.readFileSync('src/App.jsx', 'utf8');
const routes = [...appSource.matchAll(/<Route path="([^"]+)" element=\{([^\n]+)\}/g)].map((match) => ({
  path: match[1],
  element: match[2].replace(/[<>{}]/g, '').slice(0, 140),
}));

const jsonFields = entities.flatMap((entity) =>
  entity.fields
    .filter((field) => field.type === 'string' && /json|array|object|rows|history|inputs|values|paths|permissions|changes|impact/i.test(`${field.name} ${field.description}`))
    .map((field) => `${entity.name}.${field.name}`),
);

const functionNames = baseFunctionFiles.map((file) => path.basename(path.dirname(file)));
const assetRefs = scanFiles.flatMap((file) => {
  const source = fs.readFileSync(file, 'utf8');
  return [...source.matchAll(/https:\/\/media\.base44\.com[^"'\s)]+/g)].map((match) => `${rel(file)} -> ${match[0]}`);
});

const roles = ['admin', 'supervisor', 'purchaser', 'warehouse_keeper', 'process_manager', 'final_registrar', 'export_manager', 'accountant', 'auditor', 'viewer', 'unassigned'];
const permissionTypes = ['can_view', 'can_create', 'can_edit', 'can_delete', 'can_archive', 'can_restore', 'can_export', 'can_import', 'can_approve', 'can_manage_payments', 'can_view_financials', 'can_manage_attachments'];

function entityFieldSection() {
  return entities.map((entity) => [
    `### ${entity.name}`,
    `Source: \`${entity.file}\``,
    `Required: ${entity.required.length ? entity.required.map((field) => `\`${field}\``).join(', ') : 'none declared'}`,
    '| Field | Type | Required | Enum/format | Notes |',
    '| --- | --- | --- | --- | --- |',
    ...entity.fields.map((field) => `| \`${field.name}\` | ${field.type} | ${field.required ? 'yes' : 'no'} | ${esc([field.format, field.enum].filter(Boolean).join('; '))} | ${esc(field.description)} |`),
  ].join('\n')).join('\n\n');
}

const auditDoc = `# Current System Audit

Generated from the Base44 source in this repository on 2026-06-18. This is a migration foundation document only; it does not change runtime behavior.

## Pages and routes

| Route | Current component/guard |
| --- | --- |
${routes.map((route) => `| \`${route.path}\` | ${esc(route.element)} |`).join('\n')}

Auth pages \`/login\`, \`/register\`, \`/signup\`, \`/forgot-password\`, and \`/reset-password\` currently redirect to \`/\` in \`src/App.jsx\`, even though page components exist. Legacy summary pages remain routed: \`/purchases\`, \`/warehouse\`, and \`/processing\`.

## Base44 entities and fields

${entityFieldSection()}

## Relationship map

- \`PurchaseRecord\` links to \`WarehouseReceipt\` by \`purchase_record_id\` and \`coffee_code\`; purchase payment rows currently live in \`payment_history\` JSON.
- \`WarehouseReceipt\` links to \`BagReceipt\`, \`Attachment\`, \`WarehouseReceiptHistory\`, \`SampleLog\`, and \`ProcessingLog\` by receipt id, coffee code, or supplier name depending on the workflow.
- \`Supplier\` is used as a master lookup by purchases, warehouse receipts, samples, processing, export contracts, bag ledger, and reports, usually by supplier name rather than stable FK.
- \`SampleLog\` can link to \`WarehouseReceipt\`, \`ExportContract\`, and \`BuyerInspection\`; its deduction behavior depends on \`sample_type\`.
- \`ProcessingLog\` consumes supplier availability and feeds \`OutputReport\`; recleaning entries can originate from failed buyer inspections.
- \`OutputReport\` creates export/reject/waste quantities and feeds stock pools and export contracts.
- \`ExportContract\` consumes stock pools; cost, material, arrival, and payment details are JSON strings that should become child tables.
- \`Attachment\` is a polymorphic parent reference using \`entity_type\` and \`entity_id\`.
- \`ActivityLog\`, \`UserActivityLog\`, and \`WarehouseReceiptHistory\` are audit/history surfaces and should be append-only after migration.

## Base44 SDK and backend calls

See \`docs/migration/02-base44-dependency-register.md\` for the file-level register. Summary: ${dependencies.length} files reference Base44 directly or through Base44 function code. Operations found include entity \`list\`, \`filter\`, \`create\`, \`update\`, \`delete\`, auth methods, \`UploadFile\`, and function invocation.

Backend functions present in source: ${functionNames.map((name) => `\`${name}\``).join(', ')}. The previously suspected \`recalcPurchaseFromReceipt\` and \`sendTelegramMessage\` functions are present under \`base44/functions\`.

## Attachment and upload workflows

- \`src/components/attachments/FileAttachments.jsx\` uploads purchase and warehouse files with \`base44.integrations.Core.UploadFile\`, then writes \`Attachment\` metadata.
- \`src/components/attachments/ExportDocsPanel.jsx\` uploads export contract documents with \`UploadFile\`.
- \`PurchaseAttachmentsPanel\` sections: contract documents, GRN certificates, payment vouchers.
- \`WarehouseAttachmentsPanel\` sections: GRN certificate, dispatch note, weighbridge ticket.
- \`ExportDocsPanel\` sections cover export document slots using \`section_ref\`.
- Supabase replacement: Storage bucket plus \`attachments\` metadata table scoped by organization and parent table/id.

## Roles, permissions, settings

Roles: ${roles.map((role) => `\`${role}\``).join(', ')}.

Permission actions: ${permissionTypes.map((permission) => `\`${permission}\``).join(', ')}.

Role defaults, modules, routes, and action permissions live in \`src/lib/role-hooks.js\`. Stored overrides currently use \`RolePermission.allowed_paths\` and \`RolePermission.permissions_data\` JSON strings. Security settings are stored as key/value strings in \`SecuritySetting\`.

## Scheduled and notification behavior

Base44 functions include daily, weekly, and monthly backups; weekly payment summaries; Telegram notifications for purchase, warehouse receipt, processing, output report, export contract, and weekly summary; and frontend notifications in \`src/lib/notificationService.js\`. Notification preferences are stored per user in \`NotificationSettings.disabled_types\` JSON.

## Business, stock, and financial calculations to preserve

- 1 feresula = 17 KG.
- Standard/reject bag = 85 KG, centralized as \`BAG_WEIGHT_KG\` in \`src/lib/constants.js\`.
- Export bag = 60 KG in output/export calculations.
- 1 KG = 2.2046 LB in export pricing.
- Payment balance tolerance is approximately +/-1 ETB in \`src/lib/paymentUtils.js\`.
- Supplier availability = warehouse received KG - warehouse/sample KG - processing KG, implemented in \`src/lib/availabilityUtils.js\`.
- Fresh/recleaned stock pools are separated in \`src/lib/stockPools.js\`; buyer inspection samples, export inspection samples, export contracts, and pool-1 support for recleaning deduct from availability.
- Purchase total = purchase price + commission + additional costs; balance is derived from grand total minus JSON payment history.
- Output report formula = export KG, reject KG, and waste KG derived from processing totals and bag counts.
- Export financials include KG-to-LB conversion, USD value, ETB conversion, costs/materials/reject income, profit, and margin.

## JSON-string fields to normalize

${jsonFields.map((field) => `- \`${field}\``).join('\n')}

## Environment variables and hosted assets

- Existing Base44 config comes from \`src/lib/app-params.js\`, \`base44/config.jsonc\`, and the Base44 Vite plugin.
- Supabase placeholders are added in \`.env.example\`: \`VITE_SUPABASE_URL\`, \`VITE_SUPABASE_ANON_KEY\`.
- Real \`.env\` files are ignored by Git.
- Base44-hosted assets found:${assetRefs.length ? assetRefs.map((ref) => `\n  - ${ref}`).join('') : ' none found in scanned source.'}

## Legacy or duplicated entities

- \`Purchase\` and \`PurchaseRecord\` overlap; \`PurchaseRecord\` is the richer current workflow.
- \`ProcessingBatch\` and \`ProcessingLog\` overlap; \`ProcessingLog\` is used by current operational screens and reports.
- \`Export\` and \`ExportContract\` overlap; \`ExportContract\` is the richer current workflow.
- \`MaterialEntry\` and \`MaterialRegisterEntry\` overlap; \`MaterialRegisterEntry\` is used by current material tabs.
- \`UserActivityLog\` and \`ActivityLog\` overlap; both are still read by admin/reporting screens.
- \`WarehouseInventory\` appears as a legacy/manual stock table while current coffee stock is calculated from receipts, samples, processing, outputs, inspections, and contracts.

## Security weaknesses

- Public demo fallback grants admin-like access when auth user is absent in \`src/lib/role-hooks.js\` and \`src/lib/useUser.js\`.
- \`src/api/base44Client.js\` uses \`requiresAuth: false\`.
- Login/register/reset routes are redirected away from their pages in \`src/App.jsx\`.
- \`ProtectedRoute\` exists but is not mounted around the main route tree.
- Route and permission enforcement is frontend-only; no RLS exists yet for Supabase business data.
- Role and permission changes are client writable through Base44 entities.
- Audit/history entities can be modified through ordinary SDK calls unless backend rules prevent it.
- File URLs are Base44-hosted and not yet governed by Supabase Storage policies.
- Some list calls cap reads at 500/1000/5000 records, which can truncate exports and reports.

## Existing build, lint, and type-check status

Baseline commands are recorded in \`docs/migration/07-code-quality-baseline.md\`.
`;

fs.writeFileSync('docs/migration/01-current-system-audit.md', auditDoc);

const registerDoc = `# Base44 Dependency Register

Generated from source scan on 2026-06-18. Replacement recommendations assume Supabase Auth, Postgres tables, Storage, and Edge Functions.

| File path | Imported Base44 API | Entity/function used | Read operation | Write operation | Upload operation | Authentication operation | Recommended Supabase replacement |
| --- | --- | --- | --- | --- | --- | --- | --- |
${dependencies.map((dependency) => {
  const reads = dependency.ops.filter((op) => ['list', 'filter', 'get'].includes(op)).join(', ');
  const writes = dependency.ops.filter((op) => ['create', 'update', 'delete', 'bulkCreate'].includes(op)).join(', ');
  const used = [...dependency.entities.map((entity) => `entity:${entity}`), ...dependency.funcs.map((func) => `function:${func}`)].join(', ');
  const recommendation = dependency.file.includes('functions/')
    ? 'Supabase Edge Function using service role server-side only'
    : dependency.upload
      ? 'Supabase Storage plus attachments table'
      : dependency.auth.length
        ? 'Supabase Auth service wrapper'
        : dependency.entities.length
          ? 'Supabase table service wrapper with RLS'
          : 'Remove Base44 dependency or replace with app config';
  return `| \`${dependency.file}\` | ${dependency.imports.map((item) => `\`${item}\``).join(', ') || 'Base44 client/function SDK'} | ${esc(used || 'Base44 config/runtime')} | ${esc(reads || '-')} | ${esc(writes || '-')} | ${dependency.upload ? 'yes' : 'no'} | ${esc(dependency.auth.join(', ') || '-')} | ${recommendation} |`;
}).join('\n')}
`;

fs.writeFileSync('docs/migration/02-base44-dependency-register.md', registerDoc);

const tableName = (name) => `${name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()}${name.endsWith('s') ? '' : 's'}`;
const mappingDoc = `# Entity Mapping

No legacy entities are deleted or merged in this phase. Proposed tables keep \`base44_id text\` for migrated records and add tenant ownership with \`organization_id uuid\`.

| Base44 entity | Proposed Supabase table | Primary key | Foreign keys / links | Monetary fields | Weight/quantity fields | Date fields | JSON fields | Archived status | Source Base44 ID | Migration risks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${entities.map((entity) => {
  const names = entity.fields.map((field) => field.name);
  const money = names.filter((name) => /(etb|usd|price|cost|payment|paid|balance|commission|revenue|profit|rate|amount|value|sales|expenses|charges|fee|income)/i.test(name));
  const weight = names.filter((name) => /(kg|bag|bags|quantity|lb|feresula|stock|sample|waste|reject|export)/i.test(name));
  const dates = entity.fields.filter((field) => field.format === 'date' || /(date|_at|datetime)/i.test(field.name)).map((field) => field.name);
  const json = entity.fields.filter((field) => jsonFields.includes(`${entity.name}.${field.name}`)).map((field) => field.name);
  const links = names.filter((name) => /(^id$|_id$|id$|email|supplier_name|coffee_code|contract_no|receipt_id|entity_type|entity_id|role)/i.test(name));
  const archived = names.includes('archived') ? 'boolean archived + archived metadata' : names.some((name) => /status/i.test(name)) ? 'status field only' : 'none declared';
  const risk = entity.name === 'Purchase'
    ? 'Legacy duplicate of PurchaseRecord'
    : entity.name === 'PurchaseRecord'
      ? 'Core financial formulas and JSON child rows'
      : entity.name === 'ExportContract'
        ? 'Many legacy financial fields and JSON rows'
        : entity.name === 'WarehouseInventory'
          ? 'May conflict with calculated stock workflows'
          : entity.name.includes('Log') || entity.name.includes('Activity') || entity.name.includes('History')
            ? 'Should become append-only audit/history'
            : 'Needs FK cleanup from name-based links';
  return `| \`${entity.name}\` | \`${tableName(entity.name)}\` | \`id uuid\` | ${esc(links.map((field) => `\`${field}\``).join(', ') || '-')} | ${esc(money.map((field) => `\`${field}\``).join(', ') || '-')} | ${esc(weight.map((field) => `\`${field}\``).join(', ') || '-')} | ${esc(dates.map((field) => `\`${field}\``).join(', ') || '-')} | ${esc(json.map((field) => `\`${field}\``).join(', ') || '-')} | ${archived} | \`base44_id text unique\` | ${risk} |`;
}).join('\n')}
`;

fs.writeFileSync('docs/migration/03-entity-mapping.md', mappingDoc);

fs.writeFileSync('docs/migration/04-proposed-supabase-schema.md', `# Proposed Supabase Operational Schema

This phase creates only foundational auth/tenant/migration tables. The operational tables below are proposed for later phased migrations after full data export and reconciliation. All tables should include \`id uuid primary key\`, \`organization_id uuid\`, \`base44_id text\`, \`created_at\`, \`created_by\`, \`updated_at\`, \`updated_by\`, and \`archived_at\` where records are user-archivable.

## Supplier and Purchase Domain

- \`suppliers\`: supplier master data, agent, region, coffee type, opening stock, phone, station, agreement dates.
- \`purchase_records\`: coffee code, supplier FK, purchase date, dispatch KG, unit price, calculated feresula, purchase price, commission, grand total, payment status, archived metadata.
- \`purchase_additional_costs\`: one row per purchase cost item.
- \`purchase_payments\`: normalized replacement for \`PurchaseRecord.payment_history\`; CPV/reference, bank, amount ETB, date, created by.
- \`warehouse_receipts\`: purchase FK, coffee code, supplier FK, dispatch KG, warehouse received KG, bags, GRN, dispatch number, received date.
- \`samples\`: normalized \`SampleLog\` for warehouse, export inspection, export, and arrival samples with nullable FKs.

## Processing, Output, and Stock Domain

- \`processing_logs\`: supplier/receipt/inspection links, entry type, KG sent, actual weighed KG, coffee type, status, archive metadata.
- \`output_reports\`: processing FK, entry type, export bags/KG, reject bags/KG, waste KG, additional pool-1 KG, final registrar fields.
- \`stock_movements\`: append-only ledger of stock-affecting events from receipts, samples, processing, outputs, inspections, contracts, and archive/restore actions.

## Export Domain

- \`export_contracts\`: contract details, buyer, destination, stock pool, export KG/bags, shipped KG, pricing method, rates, USD/ETB values, status, payment status.
- \`export_costs\`: normalized \`cost_rows\` plus legacy named cost fields during migration.
- \`export_materials\`: normalized \`material_rows\` linked to contracts and material movements.
- \`export_payments\`: normalized export payment history in USD and ETB.

## Bags and Materials

- \`bag_movements\`: receipts, reject usage, supplier/agent returns, and cash settlements as ledger rows; preserve 85 KG reject/standard bag rule.
- \`material_movements\`: export/general purchases and usage from \`MaterialRegisterEntry\`, with item type and bag size.

## System Tables

- \`notifications\`: recipient profile/role, type, title, message, link, severity, read state, related entity.
- \`notification_preferences\`: normalized disabled notification types per user.
- \`audit_logs\`: append-only replacement for \`ActivityLog\` and \`UserActivityLog\`.
- \`warehouse_receipt_history\`: append-only receipt-specific history.
- \`attachments\`: metadata for Supabase Storage objects with parent table/id, section, section ref, file name, mime type, size, uploaded by.
`);

fs.writeFileSync('docs/migration/05-auth-and-permissions-plan.md', `# Auth and Permissions Plan

## Current behavior

- Demo fallback users exist in \`src/lib/role-hooks.js\` and \`src/lib/useUser.js\`; absent auth becomes \`demo@beanledgerexport.com\` with \`admin\` role.
- \`src/api/base44Client.js\` sets \`requiresAuth: false\`.
- \`src/App.jsx\` redirects login, register, forgot-password, reset-password, and signup routes to \`/\`.
- \`ProtectedRoute\` exists but is not mounted around the main app route tree.
- \`ModuleRouteGuard\` enforces frontend \`can_view\` permissions; \`RouteGuard\` also exists but is not the primary route wrapper.
- Roles and permissions come from constants in \`src/lib/role-hooks.js\` with optional Base44 \`RolePermission\` and \`SecuritySetting\` overrides.

## Recommended Supabase Auth flow

- Use Supabase Auth for sessions and JWTs. The frontend uses only \`VITE_SUPABASE_URL\` and \`VITE_SUPABASE_ANON_KEY\`.
- Profiles are created by a server-side invite/admin flow, not public self-registration.
- Invitation-only user creation: admin/supervisor with permission creates an invite; an Edge Function or admin API creates auth user and profile membership.
- Initial admin creation: run a one-time local/staging SQL seed or admin Edge Function after project setup; do not expose service role in frontend.
- Password reset: Supabase reset email with a dedicated reset route after routes are restored.
- Disabled users: keep \`profiles.status\`/\`is_active\`; RLS helper functions must deny disabled users even if their auth session is valid.
- Session handling: centralize in \`authService\`, subscribe to auth state changes, fetch profile/membership/permissions after session load.
- Route protection: mount a real protected route around the app layout before removing demo fallback.
- RLS enforcement: every business table checks organization membership and required permission; frontend guards become UX only, not security.

## Do not change yet

The demo fallback and Base44 auth behavior remain in place during phase 1 to preserve production behavior.
`);

const rlsTables = ['organizations', 'profiles', 'roles', 'permissions', 'role_permissions', 'organization_memberships', 'app_settings', 'migration_batches', 'migration_id_map', 'suppliers', 'purchase_records', 'purchase_additional_costs', 'purchase_payments', 'warehouse_receipts', 'samples', 'processing_logs', 'output_reports', 'stock_movements', 'export_contracts', 'export_costs', 'export_materials', 'export_payments', 'bag_movements', 'material_movements', 'notifications', 'notification_preferences', 'audit_logs', 'warehouse_receipt_history', 'attachments'];
const foundationTables = new Set(['organizations', 'profiles', 'roles', 'permissions', 'role_permissions', 'organization_memberships', 'app_settings', 'migration_batches', 'migration_id_map']);
fs.writeFileSync('docs/migration/06-rls-policy-matrix.md', `# RLS Policy Matrix

Anonymous users must have no direct ERP business-data access. Delete operations should be disabled for business data; use archive columns and append audit rows.

| Table | Select | Insert | Update | Archive | Delete | Organization isolation | Role/permission requirement |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rlsTables.map((table) => {
  const foundation = foundationTables.has(table);
  const requirement = table === 'audit_logs' || table === 'warehouse_receipt_history'
    ? 'system/admin append-only; no user update'
    : table.includes('role') || table.includes('permission') || table === 'organization_memberships'
      ? 'admin or supervisor with manage permission'
      : foundation
        ? 'active organization member; admin for writes'
        : 'active organization member with module permission';
  return `| \`${table}\` | active members only | ${foundation ? 'admin/system only' : 'users with create permission'} | ${table.includes('audit') || table.includes('history') ? 'never' : 'users with edit permission'} | ${foundation ? 'admin/system only' : 'users with archive permission'} | no direct delete | \`organization_id\` must match current membership, except global role seeds | ${requirement} |`;
}).join('\n')}

## Non-negotiable rules

- Users cannot change their own role or membership.
- Users cannot access another organization.
- Audit and history rows are immutable after insert.
- Approval permissions cannot be bypassed by direct table writes.
- Calculated balances and stock totals should be derived from ledger/child rows, not edited directly by clients.

Initial RLS policies are created only for foundational tables in \`supabase/migrations\`. Operational policies are design-only until those tables are created.
`);

fs.writeFileSync('docs/migration/08-migration-checklist.md', `# Migration Checklist

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
`);

fs.writeFileSync('.env.example', 'VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=\n');
let gitignore = fs.readFileSync('.gitignore', 'utf8');
if (!gitignore.includes('!.env.example')) {
  gitignore = gitignore.replace('.env.*', '.env.*\n!.env.example');
  fs.writeFileSync('.gitignore', gitignore);
}

fs.writeFileSync('supabase/config.toml', `project_id = "bean-ledger-local"

[api]
enabled = true

[db]
major_version = 15

[studio]
enabled = true

[auth]
enabled = true

[storage]
enabled = true
`);

fs.writeFileSync('supabase/seed.sql', '-- Phase 1 keeps seed data empty. Add local-only development seeds after auth and RLS are finalized.\n');

fs.writeFileSync('supabase/migrations/202606180001_foundation_tables.sql', `create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  base44_id text unique,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  archived_at timestamptz
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role_key text not null default 'unassigned',
  is_active boolean not null default true,
  status text not null default 'unassigned',
  base44_id text unique,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  archived_at timestamptz
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  key text not null,
  label text not null,
  base44_id text unique,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  archived_at timestamptz,
  unique (organization_id, key)
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  module_key text,
  action_key text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  archived_at timestamptz
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  allowed boolean not null default true,
  base44_id text unique,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  archived_at timestamptz,
  unique (organization_id, role_id, permission_id)
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid references public.roles(id),
  status text not null default 'active',
  base44_id text unique,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  archived_at timestamptz,
  unique (organization_id, profile_id)
);

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  value jsonb not null default 'null'::jsonb,
  description text,
  base44_id text unique,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  archived_at timestamptz,
  unique (organization_id, key)
);

create table if not exists public.migration_batches (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'base44',
  label text not null,
  status text not null default 'pending',
  started_at timestamptz,
  finished_at timestamptz,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.migration_id_map (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.migration_batches(id) on delete cascade,
  source_entity text not null,
  source_id text not null,
  target_table text not null,
  target_id uuid not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (source_entity, source_id, target_table)
);

create index if not exists idx_org_memberships_profile on public.organization_memberships(profile_id);
create index if not exists idx_role_permissions_role on public.role_permissions(role_id);
create index if not exists idx_migration_id_map_source on public.migration_id_map(source_entity, source_id);
`);

fs.writeFileSync('supabase/migrations/202606180002_foundation_rls.sql', `alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.app_settings enable row level security;
alter table public.migration_batches enable row level security;
alter table public.migration_id_map enable row level security;

create or replace function public.is_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships om
    join public.profiles p on p.id = om.profile_id
    where om.organization_id = target_organization_id
      and om.profile_id = auth.uid()
      and om.archived_at is null
      and om.status = 'active'
      and p.is_active = true
      and p.archived_at is null
  );
$$;

create or replace function public.is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships om
    join public.roles r on r.id = om.role_id
    join public.profiles p on p.id = om.profile_id
    where om.organization_id = target_organization_id
      and om.profile_id = auth.uid()
      and om.archived_at is null
      and om.status = 'active'
      and p.is_active = true
      and p.archived_at is null
      and r.key in ('admin', 'supervisor')
  );
$$;

create policy organizations_select_member on public.organizations for select using (public.is_member(id));
create policy profiles_select_self on public.profiles for select using (id = auth.uid());
create policy memberships_select_member on public.organization_memberships for select using (public.is_member(organization_id));
create policy roles_select_member on public.roles for select using (organization_id is null or public.is_member(organization_id));
create policy permissions_select_authenticated on public.permissions for select using (auth.uid() is not null);
create policy role_permissions_select_member on public.role_permissions for select using (public.is_member(organization_id));
create policy app_settings_select_member on public.app_settings for select using (public.is_member(organization_id));

create policy roles_write_admin on public.roles for all using (organization_id is not null and public.is_org_admin(organization_id)) with check (organization_id is not null and public.is_org_admin(organization_id));
create policy role_permissions_write_admin on public.role_permissions for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy app_settings_write_admin on public.app_settings for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

-- Migration tables are intentionally service-role only. No anon/authenticated policies are created.
`);

fs.writeFileSync('src/lib/supabaseClient.js', `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your local .env file. Never use the service-role key in frontend code.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
`);

const serviceBodies = {
  authService: `import { supabase } from '@/lib/supabaseClient';

export const authService = {
  getSession: () => supabase.auth.getSession(),
  signOut: () => supabase.auth.signOut(),
};
`,
  attachmentService: `export const attachmentService = {
  listForRecord: (_record) => Promise.resolve([]),
  upload: (_file, _metadata) => Promise.reject(new Error('Supabase attachment migration is not wired yet.')),
};
`,
  notificationService: `export const notificationService = {
  list: () => Promise.resolve([]),
  markRead: (_id) => Promise.resolve(null),
};
`,
};

for (const name of ['supplierService', 'purchaseService', 'warehouseService', 'sampleService', 'processingService', 'outputService', 'exportService', 'bagService', 'materialService', 'userService']) {
  serviceBodies[name] = `export const ${name} = {
  list: () => Promise.resolve([]),
  get: (_id) => Promise.resolve(null),
  create: (_data) => Promise.reject(new Error('${name} is a migration placeholder and is not wired yet.')),
  update: (_id, _data) => Promise.reject(new Error('${name} is a migration placeholder and is not wired yet.')),
};
`;
}

for (const [name, body] of Object.entries(serviceBodies)) {
  fs.writeFileSync(`src/services/${name}.js`, body);
}

console.log(`Generated phase 1 foundation for ${entities.length} entities and ${dependencies.length} Base44 dependency files.`);

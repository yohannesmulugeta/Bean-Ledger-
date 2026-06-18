import fs from 'node:fs';
import path from 'node:path';
import {
  ensureDir,
  readEntitySchemas,
  walk,
  writeJson,
  writeText,
} from './base44-migration-utils.mjs';

const docsDir = 'docs/migration';
ensureDir(docsDir);

const schemas = readEntitySchemas();
const sourceFiles = [
  ...walk('src').filter((file) => /\.(jsx?|tsx?)$/i.test(file)),
  ...walk('base44/functions').filter((file) => /\.ts$/i.test(file)),
];

const listLimits = [];
const entityUsage = Object.fromEntries(schemas.map((schema) => [schema.name, {
  reads: [],
  writes: [],
  caps: new Set(),
}]));

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/base44\.entities\.([A-Za-z0-9_]+)\.(list|filter|get|create|update|delete|bulkCreate)\(([^)]*)\)/g)) {
    const [, entity, op, args] = match;
    if (!entityUsage[entity]) continue;
    if (['list', 'filter', 'get'].includes(op)) entityUsage[entity].reads.push(file.replaceAll('\\', '/'));
    if (['create', 'update', 'delete', 'bulkCreate'].includes(op)) entityUsage[entity].writes.push(file.replaceAll('\\', '/'));
    const numericArgs = [...args.matchAll(/\b(500|1000|2000|5000)\b/g)].map((m) => Number(m[1]));
    for (const cap of numericArgs) {
      entityUsage[entity].caps.add(cap);
      listLimits.push({ file: file.replaceAll('\\', '/'), entity, op, cap });
    }
  }
}

const entities = schemas.map((schema, index) => ({
  order: index + 1,
  entity: schema.name,
  schema_file: schema.file,
  expected_export_file: `${schema.name}.json`,
  required_fields: schema.required,
  field_count: schema.fields.length,
  read_surfaces: [...new Set(entityUsage[schema.name]?.reads || [])],
  write_surfaces: [...new Set(entityUsage[schema.name]?.writes || [])],
  known_list_caps: [...(entityUsage[schema.name]?.caps || [])].sort((a, b) => a - b),
  preserve_source_id: 'Store each Base44 id as source_id/base44_id in id maps and future Supabase rows.',
}));

const plan = {
  generated_at: new Date().toISOString(),
  mode: 'local-only',
  entity_count: entities.length,
  entities,
  list_limit_risks: listLimits,
  output_contract: {
    manual_drop_dir: 'exports/base44/manual-drop',
    generated_runs_dir: 'exports/base44/runs',
    normalized_entity_file: 'entities/<Entity>.json',
    id_map_file: 'id-map.json',
    attachment_index_file: 'attachment-index.json',
    reconciliation_json_file: 'reconciliation-report.json',
    reconciliation_markdown_file: 'reconciliation-report.md',
  },
};

writeJson('docs/migration/base44-export-plan.json', plan);

const markdown = `# Base44 Export and Reconciliation Plan

Generated on ${plan.generated_at}.

This is a local-only migration export foundation. It does not connect to Supabase, does not link a Supabase project, and does not call the Base44 API. It assumes the user manually places Base44 JSON exports into \`exports/base44/manual-drop/\`, then the local scripts normalize and reconcile them.

## Required export files

| # | Entity | Expected file | Required fields | Known list caps in app code | Risk |
| --- | --- | --- | --- | --- | --- |
${entities.map((item) => `| ${item.order} | \`${item.entity}\` | \`${item.expected_export_file}\` | ${item.required_fields.map((field) => `\`${field}\``).join(', ') || '-'} | ${item.known_list_caps.join(', ') || '-'} | ${item.known_list_caps.includes(5000) ? 'Existing UI/backup reads may stop at 5000 records.' : item.known_list_caps.length ? 'Existing UI reads are capped.' : '-'} |`).join('\n')}

## Local workflow

1. Run \`npm run migration:base44:prepare\`.
2. Export every Base44 entity as JSON from Base44 or from an approved offline backup source.
3. Put the files into \`exports/base44/manual-drop/\` using names like \`PurchaseRecord.json\`.
4. Run \`npm run migration:base44:package\`.
5. Run \`npm run migration:base44:reconcile\`.
6. Review the generated report under \`exports/base44/runs/<timestamp>/reconciliation-report.md\`.

## Truncation detection rules

- Any entity count exactly equal to \`500\`, \`1000\`, \`2000\`, or \`5000\` is flagged as a likely cap boundary.
- Any entity with app code using a fixed \`5000\` cap must be treated as incomplete unless the Base44 export source proves the total count is below the cap.
- Attachments are reconciled separately through the \`Attachment\` entity and any URL-like fields found in other entity exports.

## Source ID preservation

The package script writes \`id-map.json\` with:

- \`source_entity\`
- \`source_id\`
- \`record_hash\`
- \`normalized_file\`

Future Supabase import scripts must use this map and write \`base44_id\` into every migrated row.

## Current fixed-limit reads found

| File | Entity | Operation | Cap |
| --- | --- | --- | --- |
${listLimits.map((item) => `| \`${item.file}\` | \`${item.entity}\` | \`${item.op}\` | ${item.cap} |`).join('\n') || '| - | - | - | - |'}
`;

writeText('docs/migration/09-base44-export-and-reconciliation-plan.md', markdown);
console.log(`Wrote export plan for ${entities.length} entities to docs/migration/09-base44-export-and-reconciliation-plan.md`);

import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_RUNS_DIR,
  ensureDir,
  limitRisk,
  parseExportFile,
  readEntitySchemas,
  sourceIdFor,
  walk,
  writeJson,
  writeText,
} from './base44-migration-utils.mjs';

function latestRunDir() {
  const runs = fs.existsSync(DEFAULT_RUNS_DIR)
    ? fs.readdirSync(DEFAULT_RUNS_DIR, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => path.join(DEFAULT_RUNS_DIR, entry.name)).sort()
    : [];
  return runs.at(-1);
}

const runDir = process.env.BASE44_EXPORT_RUN_DIR || latestRunDir();
if (!runDir || !fs.existsSync(runDir)) {
  console.error('No export run found. Run npm run migration:base44:package first, or set BASE44_EXPORT_RUN_DIR.');
  process.exit(1);
}

const schemas = readEntitySchemas();
const manifestFile = path.join(runDir, 'manifest.json');
const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : null;
const entityDir = path.join(runDir, 'entities');
const attachmentIndexFile = path.join(runDir, 'attachment-index.json');
const attachmentIndex = fs.existsSync(attachmentIndexFile) ? JSON.parse(fs.readFileSync(attachmentIndexFile, 'utf8')) : [];

const report = {
  generated_at: new Date().toISOString(),
  run_dir: runDir,
  entity_count_expected: schemas.length,
  entities: [],
  totals: {
    records: 0,
    missing_entities: 0,
    duplicate_source_id_entities: 0,
    no_source_id_records: 0,
    truncation_warnings: 0,
    attachment_refs: attachmentIndex.length,
  },
  blockers: [],
  warnings: [],
};

for (const schema of schemas) {
  const file = path.join(entityDir, `${schema.name}.json`);
  if (!fs.existsSync(file)) {
    report.entities.push({
      entity: schema.name,
      status: 'missing',
      count: 0,
      required_field_missing_counts: {},
      source_id_missing_count: null,
      duplicate_source_ids: [],
      truncation_risk: 'Missing export file.',
    });
    report.totals.missing_entities += 1;
    report.blockers.push(`${schema.name}: missing export file`);
    continue;
  }

  const records = parseExportFile(file);
  const idCounts = new Map();
  const requiredMissing = Object.fromEntries(schema.required.map((field) => [field, 0]));
  let sourceIdMissing = 0;

  for (const record of records) {
    const sourceId = sourceIdFor(record);
    if (!sourceId) sourceIdMissing += 1;
    else idCounts.set(sourceId, (idCounts.get(sourceId) || 0) + 1);

    for (const field of schema.required) {
      if (record[field] === undefined || record[field] === null || record[field] === '') {
        requiredMissing[field] += 1;
      }
    }
  }

  const duplicateSourceIds = [...idCounts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
  const truncationRisk = limitRisk(records.length);

  if (duplicateSourceIds.length) {
    report.totals.duplicate_source_id_entities += 1;
    report.blockers.push(`${schema.name}: duplicate source ids found`);
  }
  if (sourceIdMissing) {
    report.totals.no_source_id_records += sourceIdMissing;
    report.warnings.push(`${schema.name}: ${sourceIdMissing} records missing Base44 source id`);
  }
  if (truncationRisk) {
    report.totals.truncation_warnings += 1;
    report.warnings.push(`${schema.name}: ${truncationRisk}`);
  }

  report.entities.push({
    entity: schema.name,
    status: 'present',
    count: records.length,
    required_field_missing_counts: requiredMissing,
    source_id_missing_count: sourceIdMissing,
    duplicate_source_ids: duplicateSourceIds,
    truncation_risk: truncationRisk || null,
  });
  report.totals.records += records.length;
}

const sourceFiles = walk('src').filter((file) => /\.(jsx?|tsx?)$/i.test(file));
const capRefs = [];
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/base44\.entities\.([A-Za-z0-9_]+)\.(list|filter)\(([^)]*)\)/g)) {
    const caps = [...match[3].matchAll(/\b(500|1000|2000|5000)\b/g)].map((m) => Number(m[1]));
    for (const cap of caps) capRefs.push({ file: file.replaceAll('\\', '/'), entity: match[1], operation: match[2], cap });
  }
}
report.fixed_limit_code_references = capRefs;

const attachmentByParent = {};
for (const ref of attachmentIndex) {
  const key = `${ref.parent_entity_type || ref.source_entity || 'unknown'}:${ref.parent_entity_id || ref.source_id || 'unknown'}`;
  attachmentByParent[key] = (attachmentByParent[key] || 0) + 1;
}
report.attachment_summary = {
  refs: attachmentIndex.length,
  unique_parent_refs: Object.keys(attachmentByParent).length,
  base44_hosted_refs: attachmentIndex.filter((ref) => /base44/i.test(ref.file_url || '')).length,
};

writeJson(path.join(runDir, 'reconciliation-report.json'), report);

const md = `# Base44 Export Reconciliation Report

Run directory: \`${runDir.replaceAll('\\', '/')}\`

Generated: ${report.generated_at}

## Summary

| Metric | Value |
| --- | ---: |
| Expected entities | ${report.entity_count_expected} |
| Present records | ${report.totals.records} |
| Missing entity exports | ${report.totals.missing_entities} |
| Entities with duplicate source IDs | ${report.totals.duplicate_source_id_entities} |
| Records missing source ID | ${report.totals.no_source_id_records} |
| Truncation warnings | ${report.totals.truncation_warnings} |
| Attachment references | ${report.totals.attachment_refs} |
| Unique attachment parent refs | ${report.attachment_summary.unique_parent_refs} |
| Base44-hosted attachment refs | ${report.attachment_summary.base44_hosted_refs} |

## Entity Counts

| Entity | Status | Count | Missing source IDs | Duplicate source IDs | Truncation risk |
| --- | --- | ---: | ---: | ---: | --- |
${report.entities.map((entity) => `| \`${entity.entity}\` | ${entity.status} | ${entity.count} | ${entity.source_id_missing_count ?? '-'} | ${entity.duplicate_source_ids.length} | ${entity.truncation_risk || '-'} |`).join('\n')}

## Required Field Gaps

| Entity | Missing required field counts |
| --- | --- |
${report.entities.map((entity) => `| \`${entity.entity}\` | ${Object.entries(entity.required_field_missing_counts || {}).filter(([, count]) => count > 0).map(([field, count]) => `\`${field}\`: ${count}`).join(', ') || '-'} |`).join('\n')}

## Blockers

${report.blockers.length ? report.blockers.map((item) => `- ${item}`).join('\n') : '- None detected by local reconciliation.'}

## Warnings

${report.warnings.length ? report.warnings.map((item) => `- ${item}`).join('\n') : '- None detected by local reconciliation.'}

## Fixed Limit Code References

| File | Entity | Operation | Cap |
| --- | --- | --- | ---: |
${capRefs.map((item) => `| \`${item.file}\` | \`${item.entity}\` | \`${item.operation}\` | ${item.cap} |`).join('\n') || '| - | - | - | - |'}

## Decision

Do not create operational Supabase tables or run data imports until every entity export is present, source IDs are preserved, duplicate IDs are resolved, and any cap-boundary counts are proven complete.
`;

writeText(path.join(runDir, 'reconciliation-report.md'), md);
ensureDir('docs/migration');
writeText('docs/migration/10-phase-2-export-reconciliation-summary.md', `# Phase 2 Export Reconciliation Summary

Latest run directory: \`${runDir.replaceAll('\\', '/')}\`

This summary points to the generated local reconciliation report:

- JSON: \`${path.join(runDir, 'reconciliation-report.json').replaceAll('\\', '/')}\`
- Markdown: \`${path.join(runDir, 'reconciliation-report.md').replaceAll('\\', '/')}\`

Do not commit files under \`exports/base44/runs/\`; they may contain customer data.
`);

console.log(`Wrote reconciliation report to ${path.join(runDir, 'reconciliation-report.md')}`);
if (report.blockers.length) {
  console.log(`Blockers: ${report.blockers.length}`);
}

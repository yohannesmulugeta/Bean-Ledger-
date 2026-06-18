import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_MANUAL_DROP_DIR,
  DEFAULT_RUNS_DIR,
  detectAttachmentRefs,
  ensureDir,
  findExportFileForEntity,
  inspectExportFile,
  parseExportFile,
  readEntitySchemas,
  sourceIdFor,
  stableRecordHash,
  writeJson,
  writeText,
} from './base44-migration-utils.mjs';

const inputDir = process.env.BASE44_EXPORT_INPUT_DIR || DEFAULT_MANUAL_DROP_DIR;
const runId = process.env.BASE44_EXPORT_RUN_ID || new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = process.env.BASE44_EXPORT_OUTPUT_DIR || path.join(DEFAULT_RUNS_DIR, runId);
const entitiesDir = path.join(outputDir, 'entities');

ensureDir(entitiesDir);

const schemas = readEntitySchemas();
const manifest = {
  run_id: runId,
  generated_at: new Date().toISOString(),
  mode: 'local-only-normalization',
  input_dir: inputDir,
  output_dir: outputDir,
  entity_count_expected: schemas.length,
  entities: [],
};
const idMap = [];
const attachmentIndex = [];
const missing = [];

for (const schema of schemas) {
  const sourceFile = findExportFileForEntity(inputDir, schema.name);
  if (!sourceFile) {
    missing.push(schema.name);
    manifest.entities.push({
      entity: schema.name,
      status: 'missing',
      source_file: null,
      normalized_file: null,
      count: 0,
    });
    continue;
  }

  const fileInfo = inspectExportFile(sourceFile);
  if (fileInfo.parse_error) {
    manifest.entities.push({
      entity: schema.name,
      status: 'parse_error',
      source_file: sourceFile.replaceAll('\\', '/'),
      normalized_file: null,
      count: 0,
      format: fileInfo.format,
      parse_error: fileInfo.parse_error,
    });
    continue;
  }

  const records = parseExportFile(sourceFile);
  const normalizedFile = path.join(entitiesDir, `${schema.name}.json`);
  writeJson(normalizedFile, records);

  const ids = new Set();
  const duplicateIds = new Set();
  for (const record of records) {
    const sourceId = sourceIdFor(record);
    if (sourceId) {
      if (ids.has(sourceId)) duplicateIds.add(sourceId);
      ids.add(sourceId);
    }
    idMap.push({
      source_entity: schema.name,
      source_id: sourceId,
      record_hash: stableRecordHash(record),
      normalized_file: `entities/${schema.name}.json`,
    });
  }

  attachmentIndex.push(...detectAttachmentRefs(records, schema.name));

  manifest.entities.push({
    entity: schema.name,
    status: 'packaged',
    source_file: sourceFile.replaceAll('\\', '/'),
    normalized_file: `entities/${schema.name}.json`,
    format: fileInfo.format,
    container: fileInfo.container,
    count: records.length,
    source_ids_present: records.filter((record) => sourceIdFor(record)).length,
    duplicate_source_ids: [...duplicateIds],
    sha256: stableRecordHash(records),
  });
}

manifest.missing_entities = missing;
manifest.total_records = manifest.entities.reduce((sum, entity) => sum + entity.count, 0);
manifest.attachment_refs = attachmentIndex.length;

writeJson(path.join(outputDir, 'manifest.json'), manifest);
writeJson(path.join(outputDir, 'id-map.json'), idMap);
writeJson(path.join(outputDir, 'attachment-index.json'), attachmentIndex);
writeText(path.join(outputDir, 'README.md'), `# Base44 Export Run ${runId}

This is a local-only normalized export package.

- \`manifest.json\`: entity counts, file status, hashes, missing entities.
- \`entities/*.json\`: normalized entity exports.
- \`id-map.json\`: Base44 source ID preservation map.
- \`attachment-index.json\`: attachment metadata and URL references.

Run reconciliation:

\`\`\`powershell
$env:BASE44_EXPORT_RUN_DIR='${outputDir.replaceAll('\\', '\\\\')}'
npm run migration:base44:reconcile
\`\`\`
`);

console.log(`Packaged ${manifest.total_records} records into ${outputDir}`);
if (missing.length) {
  console.log(`Missing entity exports: ${missing.join(', ')}`);
}

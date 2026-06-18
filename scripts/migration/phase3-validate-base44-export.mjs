import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_MANUAL_DROP_DIR,
  DEFAULT_RUNS_DIR,
  detectAttachmentRefs,
  ensureDir,
  findExportFilesForEntity,
  inspectExportFile,
  limitRisk,
  parseExportFile,
  readEntitySchemas,
  sourceIdFor,
  stableRecordHash,
  walk,
  writeJson,
  writeText,
} from './base44-migration-utils.mjs';

const GENERATED_AT = new Date().toISOString();
const MONEY_RE = /^-?\d+(\.\d+)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}/;
const CAP_COUNTS = new Set([500, 1000, 2000, 5000]);

const inputDir = process.env.BASE44_EXPORT_INPUT_DIR || DEFAULT_MANUAL_DROP_DIR;
const runDir = process.env.BASE44_EXPORT_RUN_DIR || latestRunDir();
const cleanedDir = runDir ? path.join(runDir, 'cleaned-staging') : null;
const schemas = readEntitySchemas();
const schemaByName = Object.fromEntries(schemas.map((schema) => [schema.name, schema]));
const runManifest = readJsonIfExists(runDir ? path.join(runDir, 'manifest.json') : null);
const runReconciliation = readJsonIfExists(runDir ? path.join(runDir, 'reconciliation-report.json') : null);

const inventory = [];
const entityRecords = {};
const parseErrors = [];
const decisionRows = [];
const orphanRows = [];
const businessRows = [];
const jsonRows = [];
const attachmentRows = [];

ensureDir('docs/migration');
if (cleanedDir) ensureDir(cleanedDir);

for (const schema of schemas) {
  const files = findExportFilesForEntity(inputDir, schema.name);
  const chosenFile = files[0] || null;
  const duplicates = files.slice(1);
  const fileInfo = chosenFile ? inspectExportFile(chosenFile) : null;
  let records = [];
  let status = 'BLOCKED_MISSING_EXPORT';

  if (!chosenFile) {
    decisionRows.push(decision(`MISSING_${schema.name}`, schema.name, 'Missing entity export file', 0, 'critical', `Provide ${schema.name}.json, ${schema.name}.jsonl, or ${schema.name}.csv from the approved Base44 export.`, true));
  } else if (fileInfo.parse_error) {
    status = 'BLOCKED_INVALID_DATA';
    parseErrors.push({ entity: schema.name, file: chosenFile, error: fileInfo.parse_error });
    decisionRows.push(decision(`PARSE_${schema.name}`, schema.name, fileInfo.parse_error, 0, 'critical', 'Fix or re-export the source file without editing values silently.', true));
  } else {
    records = parseExportFile(chosenFile);
    entityRecords[schema.name] = records;
    const duplicateIds = duplicateIdsFor(records);
    const missingParents = [];
    const malformedJson = analyzeJsonFields(schema, records);
    const requiredMissing = missingRequiredCount(schema, records);
    const truncation = limitRisk(records.length);
    const legacy = legacyClassification(schema.name);

    if (duplicates.length) {
      decisionRows.push(decision(`MULTIPLE_${schema.name}`, schema.name, `Multiple possible exports found: ${files.map((file) => path.basename(file)).join(', ')}`, records.length, 'high', 'Choose the authoritative export file before migration.', true));
    }
    if (duplicateIds.length) {
      decisionRows.push(decision(`DUP_ID_${schema.name}`, schema.name, 'Duplicate Base44 source IDs found', duplicateIds.length, 'critical', 'Resolve duplicate source IDs before import; do not merge automatically.', true));
    }
    if (truncation) {
      decisionRows.push(decision(`TRUNC_${schema.name}`, schema.name, truncation, records.length, 'high', 'Verify total count from Base44 admin/export source before treating export as complete.', true));
    }
    if (requiredMissing.total > 0) {
      decisionRows.push(decision(`REQ_${schema.name}`, schema.name, 'Required fields are missing', requiredMissing.total, 'high', 'Document whether missing values are valid legacy blanks or require source cleanup.', true));
    }
    if (malformedJson.invalidTotal > 0) {
      decisionRows.push(decision(`JSON_${schema.name}`, schema.name, 'Serialized JSON fields contain invalid JSON', malformedJson.invalidTotal, 'high', 'Re-export or document field-level transformation before import.', true));
    }

    status = readinessForEntity({
      legacy,
      duplicateIds,
      truncation,
      requiredMissing,
      malformedJson,
      missingParents,
    });

    for (const item of malformedJson.rows) jsonRows.push(item);
    attachmentRows.push(...detectAttachmentRefs(records, schema.name).map((ref) => attachmentRow(ref)));

    if (cleanedDir && !fileInfo.parse_error) {
      writeJson(path.join(cleanedDir, `${schema.name}.json`), records.map((record) => ({
        base44_id: sourceIdFor(record),
        source_entity: schema.name,
        original_created_date: record.created_date ?? record.created_at ?? null,
        original_updated_date: record.updated_date ?? record.updated_at ?? null,
        archived: record.archived ?? false,
        raw_record_hash: stableRecordHash(record),
        raw_record: record,
        transformations: fileInfo.format === 'csv'
          ? ['parsed CSV with all values preserved as strings']
          : ['normalized export wrapper/format to JSON array without value changes'],
      })));
    }
  }

  const recordsForStats = records || [];
  inventory.push({
    entity: schema.name,
    export_filename: chosenFile ? path.basename(chosenFile) : '',
    format: fileInfo?.format || '',
    container: fileInfo?.container || '',
    file_count: files.length,
    duplicate_export_files: duplicates.map((file) => path.basename(file)),
    row_count: recordsForStats.length,
    unique_base44_id_count: uniqueIdsFor(recordsForStats).size,
    duplicate_id_count: duplicateIdsFor(recordsForStats).length,
    earliest_created_date: dateRange(recordsForStats).earliest,
    latest_created_date: dateRange(recordsForStats).latest,
    archived_record_count: recordsForStats.filter((record) => record.archived === true || record.archived === 'true').length,
    records_missing_ids: recordsForStats.filter((record) => !sourceIdFor(record)).length,
    records_missing_required_fields: missingRequiredCount(schema, recordsForStats).total,
    records_with_malformed_json_fields: analyzeJsonFields(schema, recordsForStats).invalidTotal,
    referenced_parent_entities: relationshipRulesFor(schema.name).map((rule) => rule.parent).join(', '),
    missing_parent_references: 0,
    attachment_field_count: detectAttachmentRefs(recordsForStats, schema.name).length,
    legacy_duplicate_entity_classification: legacyClassification(schema.name),
    possible_truncation: recordsForStats.length ? limitRisk(recordsForStats.length) : '',
    parse_error: fileInfo?.parse_error || '',
    migration_readiness_status: status,
  });
}

validateRelationships();
validateBusinessData();
writeReports();

function latestRunDir() {
  const runs = fs.existsSync(DEFAULT_RUNS_DIR)
    ? fs.readdirSync(DEFAULT_RUNS_DIR, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => path.join(DEFAULT_RUNS_DIR, entry.name)).sort()
    : [];
  return runs.at(-1) || null;
}

function readJsonIfExists(file) {
  if (!file || !fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function duplicateIdsFor(records) {
  const counts = new Map();
  for (const record of records) {
    const id = sourceIdFor(record);
    if (!id) continue;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
}

function uniqueIdsFor(records) {
  return new Set(records.map((record) => sourceIdFor(record)).filter(Boolean));
}

function dateRange(records) {
  const values = records
    .flatMap((record) => [record.created_date, record.created_at])
    .filter((value) => typeof value === 'string' && DATE_RE.test(value))
    .sort();
  return { earliest: values[0] || '', latest: values.at(-1) || '' };
}

function missingRequiredCount(schema, records) {
  let total = 0;
  const fields = {};
  for (const field of schema.required) fields[field] = 0;
  for (const record of records) {
    for (const field of schema.required) {
      if (record[field] === undefined || record[field] === null || record[field] === '') {
        fields[field] += 1;
        total += 1;
      }
    }
  }
  return { total, fields };
}

function jsonCandidateFields(schema) {
  return schema.fields.filter((field) => field.type === 'string' && /json|array|object|rows|history|inputs|values|paths|permissions|changes|impact|disabled_types/i.test(`${field.name} ${field.description}`));
}

function analyzeJsonFields(schema, records) {
  const rows = [];
  let invalidTotal = 0;
  for (const field of jsonCandidateFields(schema)) {
    let used = 0;
    let valid = 0;
    let invalid = 0;
    let shape = '';
    for (const record of records) {
      const value = record[field.name];
      if (typeof value !== 'string' || value.trim() === '') continue;
      used += 1;
      try {
        const parsed = JSON.parse(value);
        valid += 1;
        if (!shape) shape = structuralShape(parsed);
      } catch {
        invalid += 1;
      }
    }
    invalidTotal += invalid;
    if (used || field.description) {
      rows.push({
        entity: schema.name,
        field: field.name,
        records_using_it: used,
        valid_json_count: valid,
        invalid_json_count: invalid,
        example_structural_shape: shape || 'not observed in available exports',
        proposed_child_table: proposedChildTable(schema.name, field.name),
        transformation_risks: invalid ? 'Invalid JSON blocks automated normalization.' : 'Preserve array order and source row identity during normalization.',
      });
    }
  }
  return { rows, invalidTotal };
}

function structuralShape(value) {
  if (Array.isArray(value)) {
    const first = value[0];
    if (!first) return 'array(empty)';
    if (typeof first === 'object') return `array<object keys: ${Object.keys(first).slice(0, 8).join(', ')}>`;
    return `array<${typeof first}>`;
  }
  if (value && typeof value === 'object') return `object keys: ${Object.keys(value).slice(0, 8).join(', ')}`;
  return typeof value;
}

function proposedChildTable(entity, field) {
  const snakeEntity = entity.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  return `${snakeEntity}_${field.replace(/_?(json|data)$/i, '').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`;
}

function legacyClassification(entity) {
  const map = {
    Purchase: 'LEGACY_REVIEW_REQUIRED: overlaps PurchaseRecord',
    ProcessingBatch: 'LEGACY_REVIEW_REQUIRED: overlaps ProcessingLog',
    Export: 'LEGACY_REVIEW_REQUIRED: overlaps ExportContract',
    MaterialEntry: 'LEGACY_REVIEW_REQUIRED: overlaps MaterialRegisterEntry',
    UserActivityLog: 'LEGACY_REVIEW_REQUIRED: overlaps ActivityLog',
    WarehouseInventory: 'LEGACY_REVIEW_REQUIRED: may conflict with calculated stock workflows',
  };
  return map[entity] || '';
}

function readinessForEntity({ legacy, duplicateIds, truncation, requiredMissing, malformedJson, missingParents }) {
  if (legacy) return 'LEGACY_REVIEW_REQUIRED';
  if (duplicateIds.length || requiredMissing.total || malformedJson.invalidTotal) return 'BLOCKED_INVALID_DATA';
  if (missingParents.length) return 'BLOCKED_UNRESOLVED_RELATIONSHIP';
  if (truncation) return 'READY_WITH_TRANSFORMATION';
  return 'READY';
}

function relationshipRulesFor(entity) {
  const rules = {
    WarehouseReceipt: [{ field: 'purchase_record_id', parent: 'PurchaseRecord', parentField: 'id' }, { field: 'coffee_code', parent: 'PurchaseRecord', parentField: 'coffee_code', severity: 'medium' }],
    SampleLog: [{ field: 'warehouse_receipt_id', parent: 'WarehouseReceipt', parentField: 'id' }, { field: 'export_contract_id', parent: 'ExportContract', parentField: 'id' }, { field: 'inspection_ref', parent: 'BuyerInspection', parentField: 'id' }],
    ProcessingLog: [{ field: 'coffee_code', parent: 'WarehouseReceipt', parentField: 'coffee_code', severity: 'medium' }],
    OutputReport: [{ field: 'processing_log_id', parent: 'ProcessingLog', parentField: 'id' }, { field: 'inspection_ref', parent: 'BuyerInspection', parentField: 'id' }],
    ExportContract: [{ field: 'linked_contract_id', parent: 'BuyerInspection', parentField: 'linked_contract_id', severity: 'low' }],
    Attachment: [{ field: 'entity_id', parent: 'polymorphic', parentField: 'id' }],
    WarehouseReceiptHistory: [{ field: 'receipt_id', parent: 'WarehouseReceipt', parentField: 'id' }],
  };
  return rules[entity] || [];
}

function validateRelationships() {
  const indexes = {};
  for (const [entity, records] of Object.entries(entityRecords)) {
    indexes[entity] = {};
    indexes[entity].id = uniqueIdsFor(records);
    for (const record of records) {
      for (const [field, value] of Object.entries(record)) {
        if (value !== undefined && value !== null && value !== '') {
          indexes[entity][field] ||= new Set();
          indexes[entity][field].add(String(value));
        }
      }
    }
  }

  for (const [entity, records] of Object.entries(entityRecords)) {
    for (const rule of relationshipRulesFor(entity)) {
      for (const record of records) {
        const value = record[rule.field];
        if (!value) continue;
        if (rule.parent === 'polymorphic') {
          const parentEntity = attachmentParentEntity(record.entity_type);
          const found = parentEntity && indexes[parentEntity]?.id?.has(String(value));
          if (!found) orphanRows.push(orphan(entity, sourceIdFor(record), parentEntity || record.entity_type || 'unknown', value, 'Confirm parent export and entity_type mapping before attachment migration.', rule.severity || 'high'));
          continue;
        }
        const found = indexes[rule.parent]?.[rule.parentField]?.has(String(value));
        if (!found) orphanRows.push(orphan(entity, sourceIdFor(record), rule.parent, value, `Preserve record, then resolve missing ${rule.parent} reference before import.`, rule.severity || 'high'));
      }
    }
  }

  const byEntity = Map.groupBy ? Map.groupBy(orphanRows, (row) => row.entity) : null;
  if (byEntity) {
    for (const [entity, rows] of byEntity.entries()) {
      decisionRows.push(decision(`ORPHAN_${entity}`, entity, 'Missing parent references found', rows.length, 'high', 'Do not discard orphan records; document source correction or import as unresolved legacy references.', true));
    }
  } else {
    const counts = {};
    for (const row of orphanRows) counts[row.entity] = (counts[row.entity] || 0) + 1;
    for (const [entity, count] of Object.entries(counts)) decisionRows.push(decision(`ORPHAN_${entity}`, entity, 'Missing parent references found', count, 'high', 'Do not discard orphan records; document source correction or import as unresolved legacy references.', true));
  }
}

function attachmentParentEntity(type) {
  const map = {
    purchase_record: 'PurchaseRecord',
    warehouse_receipt: 'WarehouseReceipt',
    export_contract: 'ExportContract',
  };
  return map[type] || null;
}

function validateBusinessData() {
  for (const [entity, records] of Object.entries(entityRecords)) {
    const schema = schemaByName[entity];
    if (!schema) continue;
    for (const record of records) {
      const recordId = sourceIdFor(record);
      for (const field of schema.fields) {
        const value = record[field.name];
        if (value === undefined || value === null || value === '') continue;
        const fieldText = field.name.toLowerCase();
        const isMoney = /(etb|usd|price|cost|payment|paid|balance|commission|revenue|profit|rate|amount|value|sales|expenses|charges|fee|income)/i.test(field.name);
        const isWeight = /(kg|bag|bags|quantity|lb|feresula|stock|sample|waste|reject|export)/i.test(field.name);
        const isPercent = /(percent|pct|percentage)/i.test(field.name);
        const isDate = field.format === 'date' || /(date|_at|datetime)/i.test(field.name);
        if ((isMoney || isWeight || isPercent) && !MONEY_RE.test(String(value))) {
          businessRows.push(businessIssue(entity, recordId, field.name, value, isMoney ? 'invalid monetary value' : isPercent ? 'invalid percentage value' : 'invalid weight/quantity value', 'high'));
        }
        if (isDate && !DATE_RE.test(String(value))) {
          businessRows.push(businessIssue(entity, recordId, field.name, value, 'invalid date value', 'medium'));
        }
        if ((isMoney || isWeight) && MONEY_RE.test(String(value)) && Number(value) < 0 && !/(balance|profit|waste|adjustment|variance|difference)/i.test(fieldText)) {
          businessRows.push(businessIssue(entity, recordId, field.name, value, 'unexpected negative value', 'medium'));
        }
      }
    }
  }

  duplicateBusinessKey('PurchaseRecord', 'coffee_code', 'Duplicate coffee codes');
  duplicateBusinessKey('ExportContract', 'contract_no', 'Duplicate contract numbers');
  duplicateBusinessKey('SupplierBagPayment', 'reference_no', 'Duplicate supplier bag payment references');
}

function duplicateBusinessKey(entity, field, label) {
  const records = entityRecords[entity] || [];
  const counts = new Map();
  for (const record of records) {
    if (!record[field]) continue;
    counts.set(record[field], (counts.get(record[field]) || 0) + 1);
  }
  const dupCount = [...counts.values()].filter((count) => count > 1).length;
  if (dupCount) {
    businessRows.push(businessIssue(entity, '', field, '', label, 'high', dupCount));
    decisionRows.push(decision(`DUP_${entity}_${field}`, entity, label, dupCount, 'high', 'Review duplicates against source before import; do not merge automatically.', true));
  }
}

function attachmentRow(ref) {
  const fileName = ref.file_name || safeBasename(ref.file_url);
  return {
    entity: ref.source_entity,
    source_record_id: ref.source_id || '',
    attachment_field: ref.section || '',
    original_filename: fileName,
    original_base44_url_or_reference: ref.file_url || '',
    file_type: fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '',
    local_file_available: false,
    proposed_supabase_bucket: 'erp-attachments',
    proposed_storage_path: `${ref.parent_entity_type || ref.source_entity}/${ref.parent_entity_id || ref.source_id || 'unknown'}/${fileName || 'unnamed'}`,
    migration_status: 'PENDING_FILE_EXPORT',
  };
}

function safeBasename(url) {
  try {
    return path.basename(new URL(url).pathname);
  } catch {
    return '';
  }
}

function decision(id, entity, problem, count, severity, action, approval, status = 'open') {
  return {
    decision_id: id,
    entity,
    problem,
    record_count_affected: count,
    severity,
    recommended_action: action,
    user_approval_required: approval,
    status,
  };
}

function orphan(entity, recordId, referencedEntity, missingId, action, severity) {
  return {
    entity,
    record_id: recordId || '',
    referenced_entity: referencedEntity,
    missing_referenced_id: missingId,
    recommended_resolution: action,
    severity,
  };
}

function businessIssue(entity, recordId, field, value, problem, severity, count = 1) {
  return { entity, record_id: recordId || '', field, value: value === undefined ? '' : String(value), problem, severity, count };
}

function writeReports() {
  const foundEntities = inventory.filter((row) => row.export_filename).length;
  const totalRecords = inventory.reduce((sum, row) => sum + row.row_count, 0);
  const missingEntities = inventory.filter((row) => row.migration_readiness_status === 'BLOCKED_MISSING_EXPORT').map((row) => row.entity);
  const duplicateIdCount = inventory.reduce((sum, row) => sum + row.duplicate_id_count, 0);
  const truncationWarnings = inventory.filter((row) => row.possible_truncation);
  const blockers = decisionRows.filter((row) => ['critical', 'high'].includes(row.severity));
  const readiness = determineReadiness({ missingEntities, blockers, truncationWarnings, duplicateIdCount, orphanRows, businessRows });

  writeJson('docs/migration/phase3-validation-summary.json', {
    generated_at: GENERATED_AT,
    readiness,
    found_entities: foundEntities,
    expected_entities: schemas.length,
    total_records: totalRecords,
    missing_entities: missingEntities,
    blockers: blockers.length,
    truncation_warnings: truncationWarnings.length,
    duplicate_ids: duplicateIdCount,
    orphan_relationships: orphanRows.length,
    business_issues: businessRows.length,
    run_dir: runDir,
  });

  writeMarkdownTable('docs/migration/11-base44-export-inventory.md', 'Base44 Export Inventory', [
    'Generated locally on ' + GENERATED_AT,
    `Manual drop folder: \`${inputDir}\``,
    `Latest run folder: \`${runDir || 'none'}\``,
    'CSV parsing assumption: when CSV files are supplied, values are preserved as strings and no numeric conversion is performed during packaging.',
  ], inventory, [
    ['Entity', 'entity'],
    ['File', 'export_filename'],
    ['Format', 'format'],
    ['Rows', 'row_count'],
    ['Unique IDs', 'unique_base44_id_count'],
    ['Duplicate IDs', 'duplicate_id_count'],
    ['Earliest Created', 'earliest_created_date'],
    ['Latest Created', 'latest_created_date'],
    ['Archived', 'archived_record_count'],
    ['Missing IDs', 'records_missing_ids'],
    ['Missing Required', 'records_missing_required_fields'],
    ['Malformed JSON', 'records_with_malformed_json_fields'],
    ['Parents', 'referenced_parent_entities'],
    ['Attachment Refs', 'attachment_field_count'],
    ['Legacy Class', 'legacy_duplicate_entity_classification'],
    ['Status', 'migration_readiness_status'],
  ]);

  writeMarkdownTable('docs/migration/11-attachment-migration-register.md', 'Attachment Migration Register', [
    'No files were downloaded. Local file availability is false unless a file is manually provided later.',
  ], attachmentRows, [
    ['Entity', 'entity'],
    ['Source Record ID', 'source_record_id'],
    ['Attachment Field', 'attachment_field'],
    ['Original Filename', 'original_filename'],
    ['Original URL or Reference', 'original_base44_url_or_reference'],
    ['File Type', 'file_type'],
    ['Local File Available', 'local_file_available'],
    ['Bucket', 'proposed_supabase_bucket'],
    ['Storage Path', 'proposed_storage_path'],
    ['Status', 'migration_status'],
  ]);

  writeMarkdownTable('docs/migration/12-data-quality-report.md', 'Data Quality Report', [
    `Total records analyzed: ${totalRecords}`,
    `Parse errors: ${parseErrors.length}`,
    'Required-field gaps, malformed JSON fields, duplicate IDs, and truncation warnings are summarized per entity in the inventory.',
  ], [
    ...inventory.map((row) => ({
      entity: row.entity,
      rows: row.row_count,
      parse_error: row.parse_error,
      missing_ids: row.records_missing_ids,
      duplicate_ids: row.duplicate_id_count,
      missing_required: row.records_missing_required_fields,
      malformed_json: row.records_with_malformed_json_fields,
      truncation: row.possible_truncation,
      status: row.migration_readiness_status,
    })),
  ], [
    ['Entity', 'entity'],
    ['Rows', 'rows'],
    ['Parse Error', 'parse_error'],
    ['Missing IDs', 'missing_ids'],
    ['Duplicate IDs', 'duplicate_ids'],
    ['Missing Required', 'missing_required'],
    ['Malformed JSON', 'malformed_json'],
    ['Truncation', 'truncation'],
    ['Status', 'status'],
  ], 'No export rows were available to validate.');

  writeMarkdownTable('docs/migration/13-relationship-validation-report.md', 'Relationship Validation Report', [
    'Orphan records are reported but never discarded.',
  ], orphanRows, [
    ['Entity', 'entity'],
    ['Record ID', 'record_id'],
    ['Referenced Entity', 'referenced_entity'],
    ['Missing Referenced ID', 'missing_referenced_id'],
    ['Recommended Resolution', 'recommended_resolution'],
    ['Severity', 'severity'],
  ], 'No relationship checks could run because entity exports are missing.');

  writeMarkdownTable('docs/migration/14-business-reconciliation-report.md', 'Business Reconciliation Report', [
    'Known constants preserved for validation: 1 feresula = 17 KG; standard/reject bag = 85 KG; export bag = 60 KG; 1 KG = 2.2046 LB; payment-balance tolerance approximately +/-1 ETB.',
    'Source values are not recalculated or overwritten. Differences are reported only.',
  ], businessRows, [
    ['Entity', 'entity'],
    ['Record ID', 'record_id'],
    ['Field', 'field'],
    ['Value', 'value'],
    ['Problem', 'problem'],
    ['Severity', 'severity'],
    ['Count', 'count'],
  ], 'No business rows were available to reconcile because entity exports are missing.');

  writeMarkdownTable('docs/migration/15-phase-3-decision-register.md', 'Phase 3 Decision Register', [
    `Readiness result: ${readiness}`,
  ], decisionRows, [
    ['Decision ID', 'decision_id'],
    ['Entity', 'entity'],
    ['Problem', 'problem'],
    ['Affected Records', 'record_count_affected'],
    ['Severity', 'severity'],
    ['Recommended Action', 'recommended_action'],
    ['User Approval Required', 'user_approval_required'],
    ['Status', 'status'],
  ]);

  const commands = [
    'npm run migration:base44:prepare',
    'npm run migration:base44:package',
    'npm run migration:base44:reconcile',
    'npm run migration:base44:phase3',
  ];

  writeText('docs/migration/PHASE_3_REPORT.md', `# Phase 3 Report

Generated locally on ${GENERATED_AT}.

## Readiness result

${readiness}

The project is not ready for operational Supabase schema implementation because ${missingEntities.length} of ${schemas.length} required Base44 entity exports are missing from \`${inputDir}\`.

## Summary

| Metric | Value |
| --- | ---: |
| Entities found | ${foundEntities} / ${schemas.length} |
| Total records analyzed | ${totalRecords} |
| Missing entities | ${missingEntities.length} |
| Blocker decisions | ${blockers.length} |
| Truncation warnings | ${truncationWarnings.length} |
| Duplicate source IDs | ${duplicateIdCount} |
| Orphan relationships | ${orphanRows.length} |
| Financial or stock discrepancies | ${businessRows.length} |
| Attachment references | ${attachmentRows.length} |

## Missing entities

${missingEntities.map((entity) => `- ${entity}`).join('\n') || '- None'}

## Commands executed

${commands.map((command) => `- \`${command}\``).join('\n')}

## Files created or modified

- \`docs/migration/11-base44-export-inventory.md\`
- \`docs/migration/11-attachment-migration-register.md\`
- \`docs/migration/12-data-quality-report.md\`
- \`docs/migration/13-relationship-validation-report.md\`
- \`docs/migration/14-business-reconciliation-report.md\`
- \`docs/migration/15-phase-3-decision-register.md\`
- \`docs/migration/PHASE_3_REPORT.md\`
- \`docs/migration/phase3-validation-summary.json\`
- \`scripts/migration/base44-migration-utils.mjs\`
- \`scripts/migration/package-base44-export.mjs\`
- \`scripts/migration/reconcile-base44-export.mjs\`
- \`scripts/migration/phase3-validate-base44-export.mjs\`
- \`package.json\`

## Final decision

Do not create operational Supabase tables, run Supabase imports, deploy, or cut over. First place complete Base44 exports in \`exports/base44/manual-drop/\`, rerun the package/reconcile/phase3 scripts, and resolve all open decisions.

## Recommended Phase 4 prompt

\`\`\`text
Continue with Phase 4 only after all 29 Base44 entity exports are present and Phase 3 no longer reports missing exports. Rerun the Phase 3 validation, review every open decision, and create only the first operational Supabase schema migration for entities whose exports are READY or have approved transformations. Do not import data or connect to production Supabase.
\`\`\`
`);

  console.log(`Phase 3 readiness: ${readiness}`);
  console.log(`Entities found: ${foundEntities}/${schemas.length}`);
  console.log(`Records analyzed: ${totalRecords}`);
}

function determineReadiness({ missingEntities, blockers: blockerRows, truncationWarnings, duplicateIdCount, orphanRows: orphans }) {
  if (missingEntities.length || duplicateIdCount || orphans.some((row) => row.severity === 'high') || truncationWarnings.length || blockerRows.some((row) => row.severity === 'critical')) {
    return 'C. NOT READY';
  }
  if (blockerRows.length) return 'B. CONDITIONALLY READY';
  return 'A. READY FOR SCHEMA IMPLEMENTATION';
}

function writeMarkdownTable(file, title, notes, rows, columns, emptyText = 'No rows.') {
  const lines = [`# ${title}`, '', ...notes.map((note) => `${note}\n`), ''];
  if (!rows.length) {
    lines.push(emptyText, '');
  } else {
    lines.push(`| ${columns.map(([label]) => label).join(' | ')} |`);
    lines.push(`| ${columns.map(() => '---').join(' | ')} |`);
    for (const row of rows) {
      lines.push(`| ${columns.map(([, key]) => md(row[key])).join(' | ')} |`);
    }
    lines.push('');
  }
  writeText(file, lines.join('\n'));
}

function md(value) {
  if (value === undefined || value === null || value === '') return '-';
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

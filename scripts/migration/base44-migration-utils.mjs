import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const ENTITY_DIR = 'base44/entities';
export const DEFAULT_MANUAL_DROP_DIR = 'exports/base44/manual-drop';
export const DEFAULT_RUNS_DIR = 'exports/base44/runs';

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

export function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

export function writeText(file, text) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, text);
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function stripJsonc(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '');
}

export function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

export function readEntitySchemas() {
  return walk(ENTITY_DIR)
    .filter((file) => file.endsWith('.jsonc'))
    .sort()
    .map((file) => {
      const schema = JSON.parse(stripJsonc(readText(file)));
      const required = schema.required || [];
      const fields = Object.entries(schema.properties || {}).map(([name, spec]) => ({
        name,
        type: spec.type || 'unknown',
        format: spec.format || null,
        enum: spec.enum || null,
        required: required.includes(name),
        description: spec.description || '',
      }));
      return {
        name: schema.name,
        file: file.replaceAll('\\', '/'),
        required,
        fields,
      };
    });
}

export function parseJsonExportFile(file) {
  const text = readText(file).trim();
  if (!text) return [];

  if (file.endsWith('.jsonl')) {
    return text
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.records)) return parsed.records;
  if (Array.isArray(parsed.data)) return parsed.data;
  if (Array.isArray(parsed.items)) return parsed.items;
  if (parsed && typeof parsed === 'object') return [parsed];
  return [];
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes && char === '"' && next === '"') {
      field += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && char === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += char;
  }

  row.push(field);
  rows.push(row);

  const nonEmptyRows = rows.filter((item) => item.some((value) => value !== ''));
  if (!nonEmptyRows.length) return [];

  const headers = nonEmptyRows[0].map((header) => header.trim());
  return nonEmptyRows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

export function inspectExportFile(file) {
  const ext = path.extname(file).toLowerCase();
  const bytes = fs.statSync(file).size;
  const text = readText(file);
  const trimmed = text.trim();
  const info = {
    file,
    format: ext === '.csv' ? 'csv' : ext === '.jsonl' ? 'jsonl' : ext === '.json' ? 'json' : ext.replace('.', '') || 'unknown',
    bytes,
    empty: trimmed.length === 0,
    container: null,
    parse_error: null,
    record_count: 0,
  };

  if (info.empty) return info;

  try {
    if (ext === '.csv') {
      info.container = 'csv_header_rows';
      info.record_count = parseCsv(text).length;
    } else if (ext === '.jsonl') {
      info.container = 'jsonl_lines';
      info.record_count = parseJsonExportFile(file).length;
    } else if (ext === '.json') {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) info.container = 'array';
      else if (Array.isArray(parsed?.records)) info.container = 'records_wrapper';
      else if (Array.isArray(parsed?.data)) info.container = 'data_wrapper';
      else if (Array.isArray(parsed?.items)) info.container = 'items_wrapper';
      else if (parsed && typeof parsed === 'object') info.container = 'single_object';
      else info.container = typeof parsed;
      info.record_count = parseJsonExportFile(file).length;
    } else {
      info.parse_error = 'Unsupported export format.';
    }
  } catch (error) {
    info.parse_error = error.message;
  }

  return info;
}

export function parseExportFile(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.csv') return parseCsv(readText(file));
  return parseJsonExportFile(file);
}

export function findExportFileForEntity(inputDir, entityName) {
  const files = walk(inputDir).filter((file) => /\.(json|jsonl|csv)$/i.test(file) && !/expected-files\.json$/i.test(path.basename(file)));
  const normalizedEntity = normalizeName(entityName);
  return files.find((file) => normalizeName(path.basename(file, path.extname(file))) === normalizedEntity)
    || files.find((file) => normalizeName(path.basename(file, path.extname(file))).includes(normalizedEntity));
}

export function findExportFilesForEntity(inputDir, entityName) {
  const files = walk(inputDir).filter((file) => /\.(json|jsonl|csv)$/i.test(file) && !/expected-files\.json$/i.test(path.basename(file)));
  const normalizedEntity = normalizeName(entityName);
  return files.filter((file) => {
    const normalizedFile = normalizeName(path.basename(file, path.extname(file)));
    return normalizedFile === normalizedEntity || normalizedFile.includes(normalizedEntity);
  });
}

export function normalizeName(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

export function sourceIdFor(record) {
  return record?.id ?? record?._id ?? record?.base44_id ?? record?.source_id ?? null;
}

export function stableRecordHash(record) {
  return sha256(JSON.stringify(sortObject(record)));
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortObject(value[key])]));
}

export function detectAttachmentRefs(records, entityName) {
  const refs = [];
  for (const record of records) {
    const recordId = sourceIdFor(record);
    if (entityName === 'Attachment' && record.file_url) {
      refs.push({
        source_entity: entityName,
        source_id: recordId,
        parent_entity_type: record.entity_type || null,
        parent_entity_id: record.entity_id || null,
        section: record.section || null,
        section_ref: record.section_ref || null,
        file_url: record.file_url,
        file_name: record.file_name || null,
        uploaded_by: record.uploaded_by || null,
      });
    }

    for (const [field, value] of Object.entries(record || {})) {
      if (typeof value === 'string' && /^https?:\/\//i.test(value) && /base44|\/uploads\/|\.pdf|\.png|\.jpe?g|\.xlsx?/i.test(value)) {
        refs.push({
          source_entity: entityName,
          source_id: recordId,
          parent_entity_type: entityName,
          parent_entity_id: recordId,
          section: field,
          section_ref: null,
          file_url: value,
          file_name: path.basename(new URL(value).pathname) || null,
          uploaded_by: null,
        });
      }
    }
  }
  return refs;
}

export function limitRisk(count) {
  const knownCaps = [500, 1000, 2000, 5000];
  return knownCaps.includes(count)
    ? `Record count equals common Base44 list cap ${count}; export may be truncated.`
    : '';
}

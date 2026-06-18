import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_MANUAL_DROP_DIR,
  DEFAULT_RUNS_DIR,
  ensureDir,
  readEntitySchemas,
  writeText,
} from './base44-migration-utils.mjs';

ensureDir(DEFAULT_MANUAL_DROP_DIR);
ensureDir(DEFAULT_RUNS_DIR);

const schemas = readEntitySchemas();
const readme = `# Manual Base44 Export Drop

Put manually exported Base44 JSON files in this ignored folder.

Expected files:

${schemas.map((schema) => `- ${schema.name}.json`).join('\n')}

Accepted formats:

- A JSON array of records.
- A JSON object with a \`records\`, \`data\`, or \`items\` array.
- JSONL, one record per line.

Do not put credentials, database passwords, or production-only documents here unless they are part of a deliberate local migration export and remain uncommitted.
`;

writeText(path.join(DEFAULT_MANUAL_DROP_DIR, 'README.md'), readme);

const template = Object.fromEntries(schemas.map((schema) => [schema.name, {
  expected_file: `${schema.name}.json`,
  status: fs.existsSync(path.join(DEFAULT_MANUAL_DROP_DIR, `${schema.name}.json`)) ? 'present' : 'missing',
}]));

writeText(path.join(DEFAULT_MANUAL_DROP_DIR, 'expected-files.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Prepared ${DEFAULT_MANUAL_DROP_DIR} for ${schemas.length} entity exports.`);

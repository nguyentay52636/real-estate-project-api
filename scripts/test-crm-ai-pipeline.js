/**
 * Smoke wrapper — giữ lệnh cũ, ủy quyền sang node:test.
 * Prefer: npm test
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync(
  process.execPath,
  ['--test', 'tests/unit/ai/aiPipeline.helpers.test.js'],
  { cwd: root, stdio: 'inherit', env: process.env },
);

process.exit(result.status ?? 1);

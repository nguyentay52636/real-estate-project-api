import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

const re = /export default \{([^}]+)\};\s*$/m;

for (const file of walk(root)) {
  let src = fs.readFileSync(file, 'utf8');
  const match = src.match(re);
  if (!match) continue;

  const names = match[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const alias = part.match(/^(\w+)\s+as\s+(\w+)$/);
      if (alias) return alias[2];
      return part.split(/\s+/).pop();
    });

  if (!names.length) continue;

  const exportLine = `export { ${names.join(', ')} };\n`;
  if (src.includes(exportLine.trim())) continue;

  src = src.replace(re, `${exportLine}export default { ${names.join(', ')} };`);
  fs.writeFileSync(file, src);
  console.log('fixed:', path.relative(root, file), '->', names.join(', '));
}

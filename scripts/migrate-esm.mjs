#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const SKIP_DIRS = new Set(['node_modules', '.git', 'docs']);
const SKIP_FILES = new Set(['migrate-esm.mjs']);

const MODEL_MAP = [
  [/models\/nguoidung/gi, 'models/User.js'],
  [/models\/Nguoidung/g, 'models/User.js'],
  [/models\/vaiTro/g, 'models/Role.js'],
  [/models\/VaiTro/g, 'models/Role.js'],
  [/models\/KhachHang/g, 'models/Customer.js'],
  [/models\/PhongChat/g, 'models/ChatRoom.js'],
  [/models\/TinNhan/g, 'models/Message.js'],
  [/models\/ThongBaoChat/g, 'models/ChatNotification.js'],
  [/models\/chuNha/gi, 'models/Owner.js'],
  [/models\/ChuNha/g, 'models/Owner.js'],
  [/models\/NhanVien/g, 'models/Employee.js'],
  [/models\/BatDongSan/g, 'models/Property.js'],
  [/models\/DanhGia/g, 'models/Rating.js'],
  [/models\/YeuThich/g, 'models/Favorite.js'],
  [/models\/LichXemNha/g, 'models/ViewingSchedule.js'],
  [/models\/ThongBao(?!Chat)/g, 'models/Notification.js'],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.js') && !SKIP_FILES.has(entry.name)) files.push(full);
  }
  return files;
}

function fixModelPaths(content) {
  let out = content;
  for (const [pattern, replacement] of MODEL_MAP) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function ensureJsExtension(specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) return specifier;
  if (specifier.endsWith('.js') || specifier.endsWith('.json')) return specifier;
  return `${specifier}.js`;
}

function convertRequires(content) {
  const imports = [];
  let body = content;

  body = body.replace(/require\(['"]dotenv['"]\)\.config\(\);?/g, '');
  if (content.includes("require('dotenv')") || content.includes('require("dotenv")')) {
    imports.push("import dotenv from 'dotenv';");
    imports.push('dotenv.config();');
  }

  body = body.replace(/^const\s+(\w+)\s*=\s*require\((['"])([^'"]+)\2\);?\s*$/gm, (_, name, _q, spec) => {
    const fixed = ensureJsExtension(spec);
    if (spec.startsWith('.') && body.includes(`exports.${name}`)) {
      imports.push(`import ${name}Module from '${fixed}';`);
      return `const ${name} = ${name}Module.default ?? ${name}Module;`;
    }
    imports.push(`import ${name} from '${fixed}';`);
    return '';
  });

  body = body.replace(/^const\s+\{([^}]+)\}\s*=\s*require\((['"])([^'"]+)\2\);?\s*$/gm, (_, names, _q, spec) => {
    imports.push(`import { ${names.trim()} } from '${ensureJsExtension(spec)}';`);
    return '';
  });

  body = body.replace(/^\s*const\s+(\w+)\s*=\s*require\((['"])([^'"]+)\2\);?\s*$/gm, (_, name, _q, spec) => {
    const fixed = ensureJsExtension(spec);
    imports.push(`import ${name} from '${fixed}';`);
    return '';
  });

  body = body.replace(/^\s*const\s+\{([^}]+)\}\s*=\s*require\((['"])([^'"]+)\2\);?\s*$/gm, (_, names, _q, spec) => {
    imports.push(`import { ${names.trim()} } from '${ensureJsExtension(spec)}';`);
    return '';
  });

  // inline requires inside functions
  body = body.replace(/const\s+(\w+)\s*=\s*require\((['"])([^'"]+)\2\);/g, (_, name, _q, spec) => {
    imports.push(`import ${name} from '${ensureJsExtension(spec)}';`);
    return '';
  });

  const uniqueImports = [...new Set(imports)];
  if (!uniqueImports.length) return body;

  const lines = body.split('\n');
  let insertAt = 0;
  while (insertAt < lines.length && lines[insertAt].startsWith('//')) insertAt++;
  lines.splice(insertAt, 0, ...uniqueImports, '');
  return lines.join('\n');
}

function convertExports(content, filePath) {
  let out = content;

  if (/module\.exports\s*=\s*\{[\s\S]*?\};?\s*$/.test(out)) {
    out = out.replace(/module\.exports\s*=\s*(\{[\s\S]*?\});?\s*$/, 'export default $1;');
  } else if (/module\.exports\s*=\s*([^;{][^;]*);/.test(out)) {
    out = out.replace(/module\.exports\s*=\s*([^;]+);/g, 'export default $1;');
  }

  const exportNames = [];
  out = out.replace(/^exports\.(\w+)\s*=/gm, (_, name) => {
    exportNames.push(name);
    return `export const ${name} =`;
  });

  return out;
}

function addDirnameHelper(content, filePath) {
  if (!content.includes('__dirname') && !content.includes('__filename')) return content;
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const importLine = "import { getDirname } from './utils/esm.js';";
  const importLineNested = (depth) => {
    const prefix = '../'.repeat(depth);
    return `import { getDirname } from '${prefix}utils/esm.js';`;
  };

  const depth = rel.split('/').length - 1;
  const helperImport = depth === 0 ? importLine : importLineNested(depth);

  let out = content.replace(/__dirname/g, 'dirname');
  if (!out.includes('const dirname = getDirname(import.meta.url)')) {
    const lines = out.split('\n');
    let insertAt = 0;
    while (insertAt < lines.length && (lines[insertAt].startsWith('import ') || lines[insertAt].startsWith('//') || lines[insertAt].trim() === '')) {
      insertAt++;
    }
    lines.splice(insertAt, 0, helperImport, 'const dirname = getDirname(import.meta.url);', '');
    out = lines.join('\n');
  }
  return out;
}

function convertFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('require(') && !content.includes('module.exports') && !content.includes('exports.')) {
    return false;
  }

  content = fixModelPaths(content);
  content = convertRequires(content);
  content = convertExports(content);
  content = addDirnameHelper(content, filePath);

  content = content.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(filePath, content);
  return true;
}

const files = walk(ROOT);
let count = 0;
for (const file of files) {
  if (convertFile(file)) {
    count++;
    console.log('converted:', path.relative(ROOT, file));
  }
}
console.log(`Done. Converted ${count} files.`);

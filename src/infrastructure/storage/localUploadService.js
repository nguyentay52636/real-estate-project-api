import path from 'path';
import fs from 'fs';

import { getDirname } from '#shared/utils/esm.js';
const dirname = getDirname(import.meta.url);

const ROOT_DIR = path.join(dirname, '..');
const IMAGES_DIR = path.join(ROOT_DIR, 'images');

function sanitizeFolder(folder = 'uploads') {
  const safe = String(folder).replace(/[^a-zA-Z0-9_-]/g, '');
  return safe || 'uploads';
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getLocalDir(folder) {
  const safeFolder = sanitizeFolder(folder);
  const dir = path.join(IMAGES_DIR, safeFolder);
  ensureDir(dir);
  return { dir, safeFolder };
}

function toPublicUrl(folder, filename) {
  return `/images/${folder}/${filename}`;
}

function toRelativePath(folder, filename) {
  return `images/${folder}/${filename}`;
}

function deleteLocalFile(filePath) {
  if (!filePath) return false;

  const normalized = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  if (!normalized.startsWith('images/')) return false;

  const fullPath = path.join(ROOT_DIR, normalized);
  if (!fs.existsSync(fullPath)) return false;

  fs.unlinkSync(fullPath);
  return true;
}

export { sanitizeFolder, getLocalDir, toPublicUrl, toRelativePath, deleteLocalFile };
export default { sanitizeFolder, getLocalDir, toPublicUrl, toRelativePath, deleteLocalFile };
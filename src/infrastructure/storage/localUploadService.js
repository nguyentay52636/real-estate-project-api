import path from 'path';
import fs from 'fs';

import { getDirname } from '#shared/utils/esm.js';
const dirname = getDirname(import.meta.url);

// src/infrastructure/storage → project root (chứa folder images/ phục vụ static)
const ROOT_DIR = path.join(dirname, '../../..');
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

/** Lưu buffer ảnh vào images/<folder>/ (dùng khi fallback từ Cloudinary). */
function saveBufferLocal(buffer, originalName, folder = 'uploads') {
  const { dir, safeFolder } = getLocalDir(folder);
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(originalName || '') || '.jpg';
  const filename = `${uniqueSuffix}${ext}`;
  const fullPath = path.join(dir, filename);
  fs.writeFileSync(fullPath, buffer);
  return {
    filename,
    folder: safeFolder,
    url: toPublicUrl(safeFolder, filename),
    path: toRelativePath(safeFolder, filename),
  };
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

export {
  sanitizeFolder,
  getLocalDir,
  toPublicUrl,
  toRelativePath,
  saveBufferLocal,
  deleteLocalFile,
};
export default {
  sanitizeFolder,
  getLocalDir,
  toPublicUrl,
  toRelativePath,
  saveBufferLocal,
  deleteLocalFile,
};
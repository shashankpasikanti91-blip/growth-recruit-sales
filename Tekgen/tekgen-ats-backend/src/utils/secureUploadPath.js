'use strict';

const path = require('path');
const fs = require('fs');
const config = require('../config/environment');

/**
 * Resolve a stored `/uploads/...` URL or relative path to an absolute path under UPLOAD_DIR.
 * Returns null if invalid, traversal, or missing file.
 */
function resolveUploadAbsolute(fileUrlOrPath) {
  if (!fileUrlOrPath || typeof fileUrlOrPath !== 'string') return null;
  const normalized = fileUrlOrPath.replace(/\\/g, '/');
  let rel = normalized.replace(/^\/uploads\/?/, '');
  if (!rel || rel.includes('..')) return null;
  const abs = path.resolve(config.UPLOAD_DIR, rel);
  const root = path.resolve(config.UPLOAD_DIR);
  if (!abs.startsWith(root)) return null;
  if (!fs.existsSync(abs)) return null;
  return abs;
}

module.exports = { resolveUploadAbsolute };

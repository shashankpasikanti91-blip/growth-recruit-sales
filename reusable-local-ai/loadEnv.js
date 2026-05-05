const fs = require('fs');
const path = require('path');

let loaded = false;

function applyEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadEnv(baseDir = process.cwd()) {
  if (loaded) {
    return;
  }

  const candidates = [
    path.resolve(baseDir, '.env'),
    path.resolve(baseDir, '../.env'),
  ];

  for (const candidate of candidates) {
    applyEnvFile(candidate);
  }

  loaded = true;
}

module.exports = { loadEnv };
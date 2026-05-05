const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

let loaded = false;

function loadEnv() {
  if (loaded) return;

  const candidates = [
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '../.env'),
  ];

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  }

  loaded = true;
}

module.exports = { loadEnv };

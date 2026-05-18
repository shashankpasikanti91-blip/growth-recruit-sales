#!/usr/bin/env node
/**
 * Back-compat entry: runs the unified E2E orchestrator (role matrix → approvals → full lifecycle).
 * Prefer: npm run test:e2e:unified
 * Individual suites: npm run test:e2e:role-matrix | test:e2e:payroll-integrity | test:e2e:department-approvals
 */
const { spawnSync } = require('child_process');
const path = require('path');

const r = spawnSync(process.execPath, [path.join(__dirname, 'test-e2e-unified.js')], {
  stdio: 'inherit',
  cwd: __dirname,
  env: process.env,
});
process.exit(r.status === null ? 1 : r.status);

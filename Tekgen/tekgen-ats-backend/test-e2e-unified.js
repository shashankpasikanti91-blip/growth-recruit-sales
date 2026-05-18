/**
 * Single orchestrator: runs role-matrix E2E, department approvals (with --align), then full lifecycle.
 * Usage: npm run test:e2e:unified
 * Env: API_BASE (default http://localhost:5000/api)
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = __dirname;
const phases = [
  path.join(root, 'test-e2e-role-matrix.js'),
  path.join(root, 'test-e2e-department-approvals.js'),
  path.join(root, 'test-e2e-full-lifecycle.js'),
];

function main() {
  console.log('\n=== Unified E2E (role matrix → full lifecycle) ===\n');
  for (const script of phases) {
    const name = path.basename(script);
    console.log(`>>> ${name}`);
    const args = [script];
    if (name === 'test-e2e-department-approvals.js') {
      args.push('--align');
    }
    const r = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: root, env: process.env });
    if (r.status !== 0) {
      console.error(`\n❌ Phase failed: ${name} (exit ${r.status ?? 'unknown'})\n`);
      process.exit(r.status || 1);
    }
    console.log(`<<< ${name} OK\n`);
  }
  console.log('✅ Unified E2E completed successfully.\n');
}

main();

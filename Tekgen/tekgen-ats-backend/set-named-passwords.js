const path = require('path');
const prisma = require('./src/config/database');
const bcrypt = require('bcryptjs');
const { DEMO_WORKSPACE_ACCOUNTS } = require(path.join(__dirname, '../shared/demoWorkspaceAccounts.js'));

const users = DEMO_WORKSPACE_ACCOUNTS.map(({ email, password }) => ({ email, password }));

async function run() {
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    await prisma.user.update({ where: { email: u.email }, data: { password: hash } });
    console.log(`✓ ${u.email} → ${u.password}`);
  }
  await prisma.$disconnect();
  console.log('\nAll passwords updated.');
}

run().catch(e => { console.error(e); process.exit(1); });

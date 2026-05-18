const path = require('path');
const prisma = require('./src/config/database');
const bcrypt = require('bcryptjs');
const { DEMO_WORKSPACE_ACCOUNTS } = require(path.join(__dirname, '../shared/demoWorkspaceAccounts.js'));

const passwordByEmail = new Map(
  DEMO_WORKSPACE_ACCOUNTS.map((a) => [a.email.toLowerCase(), a.password])
);

async function checkLogin() {
  try {
    const users = await prisma.user.findMany({ select: { email: true, password: true, role: true, isActive: true } });
    console.log(`Found ${users.length} users (expected demo passwords from shared/demoWorkspaceAccounts.js)\n`);
    for (const u of users) {
      const expected = passwordByEmail.get(u.email.toLowerCase());
      if (!expected) {
        console.log(`${u.email} | active:${u.isActive} | (not a seeded demo workspace row — skipped)`);
        continue;
      }
      const ok = await bcrypt.compare(expected, u.password);
      console.log(`${u.email} | active:${u.isActive} | matches shared password: ${ok}`);
    }
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLogin();

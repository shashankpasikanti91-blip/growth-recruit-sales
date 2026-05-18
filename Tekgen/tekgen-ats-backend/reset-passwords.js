/**
 * Reset all team member passwords to known values.
 * Run with: node reset-passwords.js
 */
require('dotenv').config();
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { getDemoAccountsForSeed } = require(path.join(__dirname, '../shared/demoWorkspaceAccounts.js'));

const prisma = new PrismaClient();

const accounts = getDemoAccountsForSeed();

async function resetPasswords() {
  console.log('Resetting passwords for all team members...\n');
  for (const acct of accounts) {
    const hash = await bcrypt.hash(acct.password, 12);
    const user = await prisma.user.upsert({
      where: { email: acct.email },
      update: {
        password: hash,
        firstName: acct.firstName,
        lastName: acct.lastName,
        role: acct.role,
        loginAttempts: 0,
        isAccountLocked: false,
        isActive: true,
      },
      create: {
        email: acct.email,
        password: hash,
        firstName: acct.firstName,
        lastName: acct.lastName,
        role: acct.role,
        loginAttempts: 0,
        isAccountLocked: false,
        isActive: true,
      },
    });
    console.log(`✅  ${acct.email}  →  password: ${acct.password}  (role: ${user.role})`);
  }
  console.log('\nAll passwords reset successfully.');
  await prisma.$disconnect();
}

resetPasswords().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});

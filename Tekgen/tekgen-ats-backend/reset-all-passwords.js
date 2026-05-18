const path = require('path');
const { PrismaClient } = require('./node_modules/@prisma/client');
const bcrypt = require('./node_modules/bcryptjs');
const { getDemoAccountsForSeed } = require(path.join(__dirname, '../shared/demoWorkspaceAccounts.js'));

const prisma = new PrismaClient();

async function main() {
  const accounts = getDemoAccountsForSeed();

  for (const acct of accounts) {
    const newHash = await bcrypt.hash(acct.password, 12);
    await prisma.user.update({
      where: { email: acct.email },
      data: { password: newHash },
    });
    console.log('Password reset for:', acct.email, '→', acct.password);
  }
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

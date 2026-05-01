const { PrismaClient } = require('./node_modules/@prisma/client');
const bcrypt = require('./node_modules/bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const newHash = await bcrypt.hash('Admin@1234', 12);
  
  // Update all users with the correct password
  const emails = ['shashank@tekgen.com', 'admin@tekgen.com', 'jerry@tekgen.com', 'savitha@tekgen.com', 'demo@tekgen.com'];
  
  for (const email of emails) {
    await prisma.user.update({
      where: { email },
      data: { password: newHash }
    });
    console.log('Password reset for:', email);
  }
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

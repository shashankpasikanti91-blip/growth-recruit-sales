const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true }
  });
  users.forEach(u => {
    console.log(u.email, '|', u.role, '| active:', u.isActive, '|', u.firstName, u.lastName);
  });
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

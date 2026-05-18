require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixNames() {
  const candidates = await prisma.candidate.findMany({
    where: { lastName: { contains: ',' } },
    select: { id: true, firstName: true, lastName: true },
  });

  let fixed = 0;
  for (const c of candidates) {
    const clean = c.lastName.split(',')[0].trim();
    await prisma.candidate.update({ where: { id: c.id }, data: { lastName: clean } });
    console.log(`Fixed: ${c.firstName} | "${c.lastName}" => "${clean}"`);
    fixed++;
  }
  console.log(`\nTotal fixed: ${fixed} candidates.`);
  await prisma.$disconnect();
}

fixNames().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});

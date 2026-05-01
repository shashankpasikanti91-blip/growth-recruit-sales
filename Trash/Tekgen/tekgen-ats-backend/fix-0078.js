const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Fix TKG-C-0078 which got wrongly set to "Page 1 of 7"
  await prisma.candidate.update({
    where: { displayId: 'TKG-C-0078' },
    data: { firstName: 'Unknown', lastName: '', parsingStatus: 'NEEDS_REVIEW' }
  });
  console.log('Fixed TKG-C-0078 back to Unknown');

  // Show all NEEDS_REVIEW candidates so user knows what to fix
  const needsReview = await prisma.candidate.findMany({
    where: { parsingStatus: 'NEEDS_REVIEW' },
    select: { displayId: true, firstName: true, lastName: true, email: true }
  });
  console.log('\n=== NEEDS_REVIEW candidates (manual fix required) ===');
  needsReview.forEach(c => {
    console.log(' -', c.displayId, '|', c.firstName, c.lastName, '<' + c.email + '>');
  });

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

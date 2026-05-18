const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Delete test/operational jobs
  const deleted = await prisma.job.deleteMany({
    where: {
      OR: [
        { title: { in: ['Screening', 'Bulk Screening', 'Direct File Screening', 'Software Engineer', 'Software Engineer - Shashank\'s Team', 'Software Engineer - Jerry\'s Team', 'Software Engineer - Savitha\'s Team', 'Sr Integration eng'] } },
      ]
    }
  });
  console.log('Deleted test jobs:', deleted.count);

  const jobs = await prisma.job.findMany({
    select: { displayId: true, title: true, clientName: true, status: true }
  });
  console.log('\nRemaining jobs (' + jobs.length + '):');
  jobs.forEach(j => console.log(' -', j.displayId, j.title, '|', j.clientName, '|', j.status));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

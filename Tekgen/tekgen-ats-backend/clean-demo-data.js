const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Remove candidates with obviously demo/test emails or names
  const deleted = await prisma.candidate.deleteMany({
    where: {
      OR: [
        { email: { contains: 'test', mode: 'insensitive' } },
        { email: { contains: 'example.com', mode: 'insensitive' } },
        { email: { contains: 'demo', mode: 'insensitive' } },
        { email: { contains: 'dummy', mode: 'insensitive' } },
        { email: { contains: 'fake', mode: 'insensitive' } },
      ]
    }
  });
  console.log('Deleted demo candidates:', deleted.count);

  // Remove demo jobs
  const deletedJobs = await prisma.job.deleteMany({
    where: {
      OR: [
        { title: { contains: 'test', mode: 'insensitive' } },
        { title: { contains: 'demo', mode: 'insensitive' } },
        { clientName: { contains: 'demo', mode: 'insensitive' } },
        { clientName: { contains: 'test company', mode: 'insensitive' } },
        { clientName: { contains: 'fake', mode: 'insensitive' } },
      ]
    }
  });
  console.log('Deleted demo jobs:', deletedJobs.count);

  // Show what remains
  const candidates = await prisma.candidate.findMany({
    select: { id: true, displayId: true, firstName: true, lastName: true, email: true, status: true }
  });
  console.log('\nRemaining candidates (' + candidates.length + '):');
  candidates.forEach(c => {
    console.log(' -', c.displayId, c.firstName, c.lastName, '<' + c.email + '>', c.status);
  });

  const jobs = await prisma.job.findMany({
    select: { id: true, displayId: true, title: true, clientName: true, status: true }
  });
  console.log('\nRemaining jobs (' + jobs.length + '):');
  jobs.forEach(j => {
    console.log(' -', j.displayId, j.title, '|', j.clientName, '|', j.status);
  });

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

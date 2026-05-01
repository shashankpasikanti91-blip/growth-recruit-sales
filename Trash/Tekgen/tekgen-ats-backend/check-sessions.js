const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.screeningSession.findMany({
    take: 5,
    include: {
      user: { select: { email: true } },
      job: { select: { title: true } },
      _count: { select: { results: true } }
    }
  });
  console.log('Total sessions check - first 5:');
  sessions.forEach(s => {
    console.log(' -', s.id, '| user:', s.user?.email, '| job:', s.job?.title, '| results:', s._count.results, '| status:', s.status);
  });

  const total = await prisma.screeningSession.count();
  console.log('Total sessions in DB:', total);

  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log('\nAll users:');
  users.forEach(u => console.log(' -', u.id, u.email));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

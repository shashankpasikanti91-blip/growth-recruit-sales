const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const [users, candidates, jobs, applications, screenings, clients] = await Promise.all([
    prisma.user.count(),
    prisma.candidate.count(),
    prisma.job.count(),
    prisma.application.count(),
    prisma.screening.count(),
    prisma.client.count(),
  ]);
  console.log('users:', users);
  console.log('candidates:', candidates);
  console.log('jobs:', jobs);
  console.log('applications:', applications);
  console.log('screenings:', screenings);
  console.log('clients:', clients);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Check Ashok Reddy
  const ashok = await p.candidate.findFirst({
    where: { displayId: 'TKG-C-0067' },
    select: {
      id: true, displayId: true, firstName: true, lastName: true,
      email: true, isTrashed: true, parsingStatus: true,
    },
  });
  console.log('Ashok Reddy:', JSON.stringify(ashok, null, 2));

  // Check ALL candidates with screening scores
  try {
    const screened = await p.screeningResult.findMany({
      select: {
        id: true, candidateId: true, overallScore: true, status: true, createdAt: true,
        candidate: { select: { displayId: true, firstName: true, lastName: true, isTrashed: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log('\nAll screening results:', screened.length);
    screened.forEach(s => {
      const c = s.candidate;
      console.log(`  ${c.displayId} | ${c.firstName} ${c.lastName} | score=${s.overallScore} | trashed=${c.isTrashed}`);
    });

    // Show any TRASHED candidates that have screening results (critical!)
    const trashedWithScores = screened.filter(s => s.candidate.isTrashed);
    if (trashedWithScores.length > 0) {
      console.log('\n⚠ TRASHED candidates with screening data:');
      trashedWithScores.forEach(s => {
        const c = s.candidate;
        console.log(`  ${c.displayId} | ${c.firstName} ${c.lastName} | score=${s.overallScore}`);
      });
    }
  } catch (e) {
    console.log('\nNo screeningResult table or error:', e.message.substring(0, 200));
  }

  // Check job applications / scores stored differently
  try {
    const apps = await p.jobApplication.findMany({
      where: { aiScore: { not: null } },
      select: {
        id: true, aiScore: true, status: true, candidateId: true,
        candidate: { select: { displayId: true, firstName: true, lastName: true, isTrashed: true } },
        job: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    console.log('\nJob applications with AI scores:', apps.length);
    apps.forEach(a => {
      const c = a.candidate;
      console.log(`  ${c.displayId} | ${c.firstName} ${c.lastName} | score=${a.aiScore} | job=${a.job?.title} | trashed=${c.isTrashed}`);
    });
  } catch (e) {
    console.log('\nNo jobApplication.aiScore or error:', e.message.substring(0, 100));
  }
}
main().catch(console.error).finally(() => p.$disconnect());

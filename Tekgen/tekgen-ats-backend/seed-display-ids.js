const prisma = require('./src/config/database');

async function seedDisplayIds() {
  // Seed candidates
  const candidates = await prisma.candidate.findMany({
    where: { OR: [{ displayId: null }, { displayId: '' }] },
    orderBy: { createdAt: 'asc' },
  });

  for (let i = 0; i < candidates.length; i++) {
    const displayId = `TKG-C-${String(i + 1).padStart(4, '0')}`;
    await prisma.candidate.update({
      where: { id: candidates[i].id },
      data: { displayId },
    });
    console.log(`Candidate ${candidates[i].email} -> ${displayId}`);
  }

  // Seed jobs
  const jobs = await prisma.job.findMany({
    where: { OR: [{ displayId: null }, { displayId: '' }] },
    orderBy: { createdAt: 'asc' },
  });

  for (let i = 0; i < jobs.length; i++) {
    const displayId = `TKG-J-${String(i + 1).padStart(4, '0')}`;
    await prisma.job.update({
      where: { id: jobs[i].id },
      data: { displayId },
    });
    console.log(`Job ${jobs[i].title} -> ${displayId}`);
  }

  console.log(`\nDone: ${candidates.length} candidates, ${jobs.length} jobs`);
  await prisma.$disconnect();
}

seedDisplayIds().catch(e => { console.error(e); process.exit(1); });

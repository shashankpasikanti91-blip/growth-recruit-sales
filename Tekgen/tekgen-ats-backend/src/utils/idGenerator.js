const prisma = require('../config/database');

async function generateCandidateId() {
  const last = await prisma.candidate.findFirst({
    where: { displayId: { not: null } },
    orderBy: { displayId: 'desc' },
    select: { displayId: true },
  });

  let nextNum = 1;
  if (last?.displayId) {
    const match = last.displayId.match(/TKG-C-(\d+)/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }

  return `TKG-C-${String(nextNum).padStart(4, '0')}`;
}

async function generateJobId() {
  const last = await prisma.job.findFirst({
    where: { displayId: { not: null } },
    orderBy: { displayId: 'desc' },
    select: { displayId: true },
  });

  let nextNum = 1;
  if (last?.displayId) {
    const match = last.displayId.match(/TKG-J-(\d+)/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }

  return `TKG-J-${String(nextNum).padStart(4, '0')}`;
}

module.exports = { generateCandidateId, generateJobId };

const prisma = require('./src/config/database');
const path = require('path');

async function fix() {
  const candidates = await prisma.candidate.findMany({
    select: { id: true, resumeUrl: true, experience: true, firstName: true, lastName: true }
  });

  for (const c of candidates) {
    console.log(`${c.firstName} ${c.lastName}: resumeUrl=${c.resumeUrl}, exp=${c.experience}`);
    if (c.resumeUrl && !c.resumeUrl.startsWith('/uploads/')) {
      const newUrl = '/uploads/' + path.basename(c.resumeUrl);
      await prisma.candidate.update({ where: { id: c.id }, data: { resumeUrl: newUrl } });
      console.log(`  -> Fixed to: ${newUrl}`);
    }
  }

  await prisma.$disconnect();
  console.log('Done');
}

fix();

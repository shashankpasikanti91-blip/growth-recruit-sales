const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

// More comprehensive bad name patterns
const BAD_FIRST_NAME = /^(contact|job title|current address|professional summary|diploma|big data|problem solving|resource management|senior full stack|profile|summary|work experience|technical skills|key achievement|certification|schedule|resume|phone|email|mobile|skills|education|career|objective|introduction|kuala lumpur|petaling|subang|shah alam|selangor|wangsa|maju|cheras|puchong|klang|bachelor|master|phd|maktab|universiti|university|and enterprise|data management|incident management|service delivery|schema evolution|work history|profile summary|wessex water|name\s*:)/i;

async function main() {
  const candidates = await prisma.candidate.findMany({
    select: { id: true, displayId: true, firstName: true, lastName: true }
  });

  const bad = candidates.filter(c => BAD_FIRST_NAME.test(c.firstName));
  console.log('Candidates with bad names:', bad.length);
  bad.forEach(c => console.log(' -', c.displayId, '|', c.firstName, '|', c.lastName));

  // Fix the ones we can determine from lastName
  for (const c of bad) {
    const fullName = (c.firstName + ' ' + c.lastName).trim();
    // If the name contains a colon — it's a label:value pattern like "Name   : Chew Boon Siong"
    if (fullName.includes(':')) {
      const afterColon = fullName.split(':').slice(1).join(':').trim();
      if (afterColon && afterColon.length > 1 && afterColon.length < 60) {
        const parts = afterColon.split(/\s+/);
        const newFirst = parts[0];
        const newLast = parts.slice(1).join(' ');
        await prisma.candidate.update({
          where: { id: c.id },
          data: { firstName: newFirst, lastName: newLast, parsingStatus: 'NEEDS_REVIEW' }
        });
        console.log(`  Fixed ${c.displayId}: "${c.firstName}" -> "${newFirst} ${newLast}"`);
        continue;
      }
    }
    // Otherwise just mark NEEDS_REVIEW (user must fix)
    await prisma.candidate.update({
      where: { id: c.id },
      data: { parsingStatus: 'NEEDS_REVIEW' }
    });
    console.log(`  Marked ${c.displayId} NEEDS_REVIEW (cannot auto-fix)`);
  }

  console.log('Done.');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

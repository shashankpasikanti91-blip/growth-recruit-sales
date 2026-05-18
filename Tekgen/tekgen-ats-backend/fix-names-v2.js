const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const parser = require('./src/services/resume/resumeParserService');

// Patterns that indicate a bad/non-name firstName
const BAD_NAME_PATTERN = /^(job title|contact|current address|professional summary|diploma|big data|problem solving|resource management|senior full stack|profile|summary|work experience|technical skills|key achievement|certification|schedule|resume|work |key |name\s*:|phone|email|mobile|skills|experience|education|career|objective|introduction|kuala lumpur|petaling|subang|shah alam|selangor|wangsa|bachelor|master|phd|maktab|universiti|work\s+history|and enterprise|data management|incident management|service delivery|schema evolution|profile\s+summary|contact\s+no|contact\s+information)/i;

async function main() {
  const candidates = await prisma.candidate.findMany({
    select: { id: true, displayId: true, firstName: true, lastName: true, resumeUrl: true, parsingStatus: true }
  });

  const bad = candidates.filter(c => BAD_NAME_PATTERN.test(c.firstName));
  console.log(`Found ${bad.length} candidates with bad names:`);

  for (const c of bad) {
    console.log(`\n  ${c.displayId} | firstName="${c.firstName}" | resumeUrl="${c.resumeUrl}"`);
    
    let reparsedName = null;
    
    // Try to re-parse the resume file
    if (c.resumeUrl) {
      // resumeUrl is like /uploads/filename.pdf
      const filePath = path.join(__dirname, c.resumeUrl.replace(/^\//, ''));
      if (require('fs').existsSync(filePath)) {
        try {
          const reparsed = await parser.parseResume(filePath);
          if (reparsed.name && !BAD_NAME_PATTERN.test(reparsed.name)) {
            reparsedName = reparsed.name;
            console.log(`    -> Re-parsed name: "${reparsedName}"`);
          } else {
            console.log(`    -> Re-parse still bad: "${reparsed.name}" — marking NEEDS_REVIEW`);
          }
        } catch (e) {
          console.log(`    -> Parse error: ${e.message}`);
        }
      } else {
        console.log(`    -> Resume file not found at: ${filePath}`);
      }
    }

    if (reparsedName) {
      const parts = reparsedName.trim().split(/\s+/);
      const newFirst = parts[0];
      const newLast = parts.slice(1).join(' ');
      await prisma.candidate.update({
        where: { id: c.id },
        data: {
          firstName: newFirst,
          lastName: newLast,
          parsingStatus: 'NEEDS_REVIEW'
        }
      });
      console.log(`    -> UPDATED to: "${newFirst} ${newLast}" (NEEDS_REVIEW)`);
    } else {
      // Mark as NEEDS_REVIEW so user can fix manually
      await prisma.candidate.update({
        where: { id: c.id },
        data: { parsingStatus: 'NEEDS_REVIEW' }
      });
      console.log(`    -> Marked NEEDS_REVIEW (name kept for manual fix)`);
    }
  }

  console.log('\nDone.');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

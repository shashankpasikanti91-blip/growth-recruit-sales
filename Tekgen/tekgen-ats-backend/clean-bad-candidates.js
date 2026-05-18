/**
 * clean-bad-candidates.js
 * Identifies and marks junk/badly-parsed candidates as isTrashed=true
 * Also fixes recoverable name parsing errors
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // ── 1. Fix recoverable names ────────────────────────────────────────────
  const fixes = [
    // "Name   : Chew Boon Siong" → firstName="Chew", lastName="Boon Siong"
    {
      displayId: 'TKG-C-0072',
      firstName: 'Chew',
      lastName: 'Boon Siong',
    },
    // "Ashok Reddy, Senior DevOps Engineer" → strip the title
    {
      displayId: 'TKG-C-0067',
      firstName: 'Ashok',
      lastName: 'Reddy',
    },
  ];

  for (const fix of fixes) {
    const r = await p.candidate.updateMany({
      where: { displayId: fix.displayId },
      data: { firstName: fix.firstName, lastName: fix.lastName },
    });
    console.log(`Fixed name for ${fix.displayId}: ${fix.firstName} ${fix.lastName} (${r.count} row)`);
  }

  // ── 2. Mark junk candidates as trashed ──────────────────────────────────
  // Junk detected by displayId (exact matches from audit)
  const junkIds = [
    'TKG-C-0086', // "deployment."
    'TKG-C-0083', // "Work" + fake email
    'TKG-C-0081', // "and enterprise infrastructure."
    'TKG-C-0080', // "CERTIFICATION" + fake email
    'TKG-C-0078', // "Unknown"
    'TKG-C-0076', // "Profile Summary"
    'TKG-C-0073', // "CONTACT"
    'TKG-C-0071', // "Wessex Water" + fake email
    'TKG-C-0070', // "Wessex Water" + fake email
    'TKG-C-0066', // "Key Achievement"
    'TKG-C-0062', // "Subang Jaya" (location)
    'TKG-C-0061', // "Universiti Teknikal Malaysia Melaka" (institution name)
    'TKG-C-0060', // "Petaling Jaya Selangor" (location)
    'TKG-C-0059', // "Contact No"
    'TKG-C-0058', // "Supported Oracle Transportation Management"
    'TKG-C-0057', // "Data Management"
    'TKG-C-0054', // "Final Year Project"
    'TKG-C-0053', // "Maktab Rendah Sains" (school name)
    'TKG-C-0051', // "Subang Jaya" (location)
    'TKG-C-0050', // "Schema Evolution"
    'TKG-C-0049', // "Senior Data Engineer" + fake email (job title as name)
    'TKG-C-0047', // "Kuala Lumpur" (location)
    'TKG-C-0045', // "Senior Full Stack Developer" (job title as name)
  ];

  const trashResult = await p.candidate.updateMany({
    where: { displayId: { in: junkIds } },
    data: {
      isTrashed: true,
      trashedAt: new Date(),
      trashedReason: 'POOR_PARSE',
    },
  });
  console.log(`\nMarked ${trashResult.count} candidates as trashed (POOR_PARSE)`);

  // Also trash any candidates with fake/generated emails AND junk-looking names
  const fakeEmailCandidates = await p.candidate.findMany({
    where: {
      email: { contains: '@tekgen-screened.com' },
      isTrashed: false,
    },
    select: { displayId: true, firstName: true, lastName: true, email: true },
  });

  if (fakeEmailCandidates.length > 0) {
    console.log('\nAdditional fake-email candidates (not already trashed):');
    fakeEmailCandidates.forEach(c =>
      console.log(`  ${c.displayId}: "${c.firstName} ${c.lastName}" <${c.email}>`)
    );
    const fakeIds = fakeEmailCandidates.map(c => c.displayId);
    const r2 = await p.candidate.updateMany({
      where: { displayId: { in: fakeIds } },
      data: { isTrashed: true, trashedAt: new Date(), trashedReason: 'POOR_PARSE' },
    });
    console.log(`Marked ${r2.count} additional fake-email candidates as trashed`);
  }

  // ── 3. Summary ──────────────────────────────────────────────────────────
  const remaining = await p.candidate.count({ where: { isTrashed: false } });
  const trashed = await p.candidate.count({ where: { isTrashed: true } });
  console.log(`\nSummary: ${remaining} active candidates | ${trashed} trashed`);
}

main().catch(console.error).finally(() => p.$disconnect());

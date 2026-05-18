const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // First check if isTrashed column exists
  try {
    const candidates = await p.candidate.findMany({
      where: { isTrashed: false },
      select: {
        id: true, displayId: true, firstName: true, lastName: true,
        email: true, phone: true, currentRole: true, sourceChannel: true,
        parsingStatus: true, icNumber: true, passportNumber: true, experience: true,
      },
      orderBy: { displayId: 'desc' },
      take: 50,
    });
    console.log('TOTAL:', candidates.length);
    candidates.forEach(c => {
      const fullName = (c.firstName + ' ' + c.lastName).trim();
      const hasId = c.icNumber || c.passportNumber;
      const hasPhone = c.phone;
      const hasRole = c.currentRole;
      const badEmail = !c.email || c.email.startsWith('candidate+') || c.email.includes('no-email');
      const junkName = /^(CONTACT|deployment|Name\s*:|Wessex|unknown)/i.test(fullName) || fullName.length < 3;
      console.log(JSON.stringify({ id: c.id, displayId: c.displayId, name: fullName, email: c.email, phone: hasPhone, role: hasRole, hasId: !!hasId, badEmail, junkName }));
    });
  } catch (e) {
    // isTrashed not in DB yet — query without it
    const candidates = await p.candidate.findMany({
      select: {
        id: true, displayId: true, firstName: true, lastName: true,
        email: true, phone: true, currentRole: true, sourceChannel: true,
        parsingStatus: true, icNumber: true, passportNumber: true, experience: true,
      },
      orderBy: { displayId: 'desc' },
      take: 50,
    });
    console.log('TOTAL (no trash filter):', candidates.length);
    candidates.forEach(c => {
      const fullName = (c.firstName + ' ' + c.lastName).trim();
      const hasId = c.icNumber || c.passportNumber;
      const badEmail = !c.email || c.email.startsWith('candidate+') || c.email.includes('no-email');
      const junkName = /^(CONTACT|deployment|Name\s*:|Wessex|unknown)/i.test(fullName) || fullName.length < 3;
      console.log(JSON.stringify({ id: c.id, displayId: c.displayId, name: fullName, email: c.email, phone: !!c.phone, role: c.currentRole, hasId: !!hasId, badEmail, junkName }));
    });
  }
}
main().finally(() => p.$disconnect());

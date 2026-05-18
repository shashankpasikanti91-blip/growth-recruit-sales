const prisma = require('../config/database');

const RENEWAL_DAYS_BEFORE = 30;

async function nextCaseDisplayId() {
  const count = await prisma.visaCase.count();
  return `TKG-VISA-${String(count + 1).padStart(4, '0')}`;
}

function renewalDueFromExpiry(expiryDate) {
  if (!expiryDate) return null;
  const d = new Date(expiryDate);
  if (Number.isNaN(d.getTime())) return null;
  const out = new Date(d);
  out.setDate(out.getDate() - RENEWAL_DAYS_BEFORE);
  return out;
}

/** Phase 4.2 — expat pre/post checklist templates */
const EXPAT_PRE_ITEMS = [
  'Passport (valid > 18 months)',
  'Photo (passport size)',
  'Medical examination docs (if required)',
  'Education certificates',
  'Experience letters / employment history',
  'Offer letter signed',
  'Application form submitted to authority',
  'Government approval',
];

const EXPAT_POST_ITEMS = [
  'Arrival confirmation',
  'Local address',
  'Bank account opening',
  'Tax number registration',
  'EPF/SOCSO/EIS setup (if applicable)',
  'Dependent documents (if family joining)',
];

/** Phase 4.3 — local Malaysian */
const LOCAL_ITEMS = [
  'NRIC (IC)',
  'EPF Number',
  'SOCSO Number',
  'EIS Number',
  'Tax Number (LHDN/TIN)',
  'Bank Account',
  'Employment Agreement signed',
  'PCB setup',
];

function defaultOnboardingRows(workerCategory) {
  const rows = [];
  if (workerCategory === 'EXPAT_OVERSEAS') {
    EXPAT_PRE_ITEMS.forEach((itemName, i) => {
      rows.push({ itemName, itemPhase: 'PRE', sortOrder: i });
    });
    EXPAT_POST_ITEMS.forEach((itemName, i) => {
      rows.push({ itemName, itemPhase: 'POST', sortOrder: 100 + i });
    });
  } else if (workerCategory === 'LOCAL_MY') {
    LOCAL_ITEMS.forEach((itemName, i) => {
      rows.push({ itemName, itemPhase: 'LOCAL', sortOrder: i });
    });
  }
  return rows;
}

async function seedOnboardingItems(visaCaseId, workerCategory) {
  const rows = defaultOnboardingRows(workerCategory);
  if (!rows.length) return;
  await prisma.visaOnboardingItem.createMany({
    data: rows.map((r) => ({
      visaCaseId,
      itemName: r.itemName,
      itemPhase: r.itemPhase,
      sortOrder: r.sortOrder,
      status: 'PENDING',
    })),
  });
}

/**
 * Auto expiry alerts for permit (30/7/2 days before expiry).
 */
async function syncPermitExpiryAlerts(visaCaseId, expiryDate) {
  await prisma.visaExpiryAlert.deleteMany({
    where: { visaCaseId, alertType: 'PERMIT' },
  });
  if (!expiryDate) return;
  const exp = new Date(expiryDate);
  if (Number.isNaN(exp.getTime())) return;
  const now = new Date();
  for (const days of [30, 7, 2]) {
    const trigger = new Date(exp);
    trigger.setDate(trigger.getDate() - days);
    const row = {
      visaCaseId,
      alertType: 'PERMIT',
      expiryDate: exp,
      alertDays: days,
    };
    if (trigger <= now) {
      row.triggeredAt = now;
    }
    await prisma.visaExpiryAlert.create({ data: row });
  }
}

async function getDashboardKpis() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const inProgressStatuses = ['APPLICATION', 'RENEWAL_PENDING', 'RENEWAL_SUBMITTED'];

  const [
    renewalsThisMonth,
    futureExpiries,
    newApplications,
    rejected,
    approved,
    pendingDocs,
    byCategory,
    allCasesForBoard,
  ] = await Promise.all([
    prisma.visaCase.count({
      where: {
        renewalDueDate: { gte: startOfMonth, lte: endOfMonth },
        permitStatus: { not: 'REJECTED' },
      },
    }),
    prisma.visaCase.findMany({
      where: {
        expiryDate: { gte: now },
        permitStatus: { in: ['APPROVED', 'RENEWAL_REQUIRED', 'RENEWAL_PENDING', 'RENEWAL_SUBMITTED'] },
      },
      select: { expiryDate: true },
    }),
    prisma.visaCase.count({ where: { permitStatus: { in: inProgressStatuses } } }),
    prisma.visaCase.count({ where: { permitStatus: 'REJECTED' } }),
    prisma.visaCase.count({ where: { permitStatus: 'APPROVED' } }),
    prisma.visaDocument.count({ where: { verifiedStatus: 'PENDING' } }),
    prisma.visaCase.groupBy({
      by: ['workerCategory'],
      _count: { id: true },
    }),
    prisma.visaCase.findMany({
      select: {
        id: true,
        displayId: true,
        workerName: true,
        permitType: true,
        permitStatus: true,
        expiryDate: true,
        renewalDueDate: true,
        updatedAt: true,
      },
    }),
  ]);

  let expiring30 = 0;
  let expiring7 = 0;
  let expiring2 = 0;
  for (const row of futureExpiries) {
    const days = Math.ceil((new Date(row.expiryDate).getTime() - now.getTime()) / 86400000);
    if (days <= 2) expiring2 += 1;
    else if (days <= 7) expiring7 += 1;
    else if (days <= 30) expiring30 += 1;
  }

  const statusBreakdown = {
    pending: newApplications,
    approved,
    rejected,
    total: allCasesForBoard.length,
  };

  const highPriorityCases = allCasesForBoard
    .map((c) => {
      let priorityScore = 0;
      if (c.permitStatus === 'RENEWAL_REQUIRED') priorityScore += 80;
      if (c.permitStatus === 'RENEWAL_PENDING') priorityScore += 65;
      if (c.permitStatus === 'APPLICATION') priorityScore += 45;
      if (c.permitStatus === 'REJECTED') priorityScore += 90;

      if (c.expiryDate) {
        const days = Math.ceil((new Date(c.expiryDate).getTime() - now.getTime()) / 86400000);
        if (days <= 0) priorityScore += 100;
        else if (days <= 15) priorityScore += 70;
        else if (days <= 30) priorityScore += 50;
        else if (days <= 60) priorityScore += 20;
      }
      if (c.renewalDueDate && c.renewalDueDate <= now) {
        priorityScore += 40;
      }
      return { ...c, priorityScore };
    })
    .filter((c) => c.priorityScore >= 50)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      displayId: c.displayId,
      workerName: c.workerName,
      permitType: c.permitType,
      permitStatus: c.permitStatus,
      expiryDate: c.expiryDate,
      renewalDueDate: c.renewalDueDate,
      priorityScore: c.priorityScore,
    }));

  return {
    renewalsThisMonth,
    expiringPermits: { d30: expiring30, d7: expiring7, d2: expiring2 },
    newApplicationsInProgress: newApplications,
    rejectedCases: rejected,
    approvedCases: approved,
    statusBreakdown,
    highPriorityCases,
    missingDocumentsPendingVerification: pendingDocs,
    casesByWorkerCategory: byCategory.map((g) => ({ category: g.workerCategory, count: g._count.id })),
  };
}

module.exports = {
  nextCaseDisplayId,
  renewalDueFromExpiry,
  seedOnboardingItems,
  syncPermitExpiryAlerts,
  getDashboardKpis,
  defaultOnboardingRows,
};

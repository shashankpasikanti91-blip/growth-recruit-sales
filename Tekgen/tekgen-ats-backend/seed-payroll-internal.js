/**
 * Tekgen Internal Staff Payroll Seed
 * Creates employee profiles, salary structures, April 2026 (CLOSED) + May 2026 (DRAFT) payroll runs
 * Approval model: 2-step hierarchy (Payroll Admin -> Executive approver)
 *
 * Local staff:   Jerry (Malaysian, EPF/SOCSO/EIS apply)
 * Expat staff:   Shashank, Savitha, Admin, Payroll Admin (no EPF/SOCSO/EIS, flat PCB)
 * Demo:          Demo Recruiter (local)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── User IDs from DB ──────────────────────────────────────────────────────────
const USERS = {
  admin:   { id: 'cmojetsgu0000qaqhcfn9ehyp', email: 'admin@tekgen.com',   firstName: 'Admin',   lastName: 'Tekgen',    isExpat: true  },
  demo:    { id: 'cmojetti50001qaqh9o3c13hq', email: 'demo@tekgen.com',    firstName: 'Demo',    lastName: 'Recruiter', isExpat: false },
  shashank:{ id: 'cmojetuhg0004qaqhlji1tvk8', email: 'shashank@tekgen.com',firstName: 'Shashank',lastName: 'Pasikanti', isExpat: true  },
  jerry:   { id: 'cmojetvdz0007qaqh9h1wuho7', email: 'jerry@tekgen.com',   firstName: 'Jerry',   lastName: 'Recruiter', isExpat: false },
  savitha: { id: 'cmojetwbc000aqaqhmumdjz0y', email: 'savitha@tekgen.com', firstName: 'Savitha', lastName: 'Recruiter', isExpat: true  },
  payroll: { id: 'cmosqnz1t00008wiotahu5cqg', email: 'payroll@tekgen.com', firstName: 'Payroll', lastName: 'Admin',     isExpat: true  },
};

// Existing employee profile IDs (from DB check)
const EXISTING_PROFILES = {
  payroll:  { id: 'cmosqz0qc00012n69my70u72l', employeeId: 'TKG-EMP-0001' },
  shashank: { id: 'cmot9ost100035yerfe9e7wpd', employeeId: 'TKG-EMP-0002' },
};

// ── Salary config per person ──────────────────────────────────────────────────
const SALARY_CONFIG = {
  admin:    { basic: 8000, allowances: { housingAllowance: 1000, transportAllowance: 500, mealAllowance: 200 }, isExpat: true,  designation: 'Chief Executive Officer',      department: 'Management' },
  payroll:  { basic: 6000, allowances: { housingAllowance: 800,  transportAllowance: 400 },                    isExpat: true,  designation: 'Payroll Administrator',        department: 'Finance & HR' },
  shashank: { basic: 5500, allowances: { housingAllowance: 800,  transportAllowance: 400, skillsAllowance: 300 }, isExpat: true, designation: 'Senior Recruitment Consultant', department: 'Recruitment' },
  savitha:  { basic: 5000, allowances: { housingAllowance: 700,  transportAllowance: 300 },                    isExpat: true,  designation: 'Recruitment Consultant',       department: 'Recruitment' },
  jerry:    { basic: 4500, allowances: { transportAllowance: 300, mealAllowance: 200 },                        isExpat: false, designation: 'Recruitment Executive',        department: 'Recruitment' },
  demo:     { basic: 4000, allowances: { transportAllowance: 200, mealAllowance: 150 },                        isExpat: false, designation: 'Recruitment Analyst',          department: 'Recruitment' },
};

function calcAllowTotal(allowances) {
  return Object.values(allowances || {}).reduce((s, v) => s + v, 0);
}

function calcPayslip(key, basicSalary, allowances) {
  const cfg = SALARY_CONFIG[key];
  const grossSalary = basicSalary + calcAllowTotal(allowances);

  // Malaysian statutory (local only)
  const epfEmployee   = cfg.isExpat ? 0 : Math.round(basicSalary * 0.11 * 100) / 100;
  const epfEmployer   = cfg.isExpat ? 0 : Math.round(basicSalary * 0.13 * 100) / 100;
  // SOCSO capped at RM 4,000 insurable wage
  const socsoBase     = Math.min(basicSalary, 4000);
  const socsoEmployee = cfg.isExpat ? 0 : Math.round(socsoBase * 0.005 * 100) / 100;
  const socsoEmployer = cfg.isExpat ? 0 : Math.round(socsoBase * 0.0175 * 100) / 100;
  // EIS capped at RM 4,000
  const eisEmployee   = cfg.isExpat ? 0 : Math.round(Math.min(basicSalary, 4000) * 0.004 * 100) / 100;
  const eisEmployer   = cfg.isExpat ? 0 : Math.round(Math.min(basicSalary, 4000) * 0.008 * 100) / 100;
  // PCB – simplified flat rate (proper MTD table omitted for demo)
  const incomeTax     = cfg.isExpat
    ? Math.round(grossSalary * 0.10 * 100) / 100   // 10% flat expat rate (demo)
    : Math.round(Math.max(0, (grossSalary * 12 - 34000) / 12 * 0.08) * 100) / 100; // simplified resident
  const hrdf          = cfg.isExpat ? 0 : Math.round(basicSalary * 0.005 * 100) / 100;

  const totalDeductions = epfEmployee + socsoEmployee + eisEmployee + incomeTax;
  const netSalary       = Math.round((grossSalary - totalDeductions) * 100) / 100;

  return { grossSalary, epfEmployee, epfEmployer, socsoEmployee, socsoEmployer, eisEmployee, eisEmployer, incomeTax, hrdf, totalDeductions, netSalary };
}

async function main() {
  console.log('🚀 Starting Tekgen Internal Staff Payroll Seed...\n');

  // ── STEP 1: Create / update employee profiles ──────────────────────────────
  console.log('📋 Step 1: Setting up employee profiles...');

  const profileMap = {}; // key → { id, employeeId }
  let empCounter = 3; // next display ID counter

  for (const [key, u] of Object.entries(USERS)) {
    const cfg = SALARY_CONFIG[key];

    if (EXISTING_PROFILES[key]) {
      // Update existing profile
      await prisma.employeeProfile.update({
        where: { id: EXISTING_PROFILES[key].id },
        data: {
          status: 'ACTIVE',
          employmentType: 'INTERNAL',
          designation:  cfg.designation,
          department:   cfg.department,
          workCountry:  'MY',
          joinDate:     new Date('2025-01-01'),
          nationality:  u.isExpat ? 'India' : 'Malaysia',
        },
      });
      profileMap[key] = EXISTING_PROFILES[key];
      console.log(`  ✓ Updated: ${u.email} → ${EXISTING_PROFILES[key].employeeId}`);
    } else {
      const empId = `TKG-EMP-${String(empCounter).padStart(4, '0')}`;
      empCounter++;
      const profile = await prisma.employeeProfile.upsert({
        where: { userId: u.id },
        update: {
          status: 'ACTIVE',
          employmentType: 'INTERNAL',
          designation: cfg.designation,
          department:  cfg.department,
          workCountry: 'MY',
          joinDate:    new Date('2025-01-01'),
          nationality: u.isExpat ? 'India' : 'Malaysia',
        },
        create: {
          employeeId:    empId,
          userId:        u.id,
          status:        'ACTIVE',
          employmentType:'INTERNAL',
          designation:   cfg.designation,
          department:    cfg.department,
          workCountry:   'MY',
          joinDate:      new Date('2025-01-01'),
          nationality:   u.isExpat ? 'India' : 'Malaysia',
        },
      });
      profileMap[key] = { id: profile.id, employeeId: profile.employeeId };
      console.log(`  ✓ Created: ${u.email} → ${profile.employeeId}`);
    }
  }

  // ── STEP 2: Salary structures (APPROVED) ──────────────────────────────────
  console.log('\n💰 Step 2: Creating approved salary structures...');

  const salaryMap = {}; // key → salaryStructure.id

  for (const [key, cfg] of Object.entries(SALARY_CONFIG)) {
    const profileId = profileMap[key].id;
    // Check if APPROVED structure already exists
    const existing = await prisma.salaryStructure.findFirst({
      where: { employeeId: profileId, status: 'APPROVED' },
    });
    if (existing) {
      salaryMap[key] = existing.id;
      console.log(`  ↩ Exists: ${key} → RM ${existing.basicSalary}`);
      continue;
    }
    const ss = await prisma.salaryStructure.create({
      data: {
        employeeId:    profileId,
        basicSalary:   cfg.basic,
        allowances:    cfg.allowances,
        deductions:    {},
        overtimeRate:  cfg.isExpat ? 0 : Math.round(cfg.basic / 26 / 8 * 1.5 * 100) / 100, // OT rate
        effectiveFrom: new Date('2025-01-01'),
        status:        'APPROVED',
        approvedBy:    USERS.admin.id,
        approvedAt:    new Date('2025-01-01'),
        createdBy:     USERS.payroll.id,
      },
    });
    salaryMap[key] = ss.id;
    console.log(`  ✓ Created: ${key} → RM ${cfg.basic} basic (${cfg.isExpat ? 'Expat' : 'Local'})`);
  }

  // ── STEP 3: Leave balances (2026) ─────────────────────────────────────────
  console.log('\n🏖  Step 3: Setting up leave balances for 2026...');

  const LEAVE_ENTITLEMENTS = {
    ANNUAL:          { local: 12, expat: 14 },
    MEDICAL:         { local: 14, expat: 14 },
    HOSPITALIZATION: { local: 60, expat: 60 },
    COMPASSIONATE:   { local: 3,  expat: 3  },
    REPLACEMENT:     { local: 0,  expat: 0  },
    NO_PAY:          { local: 0,  expat: 0  },
  };

  for (const [key] of Object.entries(USERS)) {
    const profileId = profileMap[key].id;
    const isExpat   = SALARY_CONFIG[key].isExpat;

    for (const [leaveType, ent] of Object.entries(LEAVE_ENTITLEMENTS)) {
      const entitlement = isExpat ? ent.expat : ent.local;
      await prisma.leaveBalance.upsert({
        where: { employeeId_leaveType_year: { employeeId: profileId, leaveType, year: 2026 } },
        update: { entitlement },
        create: { employeeId: profileId, leaveType, year: 2026, entitlement, carryForward: 0, taken: 0, pendingApproval: 0 },
      });
    }
    console.log(`  ✓ ${key}: leave balances set`);
  }

  // ── STEP 4: April 2026 attendance (Mar 25 – Apr 24, 21 working days) ──────
  console.log('\n📅 Step 4: Generating April 2026 attendance records...');

  const WORKING_DAYS_APR = [];
  for (let d = new Date('2026-03-25'); d <= new Date('2026-04-24'); d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) WORKING_DAYS_APR.push(new Date(d));
  }

  for (const [key] of Object.entries(USERS)) {
    const profileId = profileMap[key].id;
    for (const day of WORKING_DAYS_APR) {
      await prisma.attendance.upsert({
        where: { employeeId_date: { employeeId: profileId, date: day } },
        update: {},
        create: {
          employeeId:  profileId,
          date:        day,
          status:      'PRESENT',
          checkInTime: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0, 0),
          checkOutTime:new Date(day.getFullYear(), day.getMonth(), day.getDate(), 18, 0, 0),
          overtimeHours: 0,
        },
      });
    }
    console.log(`  ✓ ${key}: ${WORKING_DAYS_APR.length} attendance records`);
  }

  // ── STEP 5: April 2026 Payroll Run (CLOSED) ───────────────────────────────
  console.log('\n🏦 Step 5: Creating April 2026 payroll run (CLOSED)...');

  // Delete existing April 2026 run if any (for idempotency)
  const existingApr = await prisma.payrollRun.findFirst({ where: { month: 4, year: 2026 } });
  if (existingApr) {
    await prisma.payslip.deleteMany({ where: { payrollRunId: existingApr.id } });
    await prisma.payrollRun.delete({ where: { id: existingApr.id } });
    console.log('  ↩ Deleted existing April 2026 run');
  }

  // Calculate totals
  let totalGross = 0, totalDed = 0, totalNet = 0, totalEmpContrib = 0;
  const payslipData = [];

  for (const [key, cfg] of Object.entries(SALARY_CONFIG)) {
    const profileId = profileMap[key].id;
    const calc = calcPayslip(key, cfg.basic, cfg.allowances);
    totalGross += calc.grossSalary;
    totalDed   += calc.totalDeductions;
    totalNet   += calc.netSalary;
    totalEmpContrib += calc.epfEmployer + calc.socsoEmployer + calc.eisEmployer + calc.hrdf;
    payslipData.push({ key, profileId, cfg, calc });
  }

  const aprRun = await prisma.payrollRun.create({
    data: {
      displayId:            'TKG-PR-0001',
      month:                4,
      year:                 2026,
      runType:              'MONTHLY',
      workerCategory:       'INTERNAL_STAFF',
      status:               'CLOSED',
      totalEmployees:       6,
      grossPayroll:         Math.round(totalGross * 100) / 100,
      totalDeductions:      Math.round(totalDed * 100) / 100,
      employerContributions:Math.round(totalEmpContrib * 100) / 100,
      netPayout:            Math.round(totalNet * 100) / 100,
      exceptions:           [],
      createdBy:            USERS.payroll.id,
      reviewedBy:           USERS.payroll.id,
      approvedBy:           USERS.admin.id,
      publishedAt:          new Date('2026-04-25'),
      closedAt:             new Date('2026-04-25'),
    },
  });

  // Create payslips for April
  let psCounter = 1;
  for (const { profileId, cfg, calc } of payslipData) {
    const displayId = `TKG-PS-${String(psCounter++).padStart(4, '0')}`;
    await prisma.payslip.create({
      data: {
        displayId,
        payrollRunId:       aprRun.id,
        employeeId:         profileId,
        month:              4,
        year:               2026,
        basicSalary:        cfg.basic,
        allowances:         cfg.allowances,
        overtimePay:        0,
        bonus:              0,
        approvedClaims:     0,
        grossSalary:        calc.grossSalary,
        epfEmployee:        calc.epfEmployee,
        socsoEmployee:      calc.socsoEmployee,
        eisEmployee:        calc.eisEmployee,
        incomeTax:          calc.incomeTax,
        otherDeductions:    0,
        unpaidLeaveDeduction:0,
        totalDeductions:    calc.totalDeductions,
        epfEmployer:        calc.epfEmployer,
        socsoEmployer:      calc.socsoEmployer,
        eisEmployer:        calc.eisEmployer,
        hrdf:               calc.hrdf,
        netSalary:          calc.netSalary,
        status:             'PAID',
        generatedAt:        new Date('2026-04-25'),
        publishedAt:        new Date('2026-04-25'),
        paidAt:             new Date('2026-04-25'),
        createdBy:          USERS.payroll.id,
      },
    });
  }

  console.log(`  ✓ April 2026 run: TKG-PR-0001 | Gross RM ${totalGross.toFixed(2)} | Net RM ${totalNet.toFixed(2)} | 6 payslips`);

  // ── STEP 6: May 2026 Payroll Run (DRAFT – current period) ─────────────────
  console.log('\n📝 Step 6: Creating May 2026 payroll run (DRAFT)...');

  const existingMay = await prisma.payrollRun.findFirst({ where: { month: 5, year: 2026 } });
  if (existingMay) {
    await prisma.payslip.deleteMany({ where: { payrollRunId: existingMay.id } });
    await prisma.payrollRun.delete({ where: { id: existingMay.id } });
    console.log('  ↩ Deleted existing May 2026 run');
  }

  const mayRun = await prisma.payrollRun.create({
    data: {
      displayId:      'TKG-PR-0002',
      month:          5,
      year:           2026,
      runType:        'MONTHLY',
      workerCategory: 'INTERNAL_STAFF',
      status:         'DRAFT',
      totalEmployees: 6,
      grossPayroll:   0,
      totalDeductions:0,
      netPayout:      0,
      exceptions:     [],
      createdBy:      USERS.payroll.id,
    },
  });

  // Create DRAFT payslips for May
  for (const { profileId, cfg, calc } of payslipData) {
    const displayId = `TKG-PS-${String(psCounter++).padStart(4, '0')}`;
    await prisma.payslip.create({
      data: {
        displayId,
        payrollRunId:       mayRun.id,
        employeeId:         profileId,
        month:              5,
        year:               2026,
        basicSalary:        cfg.basic,
        allowances:         cfg.allowances,
        overtimePay:        0,
        bonus:              0,
        approvedClaims:     0,
        grossSalary:        calc.grossSalary,
        epfEmployee:        calc.epfEmployee,
        socsoEmployee:      calc.socsoEmployee,
        eisEmployee:        calc.eisEmployee,
        incomeTax:          calc.incomeTax,
        otherDeductions:    0,
        unpaidLeaveDeduction:0,
        totalDeductions:    calc.totalDeductions,
        epfEmployer:        calc.epfEmployer,
        socsoEmployer:      calc.socsoEmployer,
        eisEmployer:        calc.eisEmployer,
        hrdf:               calc.hrdf,
        netSalary:          calc.netSalary,
        status:             'DRAFT',
        createdBy:          USERS.payroll.id,
      },
    });
  }

  console.log(`  ✓ May 2026 run: TKG-PR-0002 | DRAFT (period Apr 25 – May 24) | 6 draft payslips`);

  // ── STEP 7: Payroll approval steps for April (closed) ────────────────────
  console.log('\n✅ Step 7: Adding payroll approvals for April 2026...');

  await prisma.payrollApproval.upsert({
    where: { payrollRunId_step: { payrollRunId: aprRun.id, step: 1 } },
    update: {},
    create: {
      payrollRunId: aprRun.id,
      step: 1, stepName: 'Payroll Admin Review', requiredRole: 'PAYROLL_ADMIN',
      status: 'APPROVED', approvedBy: USERS.payroll.id, approvedAt: new Date('2026-04-24T10:00:00Z'),
      submittedBy: USERS.payroll.id, submittedAt: new Date('2026-04-24T09:00:00Z'),
    },
  });
  await prisma.payrollApproval.upsert({
    where: { payrollRunId_step: { payrollRunId: aprRun.id, step: 2 } },
    update: {},
    create: {
      payrollRunId: aprRun.id,
      step: 2, stepName: 'MD / Director Approval', requiredRole: 'MANAGEMENT',
      status: 'APPROVED', approvedBy: USERS.admin.id, approvedAt: new Date('2026-04-24T14:00:00Z'),
      submittedBy: USERS.payroll.id, submittedAt: new Date('2026-04-24T10:00:00Z'),
    },
  });
  await prisma.payrollApproval.deleteMany({
    where: {
      payrollRunId: aprRun.id,
      step: { gt: 2 }
    }
  });

  console.log('  ✓ 2 approval steps recorded for April 2026 (Payroll Admin -> Executive)');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log('✅ SEED COMPLETE — Summary:');
  console.log(`   6 employee profiles (Local: Jerry, Demo | Expat: Shashank, Savitha, Admin, PayrollAdmin)`);
  console.log(`   6 approved salary structures`);
  console.log(`   ${WORKING_DAYS_APR.length * 6} attendance records (April period)`);
  console.log(`   April 2026: TKG-PR-0001 CLOSED — Gross RM ${totalGross.toFixed(2)} / Net RM ${totalNet.toFixed(2)}`);
  console.log(`   May 2026:   TKG-PR-0002 DRAFT  — Period: Apr 25 – May 24`);
  console.log('══════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Seed failed:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});

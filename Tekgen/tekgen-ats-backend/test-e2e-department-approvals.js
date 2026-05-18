/**
 * E2E: leave approval chain per department (L1 department manager → L2 MD/Admin).
 * Uses DB-driven approvers (assignedTo on LeaveApproval) + demo passwords from
 * shared/demoWorkspaceAccounts.js. Creates minimal synthetic EMPLOYEE rows where
 * the demo set has no staff for Sales / HR Ops / Finance.
 *
 * Usage: npm run test:e2e:department-approvals
 * Env:
 *   API_BASE (default http://localhost:5000/api)
 *   E2E_ALIGN_MANAGERS=true — update demo managers' user.department/role so L1 resolution
 *     matches seeded labels (avoid on shared production-like DBs).
 * CLI: pass --align for the same behavior (used by test:e2e:unified).
 */
const axios = require('axios');
const prisma = require('./src/config/database');
const { encryptPassword } = require('./src/utils/encryption');
const config = require('./src/config/environment');
const { DEMO_WORKSPACE_ACCOUNTS } = require('../shared/demoWorkspaceAccounts');

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';
const E2E_SYNTH_PASSWORD = 'E2eDept@2026';

const ALIGN_MANAGERS =
  ['true', '1', 'yes'].includes(String(process.env.E2E_ALIGN_MANAGERS || '').toLowerCase()) ||
  process.argv.includes('--align');

const MD = { email: 'kavitha@tekgen.com.my', password: 'Kavitha@2026' };
const PAYROLL_STAFF = { email: 'sumanth@tekgen.com.my', password: 'Sumanth@2026' };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Password for legacy Sales L1 row when present in DB (not in demoWorkspaceAccounts — avoids duplicate SALES_MANAGER role keys). */
const LEGACY_SALES_MANAGER_EMAIL = 'sales.manager@tekgen.com';
const LEGACY_SALES_MANAGER_PASSWORD = 'SalesMgr@2026';

function demoPasswordMap() {
  const m = new Map();
  for (const a of DEMO_WORKSPACE_ACCOUNTS) {
    m.set(a.email.toLowerCase(), a.password);
  }
  m.set(MD.email.toLowerCase(), MD.password);
  m.set(PAYROLL_STAFF.email.toLowerCase(), PAYROLL_STAFF.password);
  m.set(LEGACY_SALES_MANAGER_EMAIL, LEGACY_SALES_MANAGER_PASSWORD);
  return m;
}

const PASSWORD_BY_EMAIL = demoPasswordMap();

async function login(email, password) {
  const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
  const token = res?.data?.data?.token;
  assert(token, `Login failed for ${email}`);
  return token;
}

async function api(token, method, path, data) {
  const res = await axios({
    method,
    url: `${API_BASE}${path}`,
    data,
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

async function ensureDeptEmployee({ email, password, firstName, lastName, department }) {
  let user = await prisma.user.findUnique({ where: { email } });
  const hashedPassword = await encryptPassword(password, config.BCRYPT_ROUNDS || 10);

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'EMPLOYEE',
        department,
        isActive: true,
        loginAttempts: 0,
        isAccountLocked: false,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName,
        lastName,
        role: 'EMPLOYEE',
        department,
        isActive: true,
        isAccountLocked: false,
        loginAttempts: 0,
        password: hashedPassword,
      },
    });
  }

  let profile = await prisma.employeeProfile.findUnique({ where: { userId: user.id } });
  const joinDate = new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1);

  if (!profile) {
    const count = await prisma.employeeProfile.count();
    const employeeId = `TKG-EMP-${String(count + 5000).padStart(4, '0')}`;
    profile = await prisma.employeeProfile.create({
      data: {
        employeeId,
        userId: user.id,
        department,
        employmentType: 'INTERNAL',
        staffType: 'INTERNAL',
        status: 'ACTIVE',
        joinDate,
        designation: 'E2E Department Staff',
        bankName: 'Maybank',
        bankAccountNo: '700012349999',
        epfNumber: `EPF-${employeeId}`,
        socsoNumber: `SOCSO-${employeeId}`,
        eisNumber: `EIS-${employeeId}`,
      },
    });
  } else {
    profile = await prisma.employeeProfile.update({
      where: { id: profile.id },
      data: {
        department,
        employmentType: 'INTERNAL',
        staffType: 'INTERNAL',
        status: 'ACTIVE',
        joinDate,
      },
    });
  }

  const existingSal = await prisma.salaryStructure.findFirst({
    where: { employeeId: profile.id, status: 'APPROVED' },
  });
  if (!existingSal) {
    await prisma.salaryStructure.create({
      data: {
        employeeId: profile.id,
        basicSalary: 4500,
        payFrequency: 'MONTHLY',
        allowances: { transportAllowance: 200 },
        deductions: {},
        effectiveFrom: joinDate,
        status: 'APPROVED',
        approvedAt: new Date(),
        createdBy: user.id,
        approvedBy: user.id,
      },
    });
  }

  return { user, profile };
}

async function applyLeave(token, leaveType, startDate, endDate, reason) {
  const res = await api(token, 'post', '/my/leave', {
    leaveType,
    startDate,
    endDate,
    reason,
    session: 'FULL_DAY',
  });
  const request = res?.data?.request;
  assert(request?.id, `Leave apply failed: ${JSON.stringify(res?.data || res)}`);
  return request.id;
}

async function approveLeave(token, leaveId, approvalId, comment) {
  await api(token, 'post', `/payroll/approver/leaves/${leaveId}/action`, {
    action: 'APPROVE',
    comments: comment,
    approvalId,
  });
}

function passwordForApproverEmail(email) {
  const p = PASSWORD_BY_EMAIL.get(email.toLowerCase());
  assert(p, `No known demo password for approver ${email}; add to demoWorkspaceAccounts or ensureDeptEmployee synth accounts only.`);
  return p;
}

async function approveLeaveThroughChain(leaveId) {
  for (let step = 0; step < 6; step += 1) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { approvals: { orderBy: { approvalLevel: 'asc' } } },
    });
    assert(leave, 'Leave not found');
    if (leave.status === 'APPROVED') return;
    assert(leave.status !== 'REJECTED', 'Leave rejected during chain');
    const pending = (leave.approvals || []).find((a) => a.status === 'PENDING');
    assert(pending, `No pending approval step for leave ${leaveId} (step ${step})`);
    assert(pending.assignedTo, 'Pending approval missing assignedTo');

    const approver = await prisma.user.findUnique({ where: { id: pending.assignedTo } });
    assert(approver?.email, 'Approver user missing');

    const pwd = passwordForApproverEmail(approver.email);
    const token = await login(approver.email, pwd);
    await approveLeave(token, leaveId, pending.id, `E2E L${pending.approvalLevel} approve (${approver.email})`);
  }
  assert(false, 'Approval chain did not complete within max steps');
}

async function execQueueRow(mdToken, leaveId) {
  const res = await api(mdToken, 'get', '/hrms/executive/pending-queue?limit=500');
  const leaves = res?.data?.leaves || [];
  return leaves.find((x) => x?.leaveRequest?.id === leaveId) || null;
}

/** Keeps L1 routing stable if HRMS promotions drifted user.department away from dept labels. */
async function alignDemoManagers() {
  const fixed = [
    { email: 'sreenivasa.gadde@tekgen.com.my', department: 'Recruitment', role: 'RECRUITMENT_MANAGER' },
    { email: 'deepa@tekgen.com.my', department: 'Sales', role: 'SALES_MANAGER' },
    { email: 'archana.naik@tekgen.com.my', department: 'Payroll', role: 'PAYROLL_ADMIN' },
    { email: 'hrops.manager@tekgen.com', department: 'HR Operations', role: 'HR_ADMIN' },
    { email: 'finance.manager@tekgen.com', department: 'Finance', role: 'FINANCE_HEAD' },
    { email: LEGACY_SALES_MANAGER_EMAIL, department: 'Sales', role: 'SALES_MANAGER' },
  ];
  const rounds = config.BCRYPT_ROUNDS || 10;
  for (const p of fixed) {
    const u = await prisma.user.findUnique({ where: { email: p.email } });
    if (!u) continue;
    const acct = DEMO_WORKSPACE_ACCOUNTS.find((a) => a.email.toLowerCase() === p.email.toLowerCase());
    let hashedPassword = null;
    if (acct) {
      hashedPassword = await encryptPassword(acct.password, rounds);
    } else if (p.email.toLowerCase() === LEGACY_SALES_MANAGER_EMAIL) {
      hashedPassword = await encryptPassword(LEGACY_SALES_MANAGER_PASSWORD, rounds);
    }
    await prisma.user.update({
      where: { id: u.id },
      data: {
        department: p.department,
        role: p.role,
        ...(hashedPassword
          ? { password: hashedPassword, loginAttempts: 0, isAccountLocked: false }
          : {}),
      },
    });
  }
}

async function run() {
  console.log('\n=== Department leave approvals E2E (L1 → L2) ===\n');

  if (ALIGN_MANAGERS) {
    console.log('Applying demo manager department/role alignment (--align or E2E_ALIGN_MANAGERS).\n');
    await alignDemoManagers();
  } else {
    console.log(
      'Skipping manager DB alignment (safe for shared DBs). If L1 routing fails or leaves auto-approve, re-run with --align or E2E_ALIGN_MANAGERS=true.\n'
    );
  }

  const mdToken = await login(MD.email, MD.password);
  const warmup = await api(mdToken, 'get', '/hrms/executive/pending-queue?limit=5');
  const mods = warmup?.data?.modules;
  assert(mods && typeof mods.visaApplicationsPending === 'number', 'Executive pending-queue should include modules KPIs');

  const scenarios = [];

  scenarios.push({
    label: 'Recruitment (demo recruiter)',
    staffEmail: 'shashank.pasikanti@tekgen.com.my',
    staffPassword: 'Shashank@2026',
    dayOffset: 1,
  });

  await ensureDeptEmployee({
    email: 'e2e-dept-sales@tekgen-test.local',
    password: E2E_SYNTH_PASSWORD,
    firstName: 'E2E',
    lastName: 'SalesStaff',
    department: 'Sales',
  });
  PASSWORD_BY_EMAIL.set('e2e-dept-sales@tekgen-test.local', E2E_SYNTH_PASSWORD);

  scenarios.push({
    label: 'Sales (synthetic staff)',
    staffEmail: 'e2e-dept-sales@tekgen-test.local',
    staffPassword: E2E_SYNTH_PASSWORD,
    dayOffset: 2,
  });

  await ensureDeptEmployee({
    email: PAYROLL_STAFF.email,
    password: PAYROLL_STAFF.password,
    firstName: 'Sumanth',
    lastName: 'Payroll',
    department: 'Payroll',
  });
  PASSWORD_BY_EMAIL.set(PAYROLL_STAFF.email.toLowerCase(), PAYROLL_STAFF.password);

  scenarios.push({
    label: 'Payroll (e2e staff)',
    staffEmail: PAYROLL_STAFF.email,
    staffPassword: PAYROLL_STAFF.password,
    dayOffset: 3,
  });

  await ensureDeptEmployee({
    email: 'e2e-dept-hrops@tekgen-test.local',
    password: E2E_SYNTH_PASSWORD,
    firstName: 'E2E',
    lastName: 'HROpsStaff',
    department: 'HR Operations',
  });
  PASSWORD_BY_EMAIL.set('e2e-dept-hrops@tekgen-test.local', E2E_SYNTH_PASSWORD);

  scenarios.push({
    label: 'HR Operations (synthetic staff)',
    staffEmail: 'e2e-dept-hrops@tekgen-test.local',
    staffPassword: E2E_SYNTH_PASSWORD,
    dayOffset: 4,
  });

  await ensureDeptEmployee({
    email: 'e2e-dept-finance@tekgen-test.local',
    password: E2E_SYNTH_PASSWORD,
    firstName: 'E2E',
    lastName: 'FinanceStaff',
    department: 'Finance',
  });
  PASSWORD_BY_EMAIL.set('e2e-dept-finance@tekgen-test.local', E2E_SYNTH_PASSWORD);

  scenarios.push({
    label: 'Finance (synthetic staff)',
    staffEmail: 'e2e-dept-finance@tekgen-test.local',
    staffPassword: E2E_SYNTH_PASSWORD,
    dayOffset: 5,
  });

  const base = new Date();
  const leaveIds = [];

  for (const s of scenarios) {
    console.log(`→ ${s.label}: submit leave`);
    const st = await login(s.staffEmail, s.staffPassword);
    const start = new Date(base.getFullYear(), base.getMonth() + 1, Math.min(26, 20 + s.dayOffset));
    const end = new Date(start);
    const isoStart = start.toISOString();
    const isoEnd = end.toISOString();
    const leaveId = await applyLeave(st, 'ANNUAL', isoStart, isoEnd, `E2E annual ${s.label}`);
    leaveIds.push({ id: leaveId, label: s.label });

    const rowCheck = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
    assert(
      rowCheck?.status === 'PENDING_APPROVAL',
      `Leave ${leaveId} should be PENDING_APPROVAL for exec visibility (got ${rowCheck?.status}). Missing dept manager?`
    );

    const rowBefore = await execQueueRow(mdToken, leaveId);
    assert(rowBefore, 'MD executive queue should list new pending leave');
    assert(rowBefore.canApprove === false, 'MD should not be actionable at L1 (department manager first)');
  }

  for (const { id, label } of leaveIds) {
    console.log(`→ ${label}: L1 + L2 approval chain`);
    await approveLeaveThroughChain(id);
    const final = await prisma.leaveRequest.findUnique({ where: { id } });
    assert(final?.status === 'APPROVED', `Expected APPROVED leave for ${label}, got ${final?.status}`);
    const rowAfter = await execQueueRow(mdToken, id);
    assert(!rowAfter, 'Approved leave should not appear as pending in executive queue');
  }

  console.log('\n✅ Department approvals E2E completed successfully\n');
}

run()
  .catch((err) => {
    const status = err?.response?.status;
    const body = err?.response?.data;
    console.error('❌ Department approvals E2E failed:', err.message);
    if (status) console.error('HTTP status:', status);
    if (body) console.error('Response:', JSON.stringify(body, null, 2));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

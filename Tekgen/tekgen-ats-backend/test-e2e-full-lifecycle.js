/**
 * Full lifecycle E2E:
 * - Create/update 2 realistic users (internal + external)
 * - Apply leaves from employee side
 * - Approve at L1 manager + L2 MD
 * - Run payroll lifecycle and publish payslips
 * - Verify employee payslip visibility
 *
 * Safety:
 * - No truncate/delete/wipe operations
 * - Only upsert-like create/update for dedicated test accounts
 */
const axios = require('axios');
const prisma = require('./src/config/database');
const { encryptPassword } = require('./src/utils/encryption');
const config = require('./src/config/environment');

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';

const ACCOUNTS = {
  kavitha: { email: 'kavitha@tekgen.com.my', password: 'Kavitha@2026' },
  payrollManager: { email: 'archana.naik@tekgen.com.my', password: 'Archana@2026' },
  sumanth: { email: 'sumanth@tekgen.com.my', password: 'Sumanth@2026' },
  manohar: { email: 'manohar@tekgen.com.my', password: 'Manohar@2026' },
};

/** Stable client-side approver for deployed staff leave chain (Client → MD). */
const CLIENT_APPROVER_EMAIL = 'e2e-client-approver@tekgen-test.local';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

async function ensureUserAndProfile({
  email,
  password,
  firstName,
  lastName,
  role,
  department,
  employmentType,
  staffType,
  joinDate
}) {
  let user = await prisma.user.findUnique({ where: { email } });
  const hashedPassword = await encryptPassword(password, config.BCRYPT_ROUNDS || 10);

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        department,
        isActive: true,
        loginAttempts: 0,
        isAccountLocked: false
      }
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        firstName,
        lastName,
        role,
        department,
        isActive: true,
        isAccountLocked: false,
        loginAttempts: 0
      }
    });
  }

  let profile = await prisma.employeeProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    const count = await prisma.employeeProfile.count();
    const employeeId = `TKG-EMP-${String(count + 1000).padStart(4, '0')}`;
    profile = await prisma.employeeProfile.create({
      data: {
        employeeId,
        userId: user.id,
        department,
        employmentType,
        staffType,
        status: 'ACTIVE',
        joinDate,
        designation: staffType === 'DEPLOYED' ? 'Deployed Staff' : 'Payroll Associate',
        bankName: 'Maybank',
        bankAccountNo: staffType === 'DEPLOYED' ? '700012341111' : '700012340000',
        epfNumber: `EPF-${employeeId}`,
        socsoNumber: `SOCSO-${employeeId}`,
        eisNumber: `EIS-${employeeId}`,
      }
    });
  } else {
    profile = await prisma.employeeProfile.update({
      where: { id: profile.id },
      data: {
        department,
        employmentType,
        staffType,
        status: 'ACTIVE',
        joinDate,
        bankName: profile.bankName || 'Maybank',
        bankAccountNo: profile.bankAccountNo || (staffType === 'DEPLOYED' ? '700012341111' : '700012340000'),
        epfNumber: profile.epfNumber || `EPF-${profile.employeeId}`,
        socsoNumber: profile.socsoNumber || `SOCSO-${profile.employeeId}`,
        eisNumber: profile.eisNumber || `EIS-${profile.employeeId}`,
      }
    });
  }

  await prisma.salaryStructure.create({
    data: {
      employeeId: profile.id,
      basicSalary: staffType === 'DEPLOYED' ? 4200 : 4800,
      payFrequency: 'MONTHLY',
      allowances: { transportAllowance: 200, mealAllowance: 100 },
      deductions: {},
      effectiveFrom: joinDate,
      status: 'APPROVED',
      approvedAt: new Date(),
      createdBy: user.id,
      approvedBy: user.id,
    }
  });

  return { user, profile };
}

async function ensureDeployedClientLeaveChain({ employeeProfileId }) {
  const password = 'Client@2026';
  const hashedPassword = await encryptPassword(password, config.BCRYPT_ROUNDS || 10);
  let clientUser = await prisma.user.findUnique({ where: { email: CLIENT_APPROVER_EMAIL } });
  if (!clientUser) {
    clientUser = await prisma.user.create({
      data: {
        email: CLIENT_APPROVER_EMAIL,
        password: hashedPassword,
        firstName: 'E2E',
        lastName: 'ClientApprover',
        role: 'CLIENT_APPROVER',
        department: 'Operations',
        isActive: true,
        loginAttempts: 0,
        isAccountLocked: false,
      },
    });
  } else {
    clientUser = await prisma.user.update({
      where: { id: clientUser.id },
      data: {
        password: hashedPassword,
        role: 'CLIENT_APPROVER',
        isActive: true,
        isAccountLocked: false,
        loginAttempts: 0,
      },
    });
  }

  const displayId = 'E2E-CLI-DEPLOY';
  let client = await prisma.client.findFirst({ where: { displayId } });
  if (!client) {
    client = await prisma.client.create({
      data: {
        displayId,
        clientName: 'E2E Deployed Client',
        status: 'ACTIVE',
        primaryContactEmail: CLIENT_APPROVER_EMAIL,
      },
    });
  }

  const existingAg = await prisma.paymentAgreement.findFirst({
    where: { employeeId: employeeProfileId },
    orderBy: { createdAt: 'desc' },
  });
  if (existingAg) {
    await prisma.paymentAgreement.update({
      where: { id: existingAg.id },
      data: {
        clientId: client.id,
        clientLeaveApproverUserId: clientUser.id,
        staffType: 'DEPLOYED',
        status: 'ACTIVE',
      },
    });
  } else {
    await prisma.paymentAgreement.create({
      data: {
        employeeId: employeeProfileId,
        clientId: client.id,
        clientLeaveApproverUserId: clientUser.id,
        staffType: 'DEPLOYED',
        paymentType: 'MONTHLY_SALARY',
        startDate: new Date(),
        status: 'ACTIVE',
      },
    });
  }
}

async function applyLeave(token, leaveType, startDate, endDate, reason) {
  const res = await api(token, 'post', '/my/leave', {
    leaveType,
    startDate,
    endDate,
    reason,
    session: 'FULL_DAY'
  });
  const request = res?.data?.request;
  assert(request?.id, `Leave apply failed for ${leaveType}`);
  return request.id;
}

async function approveLeaveWithToken(token, leaveId, action, comments, extra = {}) {
  await api(token, 'post', `/payroll/approver/leaves/${leaveId}/action`, {
    action,
    comments,
    ...extra,
  });
}

async function getPendingLeaveIds(token) {
  const res = await api(token, 'get', '/payroll/approver/leaves?status=PENDING&limit=500');
  return (res?.data?.approvals || []).map((x) => x?.leaveRequest?.id).filter(Boolean);
}

async function run() {
  console.log('\n=== Full Lifecycle E2E (No Wipe) ===');
  const now = new Date();
  const threeMonthsBack = new Date(now.getFullYear(), now.getMonth() - 3, 5);

  console.log('1) Ensuring test users/profiles...');
  await ensureUserAndProfile({
    email: ACCOUNTS.sumanth.email,
    password: ACCOUNTS.sumanth.password,
    firstName: 'Sumanth',
    lastName: 'Payroll',
    role: 'EMPLOYEE',
    department: 'Payroll',
    employmentType: 'INTERNAL',
    staffType: 'INTERNAL',
    joinDate: threeMonthsBack
  });
  const manoharCtx = await ensureUserAndProfile({
    email: ACCOUNTS.manohar.email,
    password: ACCOUNTS.manohar.password,
    firstName: 'Manohar',
    lastName: 'External',
    role: 'EMPLOYEE',
    department: 'Payroll',
    employmentType: 'DEPLOYED',
    staffType: 'DEPLOYED',
    joinDate: threeMonthsBack
  });
  await ensureDeployedClientLeaveChain({ employeeProfileId: manoharCtx.profile.id });
  console.log('✅ Users ready (deployed client leave chain configured)');

  console.log('2) Logging in test actors...');
  const kavithaToken = await login(ACCOUNTS.kavitha.email, ACCOUNTS.kavitha.password);
  const payrollManagerToken = await login(ACCOUNTS.payrollManager.email, ACCOUNTS.payrollManager.password);
  const sumanthToken = await login(ACCOUNTS.sumanth.email, ACCOUNTS.sumanth.password);
  const manoharToken = await login(ACCOUNTS.manohar.email, ACCOUNTS.manohar.password);
  const clientApproverToken = await login(CLIENT_APPROVER_EMAIL, 'Client@2026');
  console.log('✅ Logins verified');

  console.log('3) Submitting leaves (medical + annual for each user)...');
  const start1 = new Date(now.getFullYear(), now.getMonth(), 3).toISOString();
  const end1 = new Date(now.getFullYear(), now.getMonth(), 3).toISOString();
  const start2 = new Date(now.getFullYear(), now.getMonth(), 10).toISOString();
  const end2 = new Date(now.getFullYear(), now.getMonth(), 14).toISOString();

  const leaveIds = [];
  leaveIds.push(await applyLeave(sumanthToken, 'MEDICAL', start1, end1, 'Medical checkup'));
  leaveIds.push(await applyLeave(sumanthToken, 'ANNUAL', start2, end2, 'Annual leave plan'));
  leaveIds.push(await applyLeave(manoharToken, 'MEDICAL', start1, end1, 'Medical rest'));
  leaveIds.push(await applyLeave(manoharToken, 'ANNUAL', start2, end2, 'Annual leave plan'));
  console.log(`✅ Leaves submitted: ${leaveIds.length}`);

  console.log('4) Validating MD pending mapping before approvals...');
  const kpisBefore = await api(kavithaToken, 'get', '/hrms/kpis');
  const pendingLeavesBefore = kpisBefore?.data?.pendingActions?.leaves ?? 0;
  assert(pendingLeavesBefore >= 1, 'Expected pending leaves in MD KPI before approvals');
  const execLeavesBefore = await api(kavithaToken, 'get', '/hrms/leaves/pending?limit=200');
  assert((execLeavesBefore?.data?.leaves || []).length >= 1, 'Expected executive leave list before approvals');
  console.log(`✅ MD pending leaves before approvals: ${pendingLeavesBefore}`);

  console.log('5) Level-1 approvals (internal: manager, deployed: client approver)...');
  const l1ManagerPending = new Set(await getPendingLeaveIds(payrollManagerToken));
  const l1ClientPending = new Set(await getPendingLeaveIds(clientApproverToken));
  for (const leaveId of leaveIds) {
    const row = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { employee: { select: { employmentType: true, staffType: true } } },
    });
    const deployed =
      row?.employee?.employmentType === 'DEPLOYED' || row?.employee?.staffType === 'DEPLOYED';
    if (deployed) {
      if (l1ClientPending.has(leaveId)) {
        await approveLeaveWithToken(clientApproverToken, leaveId, 'APPROVE', 'Client L1 approved (E2E)');
      }
    } else if (l1ManagerPending.has(leaveId)) {
      await approveLeaveWithToken(payrollManagerToken, leaveId, 'APPROVE', 'L1 approved by Payroll Manager');
    }
  }
  console.log('✅ L1 approvals completed');

  console.log('6) Level-2 approvals by Kavitha (MD/Admin)...');
  const l2PendingIds = new Set(await getPendingLeaveIds(kavithaToken));
  for (const leaveId of leaveIds) {
    if (l2PendingIds.has(leaveId)) {
      await approveLeaveWithToken(kavithaToken, leaveId, 'APPROVE', 'L2 final approval by MD');
    }
  }
  const approvedLeaves = await prisma.leaveRequest.count({
    where: { id: { in: leaveIds }, status: 'APPROVED' }
  });
  assert(approvedLeaves >= 2, `Expected approved leaves, got ${approvedLeaves}`);
  console.log(`✅ Leaves approved: ${approvedLeaves}/${leaveIds.length}`);

  console.log('7) Running payroll lifecycle...');
  const runType = `E2E_${Date.now()}`;
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const createRun = await api(payrollManagerToken, 'post', '/payroll/runs', {
    month,
    year,
    runType,
    workerCategory: 'BOTH'
  });
  const runId = createRun?.data?.id;
  assert(runId, 'Payroll run creation failed');
  await api(payrollManagerToken, 'post', `/payroll/runs/${runId}/validate`);
  await api(payrollManagerToken, 'put', `/payroll/runs/${runId}/review`, { corrections: [] });

  const payrollApprovalsL1 = await api(payrollManagerToken, 'get', '/payroll/approvals');
  const l1Approval = (payrollApprovalsL1?.data || []).find((x) => x.payrollRunId === runId && x.requiredRole === 'PAYROLL_ADMIN');
  assert(l1Approval?.id, 'Missing payroll L1 approval step');
  await api(payrollManagerToken, 'post', `/payroll/approvals/${l1Approval.id}/approve`, { notes: 'E2E L1 approve' });

  const payrollApprovalsL2 = await api(kavithaToken, 'get', '/payroll/approvals');
  const l2Approval = (payrollApprovalsL2?.data || []).find((x) => x.payrollRunId === runId && x.requiredRole === 'MANAGEMENT');
  assert(l2Approval?.id, 'Missing payroll L2 approval step');
  await api(kavithaToken, 'post', `/payroll/approvals/${l2Approval.id}/approve`, { notes: 'E2E L2 approve' });

  await api(payrollManagerToken, 'post', `/payroll/runs/${runId}/generate-payslips`);
  await api(payrollManagerToken, 'post', `/payroll/runs/${runId}/publish`);
  console.log('✅ Payroll generated and published');

  console.log('8) Verifying payslips in employee workspaces...');
  // High limit: repeated E2E runs can accumulate many payslips in the same calendar month (API orders by period only).
  const psQuery = `month=${month}&year=${year}&limit=500`;
  const sumanthPayslips = await api(sumanthToken, 'get', `/payroll/my-payslips?${psQuery}`);
  const manoharPayslips = await api(manoharToken, 'get', `/payroll/my-payslips?${psQuery}`);
  const hasSumanthPayslip = (sumanthPayslips?.data?.payslips || []).some((p) => p.payrollRunId === runId);
  const hasManoharPayslip = (manoharPayslips?.data?.payslips || []).some((p) => p.payrollRunId === runId);
  assert(hasSumanthPayslip, 'Sumanth payslip missing');
  assert(hasManoharPayslip, 'Manohar payslip missing');
  console.log('✅ Both users received payslips');

  console.log('9) Validating MD pending mapping after approvals...');
  const kpisAfter = await api(kavithaToken, 'get', '/hrms/kpis');
  const pendingLeavesAfter = kpisAfter?.data?.pendingActions?.leaves ?? 0;
  console.log(`✅ MD pending leaves after approvals: ${pendingLeavesAfter}`);

  console.log('\n✅ Full lifecycle E2E completed successfully\n');
}

run()
  .catch((err) => {
    const status = err?.response?.status;
    const body = err?.response?.data;
    console.error('❌ Full lifecycle E2E failed:', err.message);
    if (status) console.error('HTTP status:', status);
    if (body) console.error('Response:', JSON.stringify(body, null, 2));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

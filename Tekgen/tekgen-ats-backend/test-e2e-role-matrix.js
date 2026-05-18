/**
 * Role-based E2E smoke suite for cross-department access mapping.
 * Verifies sensitive payroll visibility does not leak to unrelated roles.
 */
const axios = require('axios');
const prisma = require('./src/config/database');
const { DEMO_WORKSPACE_ACCOUNTS } = require('../shared/demoWorkspaceAccounts');

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';

const byRole = new Map(DEMO_WORKSPACE_ACCOUNTS.map((a) => [a.role, a]));

const requiredAccounts = [
  'ADMIN',
  'PAYROLL_ADMIN',
  'HR_ADMIN',
  'FINANCE_HEAD',
  'SALES_MANAGER',
  'RECRUITER',
  'VISA_ADMIN'
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function login(role) {
  const account = byRole.get(role);
  assert(account, `Missing seeded account for role ${role}`);
  const res = await axios.post(`${API_BASE}/auth/login`, {
    email: account.email,
    password: account.password
  });
  const payload = res.data?.data;
  assert(payload?.token, `No token for role ${role}`);
  return payload.token;
}

async function request(token, method, path, data) {
  try {
    const res = await axios({
      method,
      url: `${API_BASE}${path}`,
      headers: { Authorization: `Bearer ${token}` },
      ...(data !== undefined ? { data } : {}),
    });
    return { ok: true, status: res.status, data: res.data };
  } catch (error) {
    const status = error?.response?.status || 0;
    return { ok: false, status, data: error?.response?.data };
  }
}

async function runOnce(iteration) {
  console.log(`\n=== Role Matrix Iteration ${iteration} ===`);
  requiredAccounts.forEach((r) => assert(byRole.has(r), `Seed account missing for ${r}`));

  const tokens = {};
  for (const role of requiredAccounts) {
    tokens[role] = await login(role);
    console.log(`✅ login ${role}`);
  }

  // ADMIN: Operations Hub KPI + payroll visibility
  {
    const kpi = await request(tokens.ADMIN, 'get', '/hrms/kpis');
    assert(kpi.ok, 'ADMIN should access /hrms/kpis');
    const pendingRuns = kpi.data?.data?.payroll?.pendingRuns;
    assert(typeof pendingRuns === 'number', 'KPI payroll.pendingRuns should be numeric');
    const ops = kpi.data?.data?.operations;
    assert(ops && typeof ops.pendingLeavePipeline === 'number', 'KPI operations.pendingLeavePipeline should be numeric');
    const salesK = kpi.data?.data?.sales;
    assert(salesK && typeof salesK.interviewsToday === 'number', 'KPI sales.interviewsToday should be numeric');
    assert(Array.isArray(salesK.alerts), 'KPI sales.alerts should be an array');
    const rd = kpi.data?.data?.recruitmentDelivery;
    assert(rd && typeof rd === 'object', 'KPI recruitmentDelivery should be an object');
    assert(Array.isArray(rd.highPriorityJobs), 'recruitmentDelivery.highPriorityJobs should be an array');
    assert(typeof rd.submissionPipelineByStage === 'object', 'recruitmentDelivery.submissionPipelineByStage should be an object');
    console.log(`✅ ADMIN KPI payroll.pendingRuns=${pendingRuns} operations.leaves=${ops.pendingLeavePipeline} sales.interviewsToday=${salesK.interviewsToday}`);
  }

  // ADMIN: unified executive pending queue
  {
    const q = await request(tokens.ADMIN, 'get', '/hrms/executive/pending-queue?limit=5');
    assert(q.ok, 'ADMIN should access /hrms/executive/pending-queue');
    assert(Array.isArray(q.data?.data?.leaves), 'executive queue leaves should be an array');
    assert(q.data?.data?.modules && typeof q.data.data.modules === 'object', 'executive queue modules should be an object');
    console.log('✅ ADMIN executive pending-queue');
  }

  // Submissions API: list requires jobId; existing job returns 200 for delivery roles
  {
    const noJob = await request(tokens.ADMIN, 'get', '/submissions');
    assert(!noJob.ok && noJob.status === 400, 'GET /submissions without jobId should return 400');
    const anyJob = await prisma.job.findFirst({
      where: { NOT: { department: 'Screening' } },
      select: { id: true },
    });
    if (anyJob) {
      const listOk = await request(tokens.RECRUITER, 'get', `/submissions?jobId=${anyJob.id}`);
      assert(listOk.ok, 'RECRUITER should list submissions for a job');
      assert(Array.isArray(listOk.data?.data?.submissions), 'submissions payload should be an array');
    }
    console.log('✅ submissions list validation');
  }

  // PAYROLL_ADMIN: critical payroll endpoints allowed
  {
    const runs = await request(tokens.PAYROLL_ADMIN, 'get', '/payroll/runs?limit=5');
    assert(runs.ok, 'PAYROLL_ADMIN should access payroll runs');
    const approvals = await request(tokens.PAYROLL_ADMIN, 'get', '/payroll/approvals');
    assert(approvals.ok, 'PAYROLL_ADMIN should access payroll approvals');
    console.log('✅ PAYROLL_ADMIN payroll endpoints');
  }

  // HR_ADMIN: staff/attendance visibility in payroll allowed
  {
    const staff = await request(tokens.HR_ADMIN, 'get', '/payroll/admin/internal-staff');
    assert(staff.ok, 'HR_ADMIN should access payroll internal staff');
    const attendance = await request(tokens.HR_ADMIN, 'get', '/payroll/attendance?limit=10');
    assert(attendance.ok, 'HR_ADMIN should access payroll attendance');
    console.log('✅ HR_ADMIN payroll staff/attendance');
  }

  // FINANCE_HEAD: finance + payroll dashboard allowed
  {
    const financeDash = await request(tokens.FINANCE_HEAD, 'get', '/finance/dashboard');
    assert(financeDash.ok, 'FINANCE_HEAD should access finance dashboard');
    const payrollDash = await request(tokens.FINANCE_HEAD, 'get', '/payroll/dashboard');
    assert(payrollDash.ok, 'FINANCE_HEAD should access payroll dashboard');
    console.log('✅ FINANCE_HEAD finance/payroll monitoring');
  }

  // SALES_MANAGER: payroll should be blocked
  {
    const payrollRuns = await request(tokens.SALES_MANAGER, 'get', '/payroll/runs?limit=5');
    assert(!payrollRuns.ok && [401, 403].includes(payrollRuns.status), `SALES_MANAGER must be blocked from payroll runs (got ${payrollRuns.status})`);
    console.log('✅ SALES_MANAGER blocked from payroll');
  }

  // RECRUITER: payroll should be blocked
  {
    const payrollDash = await request(tokens.RECRUITER, 'get', '/payroll/dashboard');
    assert(!payrollDash.ok && [401, 403].includes(payrollDash.status), `RECRUITER must be blocked from payroll dashboard (got ${payrollDash.status})`);
    console.log('✅ RECRUITER blocked from payroll');
  }

  // VISA_ADMIN: payroll should be blocked, visa should work
  {
    const visaPage = await request(tokens.VISA_ADMIN, 'get', '/visa/cases?limit=5');
    assert(visaPage.ok, 'VISA_ADMIN should access visa cases');
    const payrollRuns = await request(tokens.VISA_ADMIN, 'get', '/payroll/runs?limit=5');
    assert(!payrollRuns.ok && [401, 403].includes(payrollRuns.status), `VISA_ADMIN must be blocked from payroll runs (got ${payrollRuns.status})`);
    console.log('✅ VISA_ADMIN scoped correctly');
  }

  console.log(`✅ Iteration ${iteration} passed`);
}

async function main() {
  console.log('\n=== Cross-Department Role Matrix E2E ===');
  for (let i = 1; i <= 3; i += 1) {
    await runOnce(i);
  }
  console.log('\n✅ All role-matrix E2E iterations passed (3/3)\n');
}

main().catch((err) => {
  console.error('❌ Role-matrix E2E failed:', err.message);
  process.exit(1);
});


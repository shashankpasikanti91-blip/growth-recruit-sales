/**
 * Payroll integrity E2E:
 * - Validates deduction/net math per payslip
 * - Verifies role isolation for sensitive payroll routes
 * - Ensures one bad request does not block healthy reads
 */
const axios = require('axios');
const { DEMO_WORKSPACE_ACCOUNTS } = require('../shared/demoWorkspaceAccounts');

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';
const EPSILON = 0.06;

const accountsByRole = new Map(DEMO_WORKSPACE_ACCOUNTS.map((a) => [a.role, a]));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function near(a, b, epsilon = EPSILON) {
  return Math.abs(Number(a || 0) - Number(b || 0)) <= epsilon;
}

async function login(role) {
  const user = accountsByRole.get(role);
  assert(user, `Missing account for role ${role}`);
  const res = await axios.post(`${API_BASE}/auth/login`, {
    email: user.email,
    password: user.password,
  });
  const payload = res.data?.data;
  assert(payload?.token, `Missing token for role ${role}`);
  return payload.token;
}

async function req(token, path, method = 'get') {
  try {
    const res = await axios({
      method,
      url: `${API_BASE}${path}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    return { ok: true, status: res.status, data: res.data };
  } catch (error) {
    return {
      ok: false,
      status: error?.response?.status || 0,
      data: error?.response?.data || null,
    };
  }
}

function validatePayslip(ps) {
  const gross = Number(ps.grossSalary || 0);
  const epf = Number(ps.epfEmployee || 0);
  const socso = Number(ps.socsoEmployee || 0);
  const eis = Number(ps.eisEmployee || 0);
  const tax = Number(ps.incomeTax || 0);
  const other = Number(ps.otherDeductions || 0);
  const unpaidLeave = Number(ps.unpaidLeaveDeduction || 0);
  const total = Number(ps.totalDeductions || 0);
  const net = Number(ps.netSalary || 0);

  const recomputedTotal = epf + socso + eis + tax + other + unpaidLeave;
  assert(near(total, recomputedTotal), `Deductions mismatch for payslip ${ps.displayId}: stored=${total} recomputed=${recomputedTotal.toFixed(2)}`);

  const recomputedNet = Math.max(0, gross - total);
  assert(near(net, recomputedNet), `Net salary mismatch for payslip ${ps.displayId}: stored=${net} recomputed=${recomputedNet.toFixed(2)}`);

  assert(gross >= 0 && total >= 0 && net >= 0, `Negative payroll number found for ${ps.displayId}`);
  assert(ps.employee?.employeeId, `Missing employeeId link on payslip ${ps.displayId}`);
}

async function main() {
  console.log('\n=== Payroll Integrity E2E ===\n');
  const payrollToken = await login('PAYROLL_ADMIN');
  const recruiterToken = await login('RECRUITER');
  console.log('✅ Auth: PAYROLL_ADMIN + RECRUITER');

  const runsRes = await req(payrollToken, '/payroll/runs?limit=30');
  assert(runsRes.ok, 'PAYROLL_ADMIN should access payroll runs');
  const runs = Array.isArray(runsRes.data?.data) ? runsRes.data.data : [];
  assert(runs.length > 0, 'No payroll runs found');
  console.log(`✅ Payroll runs available: ${runs.length}`);

  const runWithPayslips = [];
  for (const run of runs) {
    const detail = await req(payrollToken, `/payroll/runs/${run.id}`);
    if (!detail.ok) continue;
    const payslips = detail.data?.data?.payslips || [];
    if (payslips.length > 0) {
      runWithPayslips.push({ run, payslips });
    }
  }

  assert(runWithPayslips.length > 0, 'No runs with generated payslips found to validate');

  let checkedPayslips = 0;
  for (const item of runWithPayslips) {
    for (const ps of item.payslips) {
      validatePayslip(ps);
      checkedPayslips += 1;
    }
  }
  console.log(`✅ Payslip math validated: ${checkedPayslips}`);

  const unauthorized = await req(recruiterToken, '/payroll/runs?limit=5');
  assert(!unauthorized.ok && [401, 403].includes(unauthorized.status), `RECRUITER must not access payroll runs (got ${unauthorized.status})`);
  console.log('✅ Role isolation: recruiter blocked from payroll routes');

  const invalidRun = await req(payrollToken, '/payroll/runs/not-a-real-id');
  assert(!invalidRun.ok && [400, 404].includes(invalidRun.status), `Invalid run id should return 400/404 (got ${invalidRun.status})`);
  const healthyAfterError = await req(payrollToken, '/payroll/runs?limit=1');
  assert(healthyAfterError.ok, 'Service should remain healthy after invalid request');
  console.log('✅ Error isolation: invalid request does not affect subsequent reads');

  const myPayslips = await req(recruiterToken, '/payroll/my-payslips?limit=1');
  assert(myPayslips.ok, 'Employee should access own payslips');
  const ownSlip = myPayslips.data?.data?.payslips?.[0];
  if (ownSlip?.id) {
    const signed = await req(recruiterToken, `/payroll/my-payslips/download/${ownSlip.id}`);
    assert(signed.ok, 'Signed payslip URL endpoint should work');
    assert(Boolean(signed.data?.data?.signedUrl), 'Signed payslip URL should be returned');
    console.log('✅ Signed payslip download URL verified');
  } else {
    console.log('⚠️  Signed URL check skipped (no own payslip available for recruiter)');
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthlyGen = await req(payrollToken, `/payroll/statutory-forms/generate-monthly/${month}/${year}`, 'post');
  if (monthlyGen.ok) {
    console.log('✅ Monthly statutory automation verified');
  } else if (monthlyGen.status === 428) {
    console.log('⚠️  Monthly statutory automation skipped (backup guard active)');
  } else {
    throw new Error(`Monthly statutory automation failed with status ${monthlyGen.status}`);
  }

  const yearClose = await req(payrollToken, `/payroll/statutory-forms/year-close/${year}`, 'post');
  assert(yearClose.ok, 'Year close status endpoint should work');
  assert(Boolean(yearClose.data?.data?.status), 'Year close status should be returned');
  console.log('✅ Year-close statutory readiness verified');

  console.log('\n✅ Payroll integrity E2E passed\n');
}

main().catch((error) => {
  console.error('❌ Payroll integrity E2E failed:', error.message);
  process.exit(1);
});


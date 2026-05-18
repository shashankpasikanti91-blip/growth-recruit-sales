const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, role: true }
  });
  console.log('USERS:', JSON.stringify(users, null, 2));

  const emps = await prisma.employeeProfile.findMany({
    select: { id: true, employeeId: true, userId: true, status: true, employmentType: true }
  });
  console.log('EMP_PROFILES:', JSON.stringify(emps, null, 2));

  const salaries = await prisma.salaryStructure.findMany({
    select: { id: true, employeeId: true, basicSalary: true, status: true }
  });
  console.log('SALARY_STRUCTURES:', JSON.stringify(salaries, null, 2));

  const runs = await prisma.payrollRun.findMany({
    select: { id: true, month: true, year: true, status: true, displayId: true }
  });
  console.log('PAYROLL_RUNS:', JSON.stringify(runs, null, 2));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

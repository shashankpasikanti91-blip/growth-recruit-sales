const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const EMAIL_MAPPINGS = [
  { from: 'md@tekgen.com', to: 'kavitha@tekgen.com.my', note: 'Managing Director' },
  { from: 'assistant.manager@tekgen.com', to: 'qhailisha@bestinet.com.my', note: 'Director' },
  { from: 'recruitment.manager@tekgen.com', to: 'sreenivasa.gadde@tekgen.com.my', note: 'Recruitment Manager' },
  { from: 'shashank@tekgen.com', to: 'shashank.pasikanti@tekgen.com.my', note: 'Recruiter' },
  { from: 'jerry@tekgen.com', to: 'tang.yung@tekgen.com.my', note: 'Recruiter (Jerry)' },
  { from: 'savitha@tekgen.com', to: 'savita.angadi@tekgen.com.my', note: 'Recruiter (Savita)' },
  { from: 'payroll@tekgen.com', to: 'archana.naik@tekgen.com.my', note: 'Payroll Lead' },
];

async function migrateUserEmails() {
  for (const row of EMAIL_MAPPINGS) {
    const source = await prisma.user.findUnique({ where: { email: row.from } });
    const target = await prisma.user.findUnique({ where: { email: row.to } });

    if (!source) {
      console.log(`SKIP (source missing): ${row.from} -> ${row.to} [${row.note}]`);
      continue;
    }

    if (target) {
      console.log(`SKIP (target exists): ${row.from} -> ${row.to} [${row.note}]`);
      continue;
    }

    await prisma.user.update({
      where: { id: source.id },
      data: { email: row.to },
    });

    console.log(`UPDATED: ${row.from} -> ${row.to} [${row.note}]`);
  }
}

async function main() {
  try {
    await migrateUserEmails();
    console.log('Email migration finished.');
  } catch (error) {
    console.error('Email migration failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();

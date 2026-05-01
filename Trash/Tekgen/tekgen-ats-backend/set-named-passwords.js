const prisma = require('./src/config/database');
const bcrypt = require('bcryptjs');

const users = [
  { email: 'admin@tekgen.com',    password: 'Admin@2026' },
  { email: 'shashank@tekgen.com', password: 'Shashank@2026' },
  { email: 'jerry@tekgen.com',    password: 'Jerry@2026' },
  { email: 'savitha@tekgen.com',  password: 'Savitha@2026' },
  { email: 'demo@tekgen.com',     password: 'Demo@2026' },
];

async function run() {
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    await prisma.user.update({ where: { email: u.email }, data: { password: hash } });
    console.log(`✓ ${u.email} → ${u.password}`);
  }
  await prisma.$disconnect();
  console.log('\nAll passwords updated.');
}

run().catch(e => { console.error(e); process.exit(1); });

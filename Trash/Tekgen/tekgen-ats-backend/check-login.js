const prisma = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function checkLogin() {
  try {
    const users = await prisma.user.findMany({ select: { email: true, password: true, role: true, isActive: true } });
    console.log(`Found ${users.length} users`);
    for (const u of users) {
      const ok1 = await bcrypt.compare('Admin@2026', u.password);
      const ok2 = await bcrypt.compare('Shashank@2026', u.password);
      const ok3 = await bcrypt.compare('Jerry@2026', u.password);
      const ok4 = await bcrypt.compare('Savitha@2026', u.password);
      const ok5 = await bcrypt.compare('Demo@2026', u.password);
      console.log(`${u.email} | active:${u.isActive} | Admin@2026:${ok1} | Shashank@2026:${ok2} | Jerry@2026:${ok3} | Savitha@2026:${ok4} | Demo@2026:${ok5}`);
    }
  } catch(e) {
    console.log('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLogin();

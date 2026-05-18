const prisma = require('./src/config/database');
const bcrypt = require('bcryptjs');
const candidates = ['Demo@1234','Demo@2026','Jerry@2024','Jerry@2026','Savitha@2024','Savitha@2026','Admin@2026','Admin@Tekgen2024','Shashank@2024'];
async function run() {
  const users = await prisma.user.findMany({ select: { email:true, password:true } });
  for (const u of users) {
    const results = [];
    for (const p of candidates) {
      const ok = await bcrypt.compare(p, u.password);
      if (ok) results.push(p);
    }
    console.log(u.email, '->', results.join(', ') || 'UNKNOWN');
  }
  await prisma.$disconnect();
}
run();

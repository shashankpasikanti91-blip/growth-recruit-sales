const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'screenings' ORDER BY ordinal_position`
  .then(r => { console.log(JSON.stringify(r, null, 2)); p.$disconnect(); })
  .catch(e => { console.error(e.message); p.$disconnect(); });

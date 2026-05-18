const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.employeeProfile.findFirst().then(r => {
  console.log('fields:', JSON.stringify(Object.keys(r || {})));
  p.$disconnect();
});

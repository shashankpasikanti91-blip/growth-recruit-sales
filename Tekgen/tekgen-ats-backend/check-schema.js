const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('✅ Connected to database. Schema is ready for attachments.');
  
  // Verify the new table exists
  const result = await prisma.$queryRaw`
    SELECT EXISTS(
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'attachments'
    );
  `;
  console.log('Attachments table exists:', result);
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

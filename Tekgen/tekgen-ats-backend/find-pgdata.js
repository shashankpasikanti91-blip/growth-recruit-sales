const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient();
async function main() {
  const r = await p.$queryRawUnsafe("SELECT current_setting('data_directory') as datadir, pg_postmaster_start_time() as started, version() as ver");
  console.log('Data dir:', r[0].datadir);
  console.log('PG version:', r[0].ver.split(',')[0]);
  await p.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });

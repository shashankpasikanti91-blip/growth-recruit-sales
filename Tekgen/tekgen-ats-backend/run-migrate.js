const { spawn } = require('child_process');

const prisma = spawn('node', [
  require.resolve('./.bin/prisma'),
  'migrate', 'dev', '--name', 'add-attachments'
], { cwd: __dirname, stdio: 'inherit' });

prisma.on('close', (code) => {
  process.exit(code);
});

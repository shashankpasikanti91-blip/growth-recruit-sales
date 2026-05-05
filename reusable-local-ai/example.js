const { runAI } = require('./aiClient');

async function main() {
  const prompt = process.argv.slice(2).join(' ') || 'Return exactly STARTER_OK';
  const result = await runAI(prompt);
  console.log(result.content);
}

main().catch((error) => {
  console.error('STARTER_FAILED:', error.message);
  process.exitCode = 1;
});
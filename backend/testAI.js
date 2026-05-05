const { loadEnv } = require('./loadEnv');

loadEnv();

const { runAI } = require('./aiService');

async function main() {
  const prompt = process.argv.slice(2).join(' ') || 'Create a short architecture checklist for this SRP platform backend.';

  try {
    const result = await runAI(prompt);
    console.log('\nAI RESPONSE:\n');
    console.log(result.content);

    if (result.usage) {
      console.log('\nUSAGE:', result.usage);
    }
  } catch (error) {
    console.error('\nAI TEST FAILED:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
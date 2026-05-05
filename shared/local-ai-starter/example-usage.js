const { LocalAIClient } = require('./index');

async function main() {
  const client = new LocalAIClient();
  const result = await client.complete('Create a 5-step SaaS project build checklist.', {
    systemPrompt: 'You are a senior SaaS engineer. Keep the answer concise and actionable.',
    maxTokens: 400,
  });

  console.log(`provider=${result.provider}`);
  console.log(`model=${result.model}`);
  console.log(result.content);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

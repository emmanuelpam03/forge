import { testResolveToolPlan } from '@/ai/graph/nodes';

async function main() {
  const message = "What's the weather in Flic en Flac, Mauritius?";
  const plan = testResolveToolPlan(message, ['weather'], []);
  console.log('Planner selected tools:', plan);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});

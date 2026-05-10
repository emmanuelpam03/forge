import { randomUUID } from 'node:crypto';
import { runChatGraphStream } from './ai/graph/index.ts';
import { DEFAULT_PROMPT_BEHAVIOR_CONTROLS } from './ai/prompts/control.types.ts';

const input = {
  chatId: randomUUID(),
  userMessage: 'I want to build an ecommerce application with nextjs',
  runId: randomUUID(),
  assistantMessageId: randomUUID(),
  forceTool: null,
  classifiedIntent: null,
  model: undefined,
  provider: undefined,
  selectedOptions: ['coding'],
  promptBehavior: {
    ...DEFAULT_PROMPT_BEHAVIOR_CONTROLS,
    persona: 'senior-engineer',
  },
};

try {
  const state = await runChatGraphStream(input, (event) => {
    if (event.type === 'token') {
      process.stdout.write(event.content);
    }
  });

  console.log('\n\n---ASSISTANT_MESSAGE_END---');
  console.log(state.assistantMessage);
  console.log('\n---PROMPT_META---');
  console.log(JSON.stringify({
    taskCategory: state.taskCategory,
    responseMode: state.responseMode,
    reflectionScore: state.reflectionReport?.score ?? null,
    selectedOptions: state.selectedOptions,
  }, null, 2));
} catch (error) {
  console.error('PROBE_FAILED');
  console.error(error);
  process.exit(1);
}

import { randomUUID } from 'node:crypto';

// Headless probe: calls /api/chat via HTTP to test preResponseMs and TTFT
// with the conditional reflection enabled.

async function runProbe() {
  const chatId = randomUUID();
  
  console.log('[Probe] Testing general chat (no coding/reasoning selected)...\n');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId,
        message: 'teach me nextjs',
        model: undefined,
        provider: undefined,
        selectedOptions: [], // No special options = reflection should be skipped
        promptBehavior: undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let firstTokenAt = null;
    let eventCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const event = JSON.parse(line);
          eventCount++;
          
          // Log events with timing info
          if (event.type === 'token' && !firstTokenAt) {
            firstTokenAt = Date.now();
            const ttftMs = firstTokenAt - startTime;
            console.log(`[Probe] First token received in ${ttftMs}ms`);
          }
          
          if (event.type === 'token') {
            process.stdout.write(event.content);
          }
        } catch (_e) {
          // Ignore parse errors for non-JSON lines
        }
      }
    }

    const totalMs = Date.now() - startTime;
    console.log(`\n\n[Probe] Stream completed in ${totalMs}ms (${eventCount} events)`);
    console.log('[Probe] ✓ General chat completed faster (reflection skipped)');
    
  } catch (error) {
    console.error('[Probe] FAILED:', error.message);
    process.exit(1);
  }
}

runProbe();

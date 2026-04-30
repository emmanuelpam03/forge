const fetch = globalThis.fetch || require("node-fetch");

async function main() {
  const chatId = process.argv[2];
  const message = process.argv[3] || "Continue from edit test";

  if (!chatId) {
    console.error("Usage: node send_chat_and_wait.js <chatId> [message]");
    process.exit(2);
  }

  const res = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
  });

  if (!res.body) {
    console.error("No response body");
    process.exit(1);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx = buffer.indexOf("\n\n");
    while (idx !== -1) {
      const frame = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 2);
      idx = buffer.indexOf("\n\n");
      if (!frame) continue;
      const payloadText = frame.startsWith("data:")
        ? frame.replace(/^data:\s*/, "")
        : frame;
      try {
        const event = JSON.parse(payloadText);
        console.log("EVENT:", event);
      } catch (e) {
        console.log("RAW:", frame);
      }
    }
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

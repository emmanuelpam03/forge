import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeMarkdownForRender,
  splitStreamingMarkdown,
} from "../components/markdown-stream.ts";

const malformedTeachingResponse = [
  "```js",
  "const { WebSocketServer } = require('ws');",
  "const wss = new WebSocketServer({ port: 8080 });",
  "",
  "wss.on('connection', (ws) => {",
  "  ws.on('message', (data) => {",
  "    console.log('Received:', data.toString());",
  "    ws.send(`Echo: ${data}`);",
  "  });",
  "  ",
  "  ws.send('Welcome!');",
  "});",
  "**Client (browser console or HTML):**",
  "js",
  "const ws = new WebSocket('ws://localhost:8080');",
  "",
  "ws.onopen = () => ws.send('Hello Server');",
  "ws.onmessage = (e) => console.log('Received:', e.data);",
  "ws.onclose = () => console.log('Disconnected');",
  "Run: `npm init -y && npm i ws && node server.js`",
  "",
  "## Key Concepts",
  "",
  "| Concept | Description |",
  "|---------|-------------|",
  "| **Frames** | Smallest unit: text, binary, ping/pong, close |",
  "| **Ping/Pong** | Heartbeat to detect dead connections |",
  "| **Masking** | Client-to-server frames are masked (security) |",
  "| **Extensions** | Compression (permessage-deflate), custom protocols |",
  "| **Subprotocols** | Application protocols over WS (e.g., MQTT, GraphQL) |",
].join("\n");

test("normalizeMarkdownForRender closes malformed fences before rendered markdown", () => {
  const normalized = normalizeMarkdownForRender(malformedTeachingResponse);
  const closingFenceIndex = normalized.indexOf("```", 3);

  assert.ok(normalized.includes("ws.send(`Echo: ${data}`);"));
  assert.ok(normalized.includes("```"));
  assert.ok(normalized.includes("```\n**Client (browser console or HTML):**"));
  assert.ok(closingFenceIndex > 0);
  assert.ok(normalized.indexOf("## Key Concepts") > closingFenceIndex);
  assert.ok(normalized.indexOf("| Concept | Description |") > closingFenceIndex);
  assert.equal((normalized.match(/```/g) ?? []).length % 2, 0);
});

test("splitStreamingMarkdown keeps trailing prose outside the code block", () => {
  const { markdown, trailingText } = splitStreamingMarkdown(
    malformedTeachingResponse,
    false,
  );

  assert.equal(markdown, normalizeMarkdownForRender(malformedTeachingResponse));
  assert.ok(markdown.includes("const { WebSocketServer } = require('ws');"));
  assert.ok(markdown.includes("ws.send('Welcome!');"));
  assert.ok(markdown.includes("## Key Concepts"));
  assert.equal(trailingText, "");
});
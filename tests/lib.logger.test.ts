import test from "node:test";
import assert from "node:assert/strict";

const originalInfo = console.info;
const originalWarn = console.warn;
const originalError = console.error;

function captureConsole() {
  const lines: string[] = [];
  console.info = ((...args: unknown[]) => {
    lines.push(String(args[0]));
  }) as typeof console.info;
  console.warn = ((...args: unknown[]) => {
    lines.push(String(args[0]));
  }) as typeof console.warn;
  console.error = ((...args: unknown[]) => {
    lines.push(String(args[0]));
  }) as typeof console.error;
  return lines;
}

function restoreConsole() {
  console.info = originalInfo;
  console.warn = originalWarn;
  console.error = originalError;
}

test("structured logger emits JSON with stable fields", async () => {
  const lines = captureConsole();
  const { info } = await import("../lib/logger.ts");
  try {
    info("chat_started", { chatId: "abc123", runId: "run-1", count: 3 });

    assert.equal(lines.length, 1);
    const payload = JSON.parse(lines[0]) as Record<string, unknown>;
    assert.equal(payload.level, "info");
    assert.equal(payload.event, "chat_started");
    assert.equal(payload.message, "chat_started");
    assert.equal(typeof payload.timestamp, "string");
    assert.equal(typeof payload.chatId, "string");
    assert.equal(typeof payload.runId, "string");
    assert.equal(payload.count, 3);
  } finally {
    restoreConsole();
  }
});

test("structured logger serializes errors", async () => {
  const lines = captureConsole();
  const { error } = await import("../lib/logger.ts");
  try {
    error("chat_failed", { error: new Error("boom") });

    assert.equal(lines.length, 1);
    const payload = JSON.parse(lines[0]) as Record<string, unknown>;
    assert.equal(payload.level, "error");
    assert.equal(payload.event, "chat_failed");
    assert.equal(typeof payload.error, "object");
  } finally {
    restoreConsole();
  }
});

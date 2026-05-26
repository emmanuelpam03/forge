import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseImageAttachment } from "../lib/attachment-processing.ts";

test("ocr adapter uses tesseract.js v7 recognize API", () => {
  const source = readFileSync(join(process.cwd(), "lib/ocr.ts"), "utf8");
  assert.match(source, /tesseract\.recognize\(buffer, lang\)/);
  assert.match(source, /createWorker\(lang\)/);
  assert.doesNotMatch(source, /workerOptions/);
});

// Small 1x1 PNG (data URL)
const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO4JYlQAAAAASUVORK5CYII=';
const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');

test('parseImageAttachment does not throw when OCR disabled', async () => {
  const prev = process.env.DISABLE_IMAGE_OCR;
  try {
    process.env.DISABLE_IMAGE_OCR = '1';
    const parsed = await parseImageAttachment(buffer, 'diagram.png');
    assert(typeof parsed.summary === 'string', 'Summary should be a string when OCR is disabled');
    assert(parsed.summary!.includes('diagram.png'), 'Summary should contain filename when OCR is disabled');
  } finally {
    if (typeof prev === 'undefined') {
      delete process.env.DISABLE_IMAGE_OCR;
    } else {
      process.env.DISABLE_IMAGE_OCR = prev;
    }
  }
});

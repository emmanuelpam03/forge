import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseImageAttachment } from '../lib/attachment-processing.ts';

// Small 1x1 PNG (data URL)
const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO4JYlQAAAAASUVORK5CYII=';
const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');

test('parseImageAttachment does not throw when OCR disabled', async () => {
  process.env.DISABLE_IMAGE_OCR = '1';
  const parsed = await parseImageAttachment(buffer, 'diagram.png');
  assert(parsed.summary.includes('diagram.png') || parsed.summary.length > 0);
});

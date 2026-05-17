import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, toResponse } from '../lib/error-response.ts';

// Helper to read Response body
async function readJson(resp: Response) {
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

test('toResponse serializes ApiError correctly', async () => {
  const err = new ApiError('Not found', 404, 'not_found');
  const resp = toResponse(err);
  assert.equal(resp.status, 404);
  const payload = await readJson(resp as unknown as Response);
  assert.deepEqual(payload, { error: 'Not found', code: 'not_found' });
});

test('toResponse handles unknown errors as 500', async () => {
  const resp = toResponse('some string' as unknown);
  assert.equal(resp.status, 500);
  const payload = await readJson(resp as unknown as Response);
  assert.deepEqual(payload, { error: 'Internal server error' });
});

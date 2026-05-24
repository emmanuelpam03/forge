'use strict';

/**
 * ESM-converted Tesseract Worker Script for Node
 */
import { parentPort } from 'worker_threads';
import getCore from './getCore.js';
import { gunzip } from './gunzip.js';
import * as cache from './cache.js';

// Use built-in fetch if available, otherwise dynamically import node-fetch
let fetch = global.fetch;
if (!fetch) {
  try {
    const mod = await import('node-fetch');
    fetch = mod.default ?? mod;
  } catch (err) {
    // leave fetch undefined; adapter consumers should handle absence
    fetch = undefined;
  }
}

// Import upstream worker handlers dynamically
let worker;
try {
  const mod = await import('tesseract.js/src/worker-script');
  worker = mod.default ?? mod;
} catch (err) {
  // If upstream worker import fails, rethrow so the host can fallback
  throw err;
}

/*
 * register message handler
 */
parentPort.on('message', (packet) => {
  worker.dispatchHandlers(packet, (obj) => parentPort.postMessage(obj));
});

worker.setAdapter({
  getCore,
  gunzip,
  fetch,
  ...cache,
});

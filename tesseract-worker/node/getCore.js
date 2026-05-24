'use strict';

import { simd, relaxedSimd } from 'wasm-feature-detect';
// Inlined OEM constants to avoid relying on relative package layout after
// copying the worker scripts into this repo. These match the upstream
// tesseract.js/src/constants/OEM.js values.
const OEM = {
  TESSERACT_ONLY: 0,
  LSTM_ONLY: 1,
  TESSERACT_LSTM_COMBINED: 2,
  DEFAULT: 3,
};

let TesseractCore = null;

export default async function getCore(oem, _, res) {
  if (TesseractCore === null) {
    const statusText = 'loading tesseract core';

    const simdSupport = await simd();
    const relaxedSimdSupport = await relaxedSimd();
    res.progress({ status: statusText, progress: 0 });
    if (relaxedSimdSupport) {
      if ([OEM.DEFAULT, OEM.LSTM_ONLY].includes(oem)) {
        const mod = await import('tesseract.js-core/tesseract-core-relaxedsimd-lstm');
        TesseractCore = mod.default ?? mod;
      } else {
        const mod = await import('tesseract.js-core/tesseract-core-relaxedsimd');
        TesseractCore = mod.default ?? mod;
      }
    } else if (simdSupport) {
      if ([OEM.DEFAULT, OEM.LSTM_ONLY].includes(oem)) {
        const mod = await import('tesseract.js-core/tesseract-core-simd-lstm');
        TesseractCore = mod.default ?? mod;
      } else {
        const mod = await import('tesseract.js-core/tesseract-core-simd');
        TesseractCore = mod.default ?? mod;
      }
    } else if ([OEM.DEFAULT, OEM.LSTM_ONLY].includes(oem)) {
      const mod = await import('tesseract.js-core/tesseract-core-lstm');
      TesseractCore = mod.default ?? mod;
    } else {
      const mod = await import('tesseract.js-core/tesseract-core');
      TesseractCore = mod.default ?? mod;
    }
    res.progress({ status: statusText, progress: 1 });
  }
  return TesseractCore;
}

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

async function copyDir(src, dest) {
  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  try {
    const require = createRequire(import.meta.url);
    const pkgPath = require.resolve('tesseract.js/package.json');
    const pkgRoot = path.dirname(pkgPath);
    const workerSrc = path.join(pkgRoot, 'src', 'worker-script', 'node');
    const workerDest = path.resolve(process.cwd(), 'tesseract-worker', 'node');

    if (!fs.existsSync(workerSrc)) {
      console.warn('Tesseract worker source not found at', workerSrc);
      return;
    }

    await copyDir(workerSrc, workerDest);
    console.log('Copied tesseract worker to', workerDest);
  } catch (err) {
    console.warn('Failed to copy tesseract worker:', err?.message ?? err);
  }
}

main();

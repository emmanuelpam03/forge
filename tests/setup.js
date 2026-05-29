// Register TS config paths (maps `@/*` -> project root) for tests
(async () => {
  try {
    const mod = await import('tsconfig-paths');
    const register = mod.register;
    const fs = await import('node:fs');
    const tsJson = JSON.parse(fs.readFileSync(new URL('../tsconfig.json', import.meta.url), 'utf8'));
    const baseUrl = process.cwd();
    register({ baseUrl, paths: tsJson.compilerOptions.paths || {} });
  } catch (err) {
    // If tsconfig-paths isn't available or import fails, tests may still run.
    // eslint-disable-next-line no-console
    console.warn('tsconfig-paths registration failed (optional):', err && err.message);
  }
})();

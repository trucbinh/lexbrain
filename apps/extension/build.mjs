// Bundles the extension with esbuild. The study/library UI is the mobile app, built by
// `pnpm --filter @lexbrain/mobile build:ext` into dist/app (run both with `pnpm build:ext` at the repo root).
import { build } from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });

await build({
  entryPoints: { background: 'src/background.ts', content: 'src/content.ts' },
  outdir: 'dist',
  bundle: true,
  format: 'iife', // content scripts cannot be ES modules
  target: 'chrome110',
  logLevel: 'info',
});

cpSync('manifest.json', 'dist/manifest.json');
cpSync('icons', 'dist/icons', { recursive: true });
console.log('Chromium extension ready in apps/extension/dist for Chrome and Edge.');

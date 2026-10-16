#!/usr/bin/env node
/**
 * Copies LexBrain's native Android sources into the Capacitor-generated android/ project.
 * Safe to re-run. Run after `npx cap add android` (and after `npx cap sync` if you ever delete android/).
 *
 *   pnpm --filter @lexbrain/mobile exec cap add android
 *   node scripts/apply-android-native.mjs
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mobile = join(root, 'apps/mobile');
const native = join(mobile, 'native/android');
const androidApp = join(mobile, 'android/app/src/main');

if (!existsSync(androidApp)) {
  console.error('android/ project not found. Run `pnpm --filter @lexbrain/mobile exec cap add android` first.');
  process.exit(1);
}

// 1. Resolve the Java package from capacitor.config.ts (appId) so the sources land in the right folder.
const config = readFileSync(join(mobile, 'capacitor.config.ts'), 'utf8');
const appId = /appId:\s*'([^']+)'/.exec(config)?.[1];
if (!appId) {
  console.error('Could not read appId from capacitor.config.ts');
  process.exit(1);
}
const pkgDir = join(androidApp, 'java', ...appId.split('.'));
mkdirSync(pkgDir, { recursive: true });

// 2. Remove the generated MainActivity (Java or Kotlin); ours registers the plugin.
for (const name of ['MainActivity.java', 'MainActivity.kt']) {
  const p = join(pkgDir, name);
  if (existsSync(p)) rmSync(p);
}

// 3. Copy sources, rewriting the package declaration to match appId.
for (const file of readdirSync(join(native, 'java'))) {
  const src = readFileSync(join(native, 'java', file), 'utf8').replace(/^package\s+[\w.]+;/m, `package ${appId};`);
  writeFileSync(join(pkgDir, file), src);
  console.log(`  wrote ${appId.replaceAll('.', '/')}/${file}`);
}

// 4. Theme resource
const valuesDir = join(androidApp, 'res/values');
mkdirSync(valuesDir, { recursive: true });
copyFileSync(join(native, 'res/values/lexbrain_capture_styles.xml'), join(valuesDir, 'lexbrain_capture_styles.xml'));
console.log('  wrote res/values/lexbrain_capture_styles.xml');

// 5. Manifest: insert the capture activity once.
const manifestPath = join(androidApp, 'AndroidManifest.xml');
let manifest = readFileSync(manifestPath, 'utf8');
const activity = readFileSync(join(native, 'manifest-activity.xml'), 'utf8').trimEnd();
const activityPattern = /[ \t]*<!-- LEXBRAIN:CAPTURE-ACTIVITY[\s\S]*?<\/activity>/;
if (activityPattern.test(manifest)) {
  const updated = manifest.replace(activityPattern, activity);
  if (updated !== manifest) {
    writeFileSync(manifestPath, updated);
    console.log('  updated capture activity in AndroidManifest.xml');
  } else {
    console.log('  AndroidManifest.xml already patched');
  }
} else {
  if (!manifest.includes('</application>')) {
    console.error('Unexpected AndroidManifest.xml: no </application> tag found.');
    process.exit(1);
  }
  manifest = manifest.replace('</application>', `${activity}\n    </application>`);
  writeFileSync(manifestPath, manifest);
  console.log('  patched AndroidManifest.xml');
}

console.log('\nDone. Next: pnpm cap:sync, then open android/ in Android Studio and run.');

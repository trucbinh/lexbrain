import { getDb } from './db';
import { deviceLanguage } from './languages';
import type { AppSettings } from './types';

const KEY = 'app';

export function defaultSettings(): AppSettings {
  return {
    targetLang: deviceLanguage('es'),
    studyDirection: 'source-to-target',
    apiBaseUrl: '',
  };
}

export async function getSettings(): Promise<AppSettings> {
  const row = await getDb().settings.get(KEY);
  return { ...defaultSettings(), ...((row?.value as Partial<AppSettings>) ?? {}) };
}

/** Atomic read-modify-write, so quick successive saves never overwrite each other. */
export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const db = getDb();
  return db.transaction('rw', db.settings, async () => {
    const row = await db.settings.get(KEY);
    const next: AppSettings = { ...defaultSettings(), ...((row?.value as Partial<AppSettings>) ?? {}), ...patch };
    await db.settings.put({ key: KEY, value: next });
    return next;
  });
}

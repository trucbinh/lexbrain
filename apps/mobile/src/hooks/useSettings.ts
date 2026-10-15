import { defaultSettings, getSettings, type AppSettings } from '@lexbrain/core';
import { useLiveQuery } from 'dexie-react-hooks';

/** Live settings; returns defaults until the stored row has loaded. */
export function useSettings(): AppSettings {
  const settings = useLiveQuery(() => getSettings(), []);
  return settings ?? defaultSettings();
}

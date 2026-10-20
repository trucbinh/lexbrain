import Dexie, { type Table } from 'dexie';
import { getDb, type CardRow, type SettingRow } from './db';

interface DatabaseSnapshot {
  id: string;
  appVersion: string;
  createdAt: string;
  sourceVersion: number;
  cards: CardRow[];
  settings: SettingRow[];
}

class BackupDatabase extends Dexie {
  snapshots!: Table<DatabaseSnapshot, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({ snapshots: 'id, createdAt' });
  }
}

const backupDatabases = new Map<string, BackupDatabase>();
let backupQueue = Promise.resolve();

function getBackupDatabase(sourceName: string): BackupDatabase {
  const name = sourceName === 'lexbrain' ? 'lexbrain-auto-backup' : `${sourceName}-auto-backup`;
  let database = backupDatabases.get(name);
  if (!database) {
    database = new BackupDatabase(name);
    backupDatabases.set(name, database);
  }
  return database;
}

/** Saves one immutable snapshot for each installed app version. */
export function backupDatabaseForVersion(appVersion: string, source = getDb()): Promise<void> {
  if (!appVersion.trim()) return Promise.resolve();
  const task = backupQueue.then(async () => {
    const snapshots = getBackupDatabase(source.name).snapshots;
    if (await snapshots.get(appVersion)) return;
    const { cards, settings } = await source.transaction('r', source.cards, source.settings, async () => ({
      cards: await source.cards.toArray(),
      settings: await source.settings.toArray(),
    }));
    await snapshots.add({
      id: appVersion,
      appVersion,
      createdAt: new Date().toISOString(),
      sourceVersion: source.verno,
      cards,
      settings,
    });
  });
  backupQueue = task.catch((error: unknown) => {
    console.warn('LexBrain: automatic database backup failed', error);
  });
  return backupQueue;
}

/** Restores the newest non-empty snapshot only when the live card store is empty. */
export async function restoreDatabaseIfEmpty(source = getDb()): Promise<boolean> {
  await source.open();
  if (await source.cards.count()) return false;

  const backups = await getBackupDatabase(source.name).snapshots.orderBy('createdAt').reverse().toArray();
  const snapshot = backups.find((backup) => backup.cards.length > 0);
  if (!snapshot?.cards.length) return false;

  let restored = false;
  await source.transaction('rw', source.cards, source.settings, async () => {
    if (await source.cards.count()) return;
    await source.cards.bulkPut(snapshot.cards);
    await source.settings.bulkPut(snapshot.settings);
    restored = true;
  });
  return restored;
}

/** Opens the database, recovers an empty card store, and snapshots only on a new app version. */
export async function initializeDatabase(appVersion: string, source = getDb()): Promise<boolean> {
  await source.open();
  const restored = await restoreDatabaseIfEmpty(source);
  await backupDatabaseForVersion(appVersion, source);
  return restored;
}
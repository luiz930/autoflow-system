import * as SQLite from "expo-sqlite";
import { schemaSql } from "./schema";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync("wagen_offline.db");
  }
  return databasePromise;
}

export async function initDatabase() {
  const db = await getDatabase();
  await db.execAsync(schemaSql);
}

export async function enqueueSync(entity: string, entityUuid: string, action: string, payload: unknown) {
  const db = await getDatabase();
  await db.runAsync(
    `
    INSERT INTO sync_queue (entity, entity_uuid, action, payload_json)
    VALUES (?, ?, ?, ?)
    `,
    entity,
    entityUuid,
    action,
    JSON.stringify(payload)
  );
}

export async function getSetting(key: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM sync_state WHERE key = ?",
    key
  );
  return row?.value || "";
}

export async function setSetting(key: string, value: string) {
  const db = await getDatabase();
  await db.runAsync(
    `
    INSERT INTO sync_state (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    key,
    value
  );
}

export function newUuid() {
  const random = Math.random().toString(16).slice(2);
  return `${Date.now().toString(16)}-${random}`;
}

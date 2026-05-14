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
  await migrateDatabase(db);
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

async function addColumnIfMissing(db: SQLite.SQLiteDatabase, table: string, column: string, definition: string) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some((item) => item.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function migrateDatabase(db: SQLite.SQLiteDatabase) {
  await addColumnIfMissing(db, "servicos", "tipo_nome", "TEXT");
  await addColumnIfMissing(db, "servicos", "valor_adicional", "REAL DEFAULT 0");
  await addColumnIfMissing(db, "servicos", "fotos_entrada", "INTEGER DEFAULT 0");
  await addColumnIfMissing(db, "servicos", "fotos_detalhe", "INTEGER DEFAULT 0");
  await addColumnIfMissing(db, "veiculos", "ultima_entrada", "TEXT");
  await addColumnIfMissing(db, "veiculos", "ultima_entrega", "TEXT");
}

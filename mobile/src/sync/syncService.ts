import { getDatabase } from "../database/db";
import { normalizeServerUrl } from "../config";
import { QueueRow, SyncConfig, SyncResult } from "./types";

const SYNC_BATCH_SIZE = 50;

export async function pendingSyncCount() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    "SELECT COUNT(*) as total FROM sync_queue WHERE synced_at IS NULL"
  );
  return Number(row?.total || 0);
}

export async function runSync(config: SyncConfig): Promise<SyncResult> {
  const endpointUrl = normalizeServerUrl(config.endpointUrl);

  const db = await getDatabase();
  const queue = await db.getAllAsync<QueueRow>(
    `
    SELECT id, entity, entity_uuid, action, payload_json
    FROM sync_queue
    WHERE synced_at IS NULL
    ORDER BY id
    LIMIT ?
    `,
    SYNC_BATCH_SIZE
  );

  const payload = {
    changes: queue.map((item) => ({
      id: item.id,
      entity: item.entity,
      entity_uuid: item.entity_uuid,
      action: item.action,
      payload: JSON.parse(item.payload_json)
    }))
  };

  try {
    const response = await fetch(`${endpointUrl}/api/mobile/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {})
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 404) {
      throw new Error("O site ainda nao tem a API mobile publicada.");
    }

    if (!response.ok) {
      throw new Error(`Servidor retornou HTTP ${response.status}`);
    }

    const data = await response.json();
    const acceptedIds: number[] = Array.isArray(data.accepted_ids) ? data.accepted_ids : [];

    for (const id of acceptedIds) {
      await db.runAsync("UPDATE sync_queue SET synced_at = CURRENT_TIMESTAMP WHERE id = ?", id);
    }

    return {
      sent: acceptedIds.length,
      pulled: Array.isArray(data.changes) ? data.changes.length : 0
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    for (const item of queue) {
      await db.runAsync(
        "UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?",
        message,
        item.id
      );
    }
    return { sent: 0, pulled: 0, error: message };
  }
}

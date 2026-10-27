import { localDb, type OutboxItem } from "./database";

export async function enqueueOutboxOperation(
  operationType: OutboxItem["operationType"],
  payload: any,
  idempotencyKey = crypto.randomUUID(),
): Promise<OutboxItem> {
  if (!localDb) {
    throw new Error("Dexie localDb is only available in browser");
  }

  const item: OutboxItem = {
    id: crypto.randomUUID(),
    operationType,
    payload,
    idempotencyKey,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: "pending",
  };

  await localDb.outbox.put(item);
  return item;
}

export async function getPendingOutboxItems(): Promise<OutboxItem[]> {
  if (!localDb) return [];
  return localDb.outbox.where("status").equals("pending").sortBy("createdAt");
}

export async function markOutboxStatus(
  id: string,
  status: OutboxItem["status"],
  error?: string,
): Promise<void> {
  if (!localDb) return;
  const updateData: Partial<OutboxItem> = { status };
  if (error !== undefined) {
    updateData.lastError = error;
  }
  if (status === "failed") {
    const existing = await localDb.outbox.get(id);
    if (existing) {
      updateData.retryCount = existing.retryCount + 1;
    }
  }
  await localDb.outbox.update(id, updateData);
}

export async function removeSyncedOutboxItems(): Promise<void> {
  if (!localDb) return;
  await localDb.outbox.where("status").equals("synced").delete();
}

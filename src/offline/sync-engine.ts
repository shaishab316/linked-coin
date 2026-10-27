import { localDb } from "./database";
import { getPendingOutboxItems, markOutboxStatus } from "./outbox";

export interface SyncEngineStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}

type SyncListener = (status: SyncEngineStatus) => void;

class SyncEngine {
  private isSyncing = false;
  private lastError: string | null = null;
  private listeners: Set<SyncListener> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleNetworkChange());
      window.addEventListener("offline", () => this.handleNetworkChange());
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => this.listeners.delete(listener);
  }

  private async notify(): Promise<void> {
    const status = await this.getStatus();
    for (const listener of this.listeners) {
      listener(status);
    }
  }

  public async getStatus(): Promise<SyncEngineStatus> {
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    let pendingCount = 0;
    let lastSyncedAt: string | null = null;

    if (localDb) {
      try {
        pendingCount = await localDb.outbox.where("status").equals("pending").count();
        const cursorMeta = await localDb.syncMetadata.get("lastSyncedAt");
        if (cursorMeta) {
          lastSyncedAt = cursorMeta.value;
        }
      } catch {
        // DB not initialized
      }
    }

    return {
      isOnline,
      isSyncing: this.isSyncing,
      pendingCount,
      lastSyncedAt,
      lastError: this.lastError,
    };
  }

  private handleNetworkChange(): void {
    this.notify();
    if (typeof navigator !== "undefined" && navigator.onLine) {
      this.syncNow().catch(console.error);
    }
  }

  public async syncNow(): Promise<void> {
    if (this.isSyncing || !localDb) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    this.isSyncing = true;
    this.lastError = null;
    await this.notify();

    try {
      // 1. PUSH: Push pending outbox items
      const pending = await getPendingOutboxItems();
      if (pending.length > 0) {
        for (const item of pending) {
          await markOutboxStatus(item.id, "syncing");
        }

        const pushResponse = await fetch("/api/sync/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operations: pending }),
        });

        if (!pushResponse.ok) {
          throw new Error(`Sync push failed with status ${pushResponse.status}`);
        }

        const pushResult = await pushResponse.json();
        if (pushResult.results) {
          for (const res of pushResult.results) {
            if (res.success) {
              await markOutboxStatus(res.operationId, "synced");
            } else {
              await markOutboxStatus(res.operationId, "failed", res.error);
            }
          }
        }
      }

      // 2. PULL: Pull remote events using last known cursor
      const cursorMeta = await localDb.syncMetadata.get("lastSyncCursor");
      const cursor = cursorMeta ? cursorMeta.value : "0";

      const pullResponse = await fetch(`/api/sync/pull?cursor=${encodeURIComponent(cursor)}`);
      if (pullResponse.ok) {
        const pullData = await pullResponse.json();
        if (pullData.events && pullData.events.length > 0) {
          await this.applyRemoteEvents(pullData.events);
        }
        if (pullData.nextCursor) {
          await localDb.syncMetadata.put({ key: "lastSyncCursor", value: pullData.nextCursor });
        }
      }

      const now = new Date().toISOString();
      await localDb.syncMetadata.put({ key: "lastSyncedAt", value: now });
    } catch (err: any) {
      this.lastError = err?.message || "Sync failed";
      console.error("Sync error:", err);
    } finally {
      this.isSyncing = false;
      await this.notify();
    }
  }

  private async applyRemoteEvents(events: any[]): Promise<void> {
    if (!localDb) return;

    await localDb.transaction("rw", [localDb.accounts, localDb.people, localDb.tags, localDb.transactions], async () => {
      for (const event of events) {
        const { eventType, payload } = event;
        if (eventType === "TRANSACTION_CREATED" || eventType === "TRANSACTION_REVERSED") {
          if (payload?.transaction) {
            await localDb.transactions.put({
              ...payload.transaction,
              syncStatus: "synced",
            });
          }
        } else if (eventType === "ACCOUNT_CREATED" || eventType === "ACCOUNT_UPDATED") {
          if (payload?.account) {
            await localDb.accounts.put({
              ...payload.account,
              syncStatus: "synced",
            });
          }
        } else if (eventType === "PERSON_CREATED" || eventType === "PERSON_UPDATED") {
          if (payload?.person) {
            await localDb.people.put({
              ...payload.person,
              syncStatus: "synced",
            });
          }
        } else if (eventType === "TAG_CREATED" || eventType === "TAG_UPDATED") {
          if (payload?.tag) {
            await localDb.tags.put({
              ...payload.tag,
              syncStatus: "synced",
            });
          }
        }
      }
    });
  }
}

export const syncEngine = new SyncEngine();

import Dexie, { type Table } from "dexie";

export type SyncStatus = "synced" | "pending" | "failed";

export interface LocalAccount {
  id: string;
  userId: string;
  name: string;
  accountType: string;
  currency: string;
  description?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface LocalPerson {
  id: string;
  userId: string;
  name: string;
  contact?: string | null;
  notes?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface LocalTag {
  id: string;
  userId: string;
  name: string;
  normalizedName: string;
  parentId?: string | null;
  color?: string | null;
  icon?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface LocalEntry {
  id: string;
  transactionId: string;
  accountId?: string | null;
  personId?: string | null;
  externalKind?: "income" | "expense" | "equity" | null;
  direction: "debit" | "credit";
  amountMinor: string; // string representation of bigint for Dexie / JSON safety
  currency: string;
}

export interface LocalTransaction {
  id: string;
  userId: string;
  type: string;
  occurredAt: string;
  description: string;
  notes?: string | null;
  currency: string;
  amountMinor: string;
  personId?: string | null;
  reversesTransactionId?: string | null;
  reversedByTransactionId?: string | null;
  reversedAt?: string | null;
  idempotencyKey: string;
  tagIds: string[];
  entries: LocalEntry[];
  syncStatus: SyncStatus;
  createdAt: string;
}

export interface OutboxItem {
  id: string;
  operationType:
    | "CREATE_TRANSACTION"
    | "REVERSE_TRANSACTION"
    | "CREATE_ACCOUNT"
    | "UPDATE_ACCOUNT"
    | "CREATE_PERSON"
    | "CREATE_TAG";
  payload: any;
  idempotencyKey: string;
  createdAt: string;
  retryCount: number;
  status: "pending" | "syncing" | "failed" | "synced";
  lastError?: string;
}

export interface SyncMetadataItem {
  key: string;
  value: any;
}

export class LinkedCoinDatabase extends Dexie {
  accounts!: Table<LocalAccount, string>;
  people!: Table<LocalPerson, string>;
  tags!: Table<LocalTag, string>;
  transactions!: Table<LocalTransaction, string>;
  outbox!: Table<OutboxItem, string>;
  syncMetadata!: Table<SyncMetadataItem, string>;

  constructor() {
    super("LinkedCoinDB");

    this.version(1).stores({
      accounts: "id, userId, accountType, currency, archivedAt, syncStatus",
      people: "id, userId, name, archivedAt, syncStatus",
      tags: "id, userId, normalizedName, parentId, archivedAt, syncStatus",
      transactions: "id, userId, type, occurredAt, currency, personId, idempotencyKey, syncStatus",
      outbox: "id, operationType, idempotencyKey, status, createdAt",
      syncMetadata: "key",
    });
  }
}

export const localDb = typeof window !== "undefined" ? new LinkedCoinDatabase() : (null as unknown as LinkedCoinDatabase);

export interface TransactionQueryAst {
  date?: {
    from?: string; // ISO date or YYYY-MM-DD
    to?: string;
  };
  accountIds?: string[];
  personIds?: string[];
  tagIds?: string[];
  transactionTypes?: string[];
  amount?: {
    min?: string;
    max?: string;
  };
  currency?: string;
  text?: string;
  isReversed?: boolean;
  sort?: {
    field: "occurredAt" | "amount";
    direction: "asc" | "desc";
  };
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface QueryFilterChip {
  id: string;
  type: "date" | "account" | "person" | "tag" | "type" | "amount" | "text" | "currency";
  label: string;
  value: string;
}

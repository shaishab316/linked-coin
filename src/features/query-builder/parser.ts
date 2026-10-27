import type { TransactionQueryAst, QueryFilterChip } from "./types";

/**
 * Parses free text query with tokens into structured AST.
 * Example: "tag:Food account:Cash amount:>500 type:expense date:2026-01-01..2026-01-31 lunch"
 */
export function parseQueryString(queryString: string): TransactionQueryAst {
  const ast: TransactionQueryAst = {};
  if (!queryString || !queryString.trim()) return ast;

  const tokens = queryString.trim().split(/\s+/);
  const freeTextWords: string[] = [];

  for (const token of tokens) {
    if (token.startsWith("date:")) {
      const val = token.slice(5);
      if (val.includes("..")) {
        const [from, to] = val.split("..");
        ast.date = { from: from || undefined, to: to || undefined };
      } else {
        ast.date = { from: val, to: val };
      }
    } else if (token.startsWith("type:")) {
      const type = token.slice(5).toLowerCase();
      ast.transactionTypes = ast.transactionTypes || [];
      ast.transactionTypes.push(type);
    } else if (token.startsWith("currency:")) {
      ast.currency = token.slice(9).toUpperCase();
    } else if (token.startsWith("amount:")) {
      const expr = token.slice(7);
      ast.amount = ast.amount || {};
      if (expr.startsWith(">=")) {
        ast.amount.min = expr.slice(2);
      } else if (expr.startsWith(">")) {
        ast.amount.min = expr.slice(1);
      } else if (expr.startsWith("<=")) {
        ast.amount.max = expr.slice(2);
      } else if (expr.startsWith("<")) {
        ast.amount.max = expr.slice(1);
      } else if (expr.includes("..")) {
        const [min, max] = expr.split("..");
        ast.amount.min = min || undefined;
        ast.amount.max = max || undefined;
      } else {
        ast.amount.min = expr;
        ast.amount.max = expr;
      }
    } else if (token.startsWith("sort:")) {
      const [field, direction] = token.slice(5).split(":");
      ast.sort = {
        field: field === "amount" ? "amount" : "occurredAt",
        direction: direction === "asc" ? "asc" : "desc",
      };
    } else if (token.startsWith("tag:")) {
      const val = token.slice(4);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(val)) {
        ast.tagIds = ast.tagIds || [];
        ast.tagIds.push(val);
      }
    } else if (token.startsWith("account:")) {
      const val = token.slice(8);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(val)) {
        ast.accountIds = ast.accountIds || [];
        ast.accountIds.push(val);
      }
    } else if (token.startsWith("person:")) {
      const val = token.slice(7);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(val)) {
        ast.personIds = ast.personIds || [];
        ast.personIds.push(val);
      }
    } else if (token === "is:reversed" || token === "status:reversed") {
      ast.isReversed = true;
    } else if (token === "is:active" || token === "status:active") {
      ast.isReversed = false;
    } else {
      freeTextWords.push(token);
    }
  }

  if (freeTextWords.length > 0) {
    ast.text = freeTextWords.join(" ");
  }

  return ast;
}

export function astToChips(ast: TransactionQueryAst): QueryFilterChip[] {
  const chips: QueryFilterChip[] = [];

  if (ast.date?.from || ast.date?.to) {
    chips.push({
      id: "date",
      type: "date",
      label: "Date",
      value: `${ast.date.from || "Start"} to ${ast.date.to || "Now"}`,
    });
  }

  if (ast.transactionTypes && ast.transactionTypes.length > 0) {
    for (const t of ast.transactionTypes) {
      chips.push({
        id: `type_${t}`,
        type: "type",
        label: "Type",
        value: t,
      });
    }
  }

  if (ast.currency) {
    chips.push({
      id: "currency",
      type: "currency",
      label: "Currency",
      value: ast.currency,
    });
  }

  if (ast.amount?.min || ast.amount?.max) {
    const minText = ast.amount.min ? `≥ ${ast.amount.min}` : "";
    const maxText = ast.amount.max ? `≤ ${ast.amount.max}` : "";
    chips.push({
      id: "amount",
      type: "amount",
      label: "Amount",
      value: [minText, maxText].filter(Boolean).join(" & "),
    });
  }

  if (ast.text) {
    chips.push({
      id: "text",
      type: "text",
      label: "Search",
      value: `"${ast.text}"`,
    });
  }

  return chips;
}

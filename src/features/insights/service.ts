import { eq, and, sql, desc, gte, isNull } from "drizzle-orm";
import { db } from "../../db";
import {
  accounts,
  ledgerTransactions,
  ledgerEntries,
  people,
  tags,
  transactionTags,
} from "../../db/schema";
import { listAccounts } from "../accounts/service";
import { listPeople } from "../people/service";
import { DEFAULT_CURRENCY } from "../../lib/money/money";

export interface DashboardInsights {
  netPositionByCurrency: Record<string, { assetsMinor: bigint; liabilitiesMinor: bigint; netMinor: bigint }>;
  monthlyCashFlow: Array<{
    month: string; // e.g. "2026-05"
    incomeMinor: bigint;
    expenseMinor: bigint;
    netCashFlowMinor: bigint;
  }>;
  spendingByTag: Array<{
    tagId: string;
    tagName: string;
    totalMinor: bigint;
    percentage: number;
  }>;
  totalReceivablesMinor: bigint;
  totalPayablesMinor: bigint;
}

export async function getDashboardInsights(
  userId: string,
  currency = DEFAULT_CURRENCY,
): Promise<DashboardInsights> {
  // 1. Net Position from Accounts
  const userAccounts = await listAccounts(userId);
  const netPositionByCurrency: DashboardInsights["netPositionByCurrency"] = {};

  for (const acc of userAccounts) {
    const curr = acc.currency;
    if (!netPositionByCurrency[curr]) {
      netPositionByCurrency[curr] = { assetsMinor: 0n, liabilitiesMinor: 0n, netMinor: 0n };
    }
    if (acc.accountType === "credit") {
      netPositionByCurrency[curr].liabilitiesMinor += acc.balanceMinor;
      netPositionByCurrency[curr].netMinor -= acc.balanceMinor;
    } else {
      netPositionByCurrency[curr].assetsMinor += acc.balanceMinor;
      netPositionByCurrency[curr].netMinor += acc.balanceMinor;
    }
  }

  // 2. 6-Month Cash Flow (excluding transfers and reversed events)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const cashFlowRows = await db
    .select({
      month: sql<string>`to_char(${ledgerTransactions.occurredAt}, 'YYYY-MM')`,
      income: sql<string>`coalesce(sum(case when ${ledgerTransactions.type} = 'income' then ${ledgerTransactions.amountMinor} else 0 end), 0)`,
      expense: sql<string>`coalesce(sum(case when ${ledgerTransactions.type} = 'expense' then ${ledgerTransactions.amountMinor} else 0 end), 0)`,
    })
    .from(ledgerTransactions)
    .where(
      and(
        eq(ledgerTransactions.userId, userId),
        eq(ledgerTransactions.currency, currency),
        gte(ledgerTransactions.occurredAt, sixMonthsAgo),
        isNull(ledgerTransactions.reversedAt),
      ),
    )
    .groupBy(sql`to_char(${ledgerTransactions.occurredAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${ledgerTransactions.occurredAt}, 'YYYY-MM')`);

  const monthlyCashFlow = cashFlowRows.map((r) => {
    const inc = BigInt(r.income || "0");
    const exp = BigInt(r.expense || "0");
    return {
      month: r.month,
      incomeMinor: inc,
      expenseMinor: exp,
      netCashFlowMinor: inc - exp,
    };
  });

  // 3. Spending by tag (current month)
  const startOfMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));

  const tagRows = await db
    .select({
      tagId: tags.id,
      tagName: tags.name,
      total: sql<string>`sum(${ledgerTransactions.amountMinor})`,
    })
    .from(transactionTags)
    .innerJoin(tags, eq(transactionTags.tagId, tags.id))
    .innerJoin(ledgerTransactions, eq(transactionTags.transactionId, ledgerTransactions.id))
    .where(
      and(
        eq(ledgerTransactions.userId, userId),
        eq(ledgerTransactions.type, "expense"),
        eq(ledgerTransactions.currency, currency),
        gte(ledgerTransactions.occurredAt, startOfMonth),
        isNull(ledgerTransactions.reversedAt),
      ),
    )
    .groupBy(tags.id, tags.name);

  let totalExpenseAllTags = 0n;
  const tagList = tagRows.map((r) => {
    const val = BigInt(r.total || "0");
    totalExpenseAllTags += val;
    return {
      tagId: r.tagId,
      tagName: r.tagName,
      totalMinor: val,
      percentage: 0,
    };
  });

  if (totalExpenseAllTags > 0n) {
    for (const item of tagList) {
      item.percentage = Number((item.totalMinor * 100n) / totalExpenseAllTags);
    }
  }

  // 4. Receivables and Payables from People
  const userPeople = await listPeople(userId);
  let totalReceivablesMinor = 0n;
  let totalPayablesMinor = 0n;

  for (const person of userPeople) {
    if (person.outstandingMinor > 0n) {
      totalReceivablesMinor += person.outstandingMinor;
    } else if (person.outstandingMinor < 0n) {
      totalPayablesMinor += -person.outstandingMinor;
    }
  }

  return {
    netPositionByCurrency,
    monthlyCashFlow,
    spendingByTag: tagList,
    totalReceivablesMinor,
    totalPayablesMinor,
  };
}

import { eq, and, sql, desc, gte, isNull } from "drizzle-orm";
import { format, subHours, subDays, subWeeks, subMonths, subYears, startOfWeek, startOfMonth, startOfYear } from "date-fns";
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

export type GranularityPeriod = "hour" | "day" | "week" | "month" | "year";

export interface GranularCashFlowPoint {
  key: string;       // e.g. "2026-10-27", "2026-10", "2026"
  label: string;     // e.g. "27 Oct", "This Week", "Oct 26", "2026"
  periodLabel?: string; // e.g. "Today", "28 Oct", "Wed"
  incomeMinor: bigint;
  expenseMinor: bigint;
  netCashFlowMinor: bigint;
}

export interface GranularComparison {
  current: {
    label: string;       // e.g. "Today", "This Week", "This Month", "This Year"
    periodLabel: string; // e.g. "27 Oct 2026"
    incomeMinor: bigint;
    expenseMinor: bigint;
    netMinor: bigint;
  };
  previous: {
    label: string;       // e.g. "Yesterday", "Previous Week", "Previous Month", "Previous Year"
    periodLabel: string; // e.g. "26 Oct 2026"
    incomeMinor: bigint;
    expenseMinor: bigint;
    netMinor: bigint;
  };
}

export interface GranularCashFlowSet {
  points: GranularCashFlowPoint[];
  comparison: GranularComparison;
}

export interface DashboardInsights {
  netPositionByCurrency: Record<string, { assetsMinor: bigint; liabilitiesMinor: bigint; netMinor: bigint }>;
  monthlyCashFlow: Array<{
    month: string; // e.g. "2026-05"
    incomeMinor: bigint;
    expenseMinor: bigint;
    netCashFlowMinor: bigint;
  }>;
  granularCashFlow: {
    hour: GranularCashFlowSet;
    day: GranularCashFlowSet;
    week: GranularCashFlowSet;
    month: GranularCashFlowSet;
    year: GranularCashFlowSet;
  };
  spendingByTag: Array<{
    tagId: string;
    tagName: string;
    totalMinor: bigint;
    percentage: number;
  }>;
  totalReceivablesMinor: bigint;
  totalPayablesMinor: bigint;
  rawHourlyTransactions: Array<{
    type: string;
    amountMinor: string;
    occurredAt: string;
  }>;
}

export async function getDashboardInsights(
  userId: string,
  currency = DEFAULT_CURRENCY,
): Promise<DashboardInsights> {
  const now = new Date();

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

  // 2. Granular Cash Flow Queries (Hour, Day, Week, Month, Year) in parallel
  const fortyEightHoursAgo = subHours(now, 47);
  fortyEightHoursAgo.setMinutes(0, 0, 0);

  const fourteenDaysAgo = subDays(now, 13);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const eightWeeksAgo = startOfWeek(subWeeks(now, 7), { weekStartsOn: 1 });
  const twelveMonthsAgo = startOfMonth(subMonths(now, 11));
  const fourYearsAgo = startOfYear(subYears(now, 3));

  const [hourlyRows, dailyRows, weeklyRows, monthlyRows, yearlyRows] = await Promise.all([
    // Hourly transactions (last 48 hours for 24h view & comparison)
    db
      .select({
        type: ledgerTransactions.type,
        amountMinor: ledgerTransactions.amountMinor,
        occurredAt: ledgerTransactions.occurredAt,
      })
      .from(ledgerTransactions)
      .where(
        and(
          eq(ledgerTransactions.userId, userId),
          eq(ledgerTransactions.currency, currency),
          gte(ledgerTransactions.occurredAt, fortyEightHoursAgo),
          isNull(ledgerTransactions.reversedAt),
        ),
      ),

    // Daily (last 14 days)
    db
      .select({
        day: sql<string>`to_char(${ledgerTransactions.occurredAt}, 'YYYY-MM-DD')`,
        income: sql<string>`coalesce(sum(case when ${ledgerTransactions.type} = 'income' then ${ledgerTransactions.amountMinor} else 0 end), 0)`,
        expense: sql<string>`coalesce(sum(case when ${ledgerTransactions.type} = 'expense' then ${ledgerTransactions.amountMinor} else 0 end), 0)`,
      })
      .from(ledgerTransactions)
      .where(
        and(
          eq(ledgerTransactions.userId, userId),
          eq(ledgerTransactions.currency, currency),
          gte(ledgerTransactions.occurredAt, fourteenDaysAgo),
          isNull(ledgerTransactions.reversedAt),
        ),
      )
      .groupBy(sql`to_char(${ledgerTransactions.occurredAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${ledgerTransactions.occurredAt}, 'YYYY-MM-DD')`),

    // Weekly (last 8 weeks)
    db
      .select({
        weekKey: sql<string>`to_char(date_trunc('week', ${ledgerTransactions.occurredAt}), 'YYYY-MM-DD')`,
        income: sql<string>`coalesce(sum(case when ${ledgerTransactions.type} = 'income' then ${ledgerTransactions.amountMinor} else 0 end), 0)`,
        expense: sql<string>`coalesce(sum(case when ${ledgerTransactions.type} = 'expense' then ${ledgerTransactions.amountMinor} else 0 end), 0)`,
      })
      .from(ledgerTransactions)
      .where(
        and(
          eq(ledgerTransactions.userId, userId),
          eq(ledgerTransactions.currency, currency),
          gte(ledgerTransactions.occurredAt, eightWeeksAgo),
          isNull(ledgerTransactions.reversedAt),
        ),
      )
      .groupBy(sql`date_trunc('week', ${ledgerTransactions.occurredAt})`)
      .orderBy(sql`date_trunc('week', ${ledgerTransactions.occurredAt})`),

    // Monthly (last 12 months)
    db
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
          gte(ledgerTransactions.occurredAt, twelveMonthsAgo),
          isNull(ledgerTransactions.reversedAt),
        ),
      )
      .groupBy(sql`to_char(${ledgerTransactions.occurredAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${ledgerTransactions.occurredAt}, 'YYYY-MM')`),

    // Yearly (last 4 years)
    db
      .select({
        year: sql<string>`to_char(${ledgerTransactions.occurredAt}, 'YYYY')`,
        income: sql<string>`coalesce(sum(case when ${ledgerTransactions.type} = 'income' then ${ledgerTransactions.amountMinor} else 0 end), 0)`,
        expense: sql<string>`coalesce(sum(case when ${ledgerTransactions.type} = 'expense' then ${ledgerTransactions.amountMinor} else 0 end), 0)`,
      })
      .from(ledgerTransactions)
      .where(
        and(
          eq(ledgerTransactions.userId, userId),
          eq(ledgerTransactions.currency, currency),
          gte(ledgerTransactions.occurredAt, fourYearsAgo),
          isNull(ledgerTransactions.reversedAt),
        ),
      )
      .groupBy(sql`to_char(${ledgerTransactions.occurredAt}, 'YYYY')`)
      .orderBy(sql`to_char(${ledgerTransactions.occurredAt}, 'YYYY')`),
  ]);

  // Construct continuous Hourly points & comparison (This Hour vs Previous Hour)
  const hourlyMap = new Map<string, { income: bigint; expense: bigint }>();
  for (const row of hourlyRows) {
    const key = format(row.occurredAt, "yyyy-MM-dd HH:00");
    const existing = hourlyMap.get(key) || { income: 0n, expense: 0n };
    if (row.type === "income") {
      existing.income += row.amountMinor;
    } else if (row.type === "expense") {
      existing.expense += row.amountMinor;
    }
    hourlyMap.set(key, existing);
  }

  const hourPoints: GranularCashFlowPoint[] = [];
  for (let i = 23; i >= 0; i--) {
    const h = subHours(now, i);
    const key = format(h, "yyyy-MM-dd HH:00");
    const label = format(h, "h a");
    const isToday = format(h, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
    const periodLabel = isToday ? "Today" : format(h, "d MMM");
    const val = hourlyMap.get(key) || { income: 0n, expense: 0n };
    hourPoints.push({
      key,
      label,
      periodLabel,
      incomeMinor: val.income,
      expenseMinor: val.expense,
      netCashFlowMinor: val.income - val.expense,
    });
  }

  const thisHourKey = format(now, "yyyy-MM-dd HH:00");
  const prevHourKey = format(subHours(now, 1), "yyyy-MM-dd HH:00");
  const thisHourVal = hourlyMap.get(thisHourKey) || { income: 0n, expense: 0n };
  const prevHourVal = hourlyMap.get(prevHourKey) || { income: 0n, expense: 0n };
  const hourComparison: GranularComparison = {
    current: {
      label: "This Hour",
      periodLabel: format(now, "d MMM, h a"),
      incomeMinor: thisHourVal.income,
      expenseMinor: thisHourVal.expense,
      netMinor: thisHourVal.income - thisHourVal.expense,
    },
    previous: {
      label: "Prev Hour",
      periodLabel: format(subHours(now, 1), "d MMM, h a"),
      incomeMinor: prevHourVal.income,
      expenseMinor: prevHourVal.expense,
      netMinor: prevHourVal.income - prevHourVal.expense,
    },
  };

  // Construct continuous Daily points & comparison (Today vs Yesterday)
  const dailyMap = new Map(
    dailyRows.map((r) => [
      r.day,
      { income: BigInt(r.income || "0"), expense: BigInt(r.expense || "0") },
    ]),
  );
  const dayPoints: GranularCashFlowPoint[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = subDays(now, i);
    const key = format(d, "yyyy-MM-dd");
    const label = i === 0 ? "Today" : format(d, "d MMM");
    const val = dailyMap.get(key) || { income: 0n, expense: 0n };
    dayPoints.push({
      key,
      label,
      incomeMinor: val.income,
      expenseMinor: val.expense,
      netCashFlowMinor: val.income - val.expense,
    });
  }
  const todayKey = format(now, "yyyy-MM-dd");
  const yesterdayKey = format(subDays(now, 1), "yyyy-MM-dd");
  const todayVal = dailyMap.get(todayKey) || { income: 0n, expense: 0n };
  const yesterdayVal = dailyMap.get(yesterdayKey) || { income: 0n, expense: 0n };
  const dayComparison: GranularComparison = {
    current: {
      label: "Today",
      periodLabel: format(now, "d MMM yyyy"),
      incomeMinor: todayVal.income,
      expenseMinor: todayVal.expense,
      netMinor: todayVal.income - todayVal.expense,
    },
    previous: {
      label: "Yesterday",
      periodLabel: format(subDays(now, 1), "d MMM yyyy"),
      incomeMinor: yesterdayVal.income,
      expenseMinor: yesterdayVal.expense,
      netMinor: yesterdayVal.income - yesterdayVal.expense,
    },
  };

  // Construct continuous Weekly points & comparison (This Week vs Previous Week)
  const weeklyMap = new Map(
    weeklyRows.map((r) => [
      r.weekKey,
      { income: BigInt(r.income || "0"), expense: BigInt(r.expense || "0") },
    ]),
  );
  const weekPoints: GranularCashFlowPoint[] = [];
  for (let i = 7; i >= 0; i--) {
    const wDate = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const key = format(wDate, "yyyy-MM-dd");
    const label = i === 0 ? "This Week" : i === 1 ? "Last Week" : `W${format(wDate, "I")}`;
    const val = weeklyMap.get(key) || { income: 0n, expense: 0n };
    weekPoints.push({
      key,
      label,
      incomeMinor: val.income,
      expenseMinor: val.expense,
      netCashFlowMinor: val.income - val.expense,
    });
  }
  const currWeekKey = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const prevWeekKey = format(startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const currWeekVal = weeklyMap.get(currWeekKey) || { income: 0n, expense: 0n };
  const prevWeekVal = weeklyMap.get(prevWeekKey) || { income: 0n, expense: 0n };
  const weekComparison: GranularComparison = {
    current: {
      label: "This Week",
      periodLabel: `${format(startOfWeek(now, { weekStartsOn: 1 }), "d MMM")} - ${format(now, "d MMM")}`,
      incomeMinor: currWeekVal.income,
      expenseMinor: currWeekVal.expense,
      netMinor: currWeekVal.income - currWeekVal.expense,
    },
    previous: {
      label: "Previous Week",
      periodLabel: `${format(startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), "d MMM")} - ${format(subDays(startOfWeek(now, { weekStartsOn: 1 }), 1), "d MMM")}`,
      incomeMinor: prevWeekVal.income,
      expenseMinor: prevWeekVal.expense,
      netMinor: prevWeekVal.income - prevWeekVal.expense,
    },
  };

  // Construct continuous Monthly points & comparison (This Month vs Previous Month)
  const monthlyMap = new Map(
    monthlyRows.map((r) => [
      r.month,
      { income: BigInt(r.income || "0"), expense: BigInt(r.expense || "0") },
    ]),
  );
  const monthPoints: GranularCashFlowPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const mDate = subMonths(now, i);
    const key = format(mDate, "yyyy-MM");
    const label = format(mDate, "MMM yy");
    const val = monthlyMap.get(key) || { income: 0n, expense: 0n };
    monthPoints.push({
      key,
      label,
      incomeMinor: val.income,
      expenseMinor: val.expense,
      netCashFlowMinor: val.income - val.expense,
    });
  }
  const currMonthKey = format(now, "yyyy-MM");
  const prevMonthKey = format(subMonths(now, 1), "yyyy-MM");
  const currMonthVal = monthlyMap.get(currMonthKey) || { income: 0n, expense: 0n };
  const prevMonthVal = monthlyMap.get(prevMonthKey) || { income: 0n, expense: 0n };
  const monthComparison: GranularComparison = {
    current: {
      label: "This Month",
      periodLabel: format(now, "MMMM yyyy"),
      incomeMinor: currMonthVal.income,
      expenseMinor: currMonthVal.expense,
      netMinor: currMonthVal.income - currMonthVal.expense,
    },
    previous: {
      label: "Previous Month",
      periodLabel: format(subMonths(now, 1), "MMMM yyyy"),
      incomeMinor: prevMonthVal.income,
      expenseMinor: prevMonthVal.expense,
      netMinor: prevMonthVal.income - prevMonthVal.expense,
    },
  };

  // Construct continuous Yearly points & comparison (This Year vs Previous Year)
  const yearlyMap = new Map(
    yearlyRows.map((r) => [
      r.year,
      { income: BigInt(r.income || "0"), expense: BigInt(r.expense || "0") },
    ]),
  );
  const yearPoints: GranularCashFlowPoint[] = [];
  for (let i = 3; i >= 0; i--) {
    const yDate = subYears(now, i);
    const key = format(yDate, "yyyy");
    const label = key;
    const val = yearlyMap.get(key) || { income: 0n, expense: 0n };
    yearPoints.push({
      key,
      label,
      incomeMinor: val.income,
      expenseMinor: val.expense,
      netCashFlowMinor: val.income - val.expense,
    });
  }
  const currYearKey = format(now, "yyyy");
  const prevYearKey = format(subYears(now, 1), "yyyy");
  const currYearVal = yearlyMap.get(currYearKey) || { income: 0n, expense: 0n };
  const prevYearVal = yearlyMap.get(prevYearKey) || { income: 0n, expense: 0n };
  const yearComparison: GranularComparison = {
    current: {
      label: "This Year",
      periodLabel: format(now, "yyyy"),
      incomeMinor: currYearVal.income,
      expenseMinor: currYearVal.expense,
      netMinor: currYearVal.income - currYearVal.expense,
    },
    previous: {
      label: "Previous Year",
      periodLabel: format(subYears(now, 1), "yyyy"),
      incomeMinor: prevYearVal.income,
      expenseMinor: prevYearVal.expense,
      netMinor: prevYearVal.income - prevYearVal.expense,
    },
  };

  const monthlyCashFlow = monthPoints.slice(-6).map((m) => ({
    month: m.key,
    incomeMinor: m.incomeMinor,
    expenseMinor: m.expenseMinor,
    netCashFlowMinor: m.netCashFlowMinor,
  }));

  // 3. Spending by tag (current month)
  const currentMonthStart = startOfMonth(now);

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
        gte(ledgerTransactions.occurredAt, currentMonthStart),
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
    granularCashFlow: {
      hour: { points: hourPoints, comparison: hourComparison },
      day: { points: dayPoints, comparison: dayComparison },
      week: { points: weekPoints, comparison: weekComparison },
      month: { points: monthPoints, comparison: monthComparison },
      year: { points: yearPoints, comparison: yearComparison },
    },
    spendingByTag: tagList,
    totalReceivablesMinor,
    totalPayablesMinor,
    rawHourlyTransactions: hourlyRows.map((r) => ({
      type: r.type,
      amountMinor: r.amountMinor.toString(),
      occurredAt: r.occurredAt.toISOString(),
    })),
  };
}

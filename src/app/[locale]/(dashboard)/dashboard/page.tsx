import React from "react";
import Link from "next/link";
import { requireUser } from "../../../../features/auth/service";
import { getDashboardInsights } from "../../../../features/insights/service";
import { searchTransactions } from "../../../../features/query-builder/service";
import { listAccounts } from "../../../../features/accounts/service";
import { listPeople } from "../../../../features/people/service";
import { listTags } from "../../../../features/tags/service";
import { getDictionary, formatLocalizedAmount, type Locale } from "../../../../lib/i18n";
import { CashFlowChart } from "../../../../components/charts/CashFlowChart";
import { CategoryPieChart } from "../../../../components/charts/CategoryPieChart";
import { DebtComparisonChart } from "../../../../components/charts/DebtComparisonChart";
import { InteractiveTimelineView } from "../../../../components/timeline/InteractiveTimelineView";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  HandCoins,
  TrendingUp,
  Wallet,
  CreditCard,
  PlusCircle,
  Calendar,
} from "lucide-react";

interface DashboardPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const user = await requireUser();
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "bn" ? "bn" : "en";
  const t = getDictionary(locale);

  // Fetch all live financial data in parallel
  const [insights, txResult, accounts, people, allTags] = await Promise.all([
    getDashboardInsights(user.id, "BDT"),
    searchTransactions(user.id, { limit: 30, offset: 0 }),
    listAccounts(user.id),
    listPeople(user.id),
    listTags(user.id),
  ]);

  const defaultCurr = "BDT";
  const netPos = insights.netPositionByCurrency[defaultCurr] || {
    assetsMinor: 0n,
    liabilitiesMinor: 0n,
    netMinor: 0n,
  };

  // Map account and person names for timeline items
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const personMap = new Map(people.map((p) => [p.id, p.name]));

  const timelineItems = txResult.items.map((tx) => {
    // Find primary account from entry legs
    const primaryEntry = tx.entries.find((e) => e.accountId);
    const accountName = primaryEntry?.accountId ? accountMap.get(primaryEntry.accountId) : null;
    const personName = tx.personId ? personMap.get(tx.personId) : null;

    return {
      id: tx.id,
      type: tx.type,
      amountMinor: tx.amountMinor,
      currency: tx.currency,
      description: tx.description,
      notes: tx.notes,
      occurredAt: tx.occurredAt.toISOString(),
      reversedAt: tx.reversedAt?.toISOString() || null,
      parentTransactionId: tx.parentTransactionId || null,
      isAddon: !!tx.parentTransactionId,
      addons: tx.addonTransactions?.map((a) => ({
        id: a.id,
        type: a.type,
        amountMinor: a.amountMinor,
        currency: a.currency,
        description: a.description,
        occurredAt: a.occurredAt.toISOString(),
      })),
      personName,
      accountName,
      tags: tx.tags.map((t) => ({ id: t.id, name: t.name })),
      entries: tx.entries.map((e) => ({
        id: e.id,
        direction: e.direction,
        amountMinor: e.amountMinor,
        currency: e.currency,
        accountName: e.accountId ? accountMap.get(e.accountId) : undefined,
        externalKind: e.externalKind || undefined,
      })),
    };
  });

  // Calculate current month's total inflow and outflow from cashflow data
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthPoint = insights.monthlyCashFlow.find((m) => m.month === currentMonth);
  const monthIncome = currentMonthPoint?.incomeMinor || 0n;
  const monthExpense = currentMonthPoint?.expenseMinor || 0n;
  const monthSavings = monthIncome - monthExpense;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header & Hero Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
            {t.dashboard.title}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            {t.dashboard.subtitle}
          </p>
        </div>

        {/* 4 Big, Friendly Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Income Button */}
          <Link
            href={`/${locale}/transactions/new?type=income`}
            className="flex items-center gap-2 rounded-2xl bg-emerald-600/90 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 transition active:scale-95"
          >
            <ArrowDownLeft className="h-4 w-4" />
            <span>{t.dashboard.addIncome}</span>
          </Link>

          {/* Expense Button */}
          <Link
            href={`/${locale}/transactions/new?type=expense`}
            className="flex items-center gap-2 rounded-2xl bg-rose-600/90 hover:bg-rose-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-950/40 transition active:scale-95"
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>{t.dashboard.addExpense}</span>
          </Link>

          {/* Transfer Button */}
          <Link
            href={`/${locale}/transactions/new?type=transfer`}
            className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition active:scale-95"
          >
            <ArrowLeftRight className="h-4 w-4 text-blue-400" />
            <span>{t.dashboard.transfer}</span>
          </Link>

          {/* Lend/Borrow Button */}
          <Link
            href={`/${locale}/people`}
            className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition active:scale-95"
          >
            <HandCoins className="h-4 w-4 text-amber-400" />
            <span>{t.dashboard.lendBorrow}</span>
          </Link>
        </div>
      </div>

      {/* 2. Classic High-Contrast Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Net Position */}
        <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-900 p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{t.dashboard.netWorth}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-100 tracking-tight">
              {formatLocalizedAmount(netPos.netMinor, defaultCurr, locale, true)}
            </h3>
            <p className="mt-1 text-[11px] text-slate-500">{t.dashboard.netWorthDesc}</p>
          </div>
        </div>

        {/* Card 2: Money You Have (Assets) */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{t.dashboard.totalAssets}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-100 tracking-tight">
              {formatLocalizedAmount(netPos.assetsMinor, defaultCurr, locale, false)}
            </h3>
            <p className="mt-1 text-[11px] text-slate-500">{t.dashboard.totalAssetsDesc}</p>
          </div>
        </div>

        {/* Card 3: Money You Owe (Debts) */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{t.dashboard.totalLiabilities}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
              <CreditCard className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-rose-400 tracking-tight">
              {formatLocalizedAmount(netPos.liabilitiesMinor, defaultCurr, locale, false)}
            </h3>
            <p className="mt-1 text-[11px] text-slate-500">{t.dashboard.totalLiabilitiesDesc}</p>
          </div>
        </div>

        {/* Card 4: This Month Cash Flow */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{t.dashboard.netSavings}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <Calendar className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className={`text-2xl font-black tracking-tight ${monthSavings >= 0n ? "text-emerald-400" : "text-rose-400"}`}>
              {formatLocalizedAmount(monthSavings, defaultCurr, locale, true)}
            </h3>
            <div className="mt-1 flex items-center gap-3 text-[11px]">
              <span className="text-emerald-400">In: {formatLocalizedAmount(monthIncome, defaultCurr, locale, false)}</span>
              <span className="text-rose-400">Out: {formatLocalizedAmount(monthExpense, defaultCurr, locale, false)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Recharts Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Cash Flow In vs Out (2 Cols) */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-2">
          <CashFlowChart
            granularData={{
              hour: {
                points: insights.granularCashFlow.hour.points.map((p) => ({
                  key: p.key,
                  label: p.label,
                  periodLabel: p.periodLabel,
                  incomeMinor: p.incomeMinor.toString(),
                  expenseMinor: p.expenseMinor.toString(),
                  netMinor: p.netCashFlowMinor.toString(),
                })),
                comparison: {
                  current: {
                    label: insights.granularCashFlow.hour.comparison.current.label,
                    periodLabel: insights.granularCashFlow.hour.comparison.current.periodLabel,
                    incomeMinor: insights.granularCashFlow.hour.comparison.current.incomeMinor.toString(),
                    expenseMinor: insights.granularCashFlow.hour.comparison.current.expenseMinor.toString(),
                    netMinor: insights.granularCashFlow.hour.comparison.current.netMinor.toString(),
                  },
                  previous: {
                    label: insights.granularCashFlow.hour.comparison.previous.label,
                    periodLabel: insights.granularCashFlow.hour.comparison.previous.periodLabel,
                    incomeMinor: insights.granularCashFlow.hour.comparison.previous.incomeMinor.toString(),
                    expenseMinor: insights.granularCashFlow.hour.comparison.previous.expenseMinor.toString(),
                    netMinor: insights.granularCashFlow.hour.comparison.previous.netMinor.toString(),
                  },
                },
              },
              day: {
                points: insights.granularCashFlow.day.points.map((p) => ({
                  key: p.key,
                  label: p.label,
                  incomeMinor: p.incomeMinor.toString(),
                  expenseMinor: p.expenseMinor.toString(),
                  netMinor: p.netCashFlowMinor.toString(),
                })),
                comparison: {
                  current: {
                    label: insights.granularCashFlow.day.comparison.current.label,
                    periodLabel: insights.granularCashFlow.day.comparison.current.periodLabel,
                    incomeMinor: insights.granularCashFlow.day.comparison.current.incomeMinor.toString(),
                    expenseMinor: insights.granularCashFlow.day.comparison.current.expenseMinor.toString(),
                    netMinor: insights.granularCashFlow.day.comparison.current.netMinor.toString(),
                  },
                  previous: {
                    label: insights.granularCashFlow.day.comparison.previous.label,
                    periodLabel: insights.granularCashFlow.day.comparison.previous.periodLabel,
                    incomeMinor: insights.granularCashFlow.day.comparison.previous.incomeMinor.toString(),
                    expenseMinor: insights.granularCashFlow.day.comparison.previous.expenseMinor.toString(),
                    netMinor: insights.granularCashFlow.day.comparison.previous.netMinor.toString(),
                  },
                },
              },
              week: {
                points: insights.granularCashFlow.week.points.map((p) => ({
                  key: p.key,
                  label: p.label,
                  incomeMinor: p.incomeMinor.toString(),
                  expenseMinor: p.expenseMinor.toString(),
                  netMinor: p.netCashFlowMinor.toString(),
                })),
                comparison: {
                  current: {
                    label: insights.granularCashFlow.week.comparison.current.label,
                    periodLabel: insights.granularCashFlow.week.comparison.current.periodLabel,
                    incomeMinor: insights.granularCashFlow.week.comparison.current.incomeMinor.toString(),
                    expenseMinor: insights.granularCashFlow.week.comparison.current.expenseMinor.toString(),
                    netMinor: insights.granularCashFlow.week.comparison.current.netMinor.toString(),
                  },
                  previous: {
                    label: insights.granularCashFlow.week.comparison.previous.label,
                    periodLabel: insights.granularCashFlow.week.comparison.previous.periodLabel,
                    incomeMinor: insights.granularCashFlow.week.comparison.previous.incomeMinor.toString(),
                    expenseMinor: insights.granularCashFlow.week.comparison.previous.expenseMinor.toString(),
                    netMinor: insights.granularCashFlow.week.comparison.previous.netMinor.toString(),
                  },
                },
              },
              month: {
                points: insights.granularCashFlow.month.points.map((p) => ({
                  key: p.key,
                  label: p.label,
                  incomeMinor: p.incomeMinor.toString(),
                  expenseMinor: p.expenseMinor.toString(),
                  netMinor: p.netCashFlowMinor.toString(),
                })),
                comparison: {
                  current: {
                    label: insights.granularCashFlow.month.comparison.current.label,
                    periodLabel: insights.granularCashFlow.month.comparison.current.periodLabel,
                    incomeMinor: insights.granularCashFlow.month.comparison.current.incomeMinor.toString(),
                    expenseMinor: insights.granularCashFlow.month.comparison.current.expenseMinor.toString(),
                    netMinor: insights.granularCashFlow.month.comparison.current.netMinor.toString(),
                  },
                  previous: {
                    label: insights.granularCashFlow.month.comparison.previous.label,
                    periodLabel: insights.granularCashFlow.month.comparison.previous.periodLabel,
                    incomeMinor: insights.granularCashFlow.month.comparison.previous.incomeMinor.toString(),
                    expenseMinor: insights.granularCashFlow.month.comparison.previous.expenseMinor.toString(),
                    netMinor: insights.granularCashFlow.month.comparison.previous.netMinor.toString(),
                  },
                },
              },
              year: {
                points: insights.granularCashFlow.year.points.map((p) => ({
                  key: p.key,
                  label: p.label,
                  incomeMinor: p.incomeMinor.toString(),
                  expenseMinor: p.expenseMinor.toString(),
                  netMinor: p.netCashFlowMinor.toString(),
                })),
                comparison: {
                  current: {
                    label: insights.granularCashFlow.year.comparison.current.label,
                    periodLabel: insights.granularCashFlow.year.comparison.current.periodLabel,
                    incomeMinor: insights.granularCashFlow.year.comparison.current.incomeMinor.toString(),
                    expenseMinor: insights.granularCashFlow.year.comparison.current.expenseMinor.toString(),
                    netMinor: insights.granularCashFlow.year.comparison.current.netMinor.toString(),
                  },
                  previous: {
                    label: insights.granularCashFlow.year.comparison.previous.label,
                    periodLabel: insights.granularCashFlow.year.comparison.previous.periodLabel,
                    incomeMinor: insights.granularCashFlow.year.comparison.previous.incomeMinor.toString(),
                    expenseMinor: insights.granularCashFlow.year.comparison.previous.expenseMinor.toString(),
                    netMinor: insights.granularCashFlow.year.comparison.previous.netMinor.toString(),
                  },
                },
              },
            }}
            data={insights.monthlyCashFlow.map((m) => ({
              month: m.month,
              incomeMinor: m.incomeMinor.toString(),
              expenseMinor: m.expenseMinor.toString(),
              netMinor: m.netCashFlowMinor.toString(),
            }))}
            currency={defaultCurr}
          />
        </div>

        {/* Chart 2: Category Breakdown Donut */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-2">
          <div>
            <h3 className="text-base font-bold text-slate-100">{t.dashboard.categoryChartTitle}</h3>
            <p className="text-xs text-slate-400">{t.dashboard.categoryChartSubtitle}</p>
          </div>

          <CategoryPieChart
            data={insights.spendingByTag.map((tag) => ({
              tagId: tag.tagId,
              tagName: tag.tagName,
              amountMinor: tag.totalMinor.toString(),
              percentage: tag.percentage,
            }))}
            currency={defaultCurr}
          />
        </div>
      </div>

      {/* 4. Personal Debts Overview (Receivables vs Payables) */}
      {(insights.totalReceivablesMinor > 0n || insights.totalPayablesMinor > 0n) && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-100">{t.dashboard.debtComparisonTitle}</h3>
              <p className="text-xs text-slate-400">{t.dashboard.debtComparisonSubtitle}</p>
            </div>
            <Link
              href={`/${locale}/people`}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              {t.common.viewAll} →
            </Link>
          </div>

          <DebtComparisonChart
            receivablesMinor={insights.totalReceivablesMinor.toString()}
            payablesMinor={insights.totalPayablesMinor.toString()}
            currency={defaultCurr}
          />
        </div>
      )}

      {/* 5. Interactive Activity Timeline */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-100">{t.dashboard.recentTimeline}</h3>
            <p className="text-xs text-slate-400">{t.timeline.subtitle}</p>
          </div>
          <Link
            href={`/${locale}/transactions`}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
          >
            {t.common.viewAll} {t.nav.transactions} →
          </Link>
        </div>

        <InteractiveTimelineView
          transactions={timelineItems}
          allTags={allTags}
          currency={defaultCurr}
          basePath={`/${locale}/transactions`}
        />
      </div>
    </div>
  );
}

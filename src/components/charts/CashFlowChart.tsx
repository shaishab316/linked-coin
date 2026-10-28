"use client";

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useI18n } from "../../lib/i18n/context";
import { formatLocalizedAmount } from "../../lib/i18n";
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Calendar,
  Layers,
  Sparkles,
  Check,
  BarChart2,
  Activity,
  CandlestickChart,
} from "lucide-react";

export type GranularityPeriod = "hour" | "day" | "week" | "month" | "year";
export type ChartVisualizationType = "bar" | "area" | "trading";

export interface GranularPointProps {
  key: string;
  label: string;
  periodLabel?: string;
  incomeMinor: string;
  expenseMinor: string;
  netMinor: string;
}

export interface GranularComparisonProps {
  current: {
    label: string;
    periodLabel: string;
    incomeMinor: string;
    expenseMinor: string;
    netMinor: string;
  };
  previous: {
    label: string;
    periodLabel: string;
    incomeMinor: string;
    expenseMinor: string;
    netMinor: string;
  };
}

export interface GranularCashFlowPropSet {
  points: GranularPointProps[];
  comparison: GranularComparisonProps;
}

export interface MonthlyCashFlowPoint {
  month: string;
  incomeMinor: string;
  expenseMinor: string;
  netMinor: string;
}

interface CashFlowChartProps {
  granularData?: {
    hour?: GranularCashFlowPropSet;
    day: GranularCashFlowPropSet;
    week: GranularCashFlowPropSet;
    month: GranularCashFlowPropSet;
    year: GranularCashFlowPropSet;
  };
  data?: MonthlyCashFlowPoint[];
  currency?: string;
  initialPeriod?: GranularityPeriod;
}

export function CashFlowChart({
  granularData,
  data: fallbackData = [],
  currency = "BDT",
  initialPeriod = "month",
}: CashFlowChartProps) {
  const { locale, t } = useI18n();
  const [period, setPeriod] = useState<GranularityPeriod>(initialPeriod);
  const [chartType, setChartType] = useState<ChartVisualizationType>("bar");
  const [isComparing, setIsComparing] = useState<boolean>(false);

  // Dynamic Title based on active Period tab
  const dynamicTitle = useMemo(() => {
    switch (period) {
      case "hour":
        return t.dashboard.cashFlowChartTitleHour || "Hourly Cash Flow";
      case "day":
        return t.dashboard.cashFlowChartTitleDay || "Daily Cash Flow";
      case "week":
        return t.dashboard.cashFlowChartTitleWeek || "Weekly Cash Flow";
      case "month":
        return t.dashboard.cashFlowChartTitleMonth || "Monthly Cash Flow";
      case "year":
        return t.dashboard.cashFlowChartTitleYear || "Yearly Cash Flow";
    }
  }, [period, t]);

  // Determine active dataset
  const activeGranular = granularData ? granularData[period] : null;

  // Comparison labels
  const compareButtonLabel = useMemo(() => {
    switch (period) {
      case "hour":
        return t.dashboard.vsPrevHour || "vs Prev Hour";
      case "day":
        return t.dashboard.vsYesterday || "vs Yesterday";
      case "week":
        return t.dashboard.vsPrevWeek || "vs Prev Week";
      case "month":
        return t.dashboard.vsPrevMonth || "vs Prev Month";
      case "year":
        return t.dashboard.vsPrevYear || "vs Prev Year";
    }
  }, [period, t]);

  // Transform timeline data for standard view
  const timelineChartData = useMemo(() => {
    if (activeGranular && activeGranular.points.length > 0) {
      return activeGranular.points.map((p) => {
        const inVal = Number(BigInt(p.incomeMinor)) / 100;
        const outVal = Number(BigInt(p.expenseMinor)) / 100;
        return {
          name: p.label,
          periodLabel: p.periodLabel,
          inflow: inVal,
          outflow: outVal,
          netflow: inVal - outVal,
          incomeMinor: BigInt(p.incomeMinor),
          expenseMinor: BigInt(p.expenseMinor),
          netMinor: BigInt(p.netMinor),
        };
      });
    }
    // Fallback if granularData not passed
    return fallbackData.map((d) => {
      const inVal = Number(BigInt(d.incomeMinor)) / 100;
      const outVal = Number(BigInt(d.expenseMinor)) / 100;
      return {
        name: d.month,
        inflow: inVal,
        outflow: outVal,
        netflow: inVal - outVal,
        incomeMinor: BigInt(d.incomeMinor),
        expenseMinor: BigInt(d.expenseMinor),
        netMinor: BigInt(d.netMinor),
      };
    });
  }, [activeGranular, fallbackData]);

  // Comparison data
  const comparisonInfo = activeGranular?.comparison;
  const comparisonChartData = useMemo(() => {
    if (!comparisonInfo) return [];

    const currIn = Number(BigInt(comparisonInfo.current.incomeMinor)) / 100;
    const currOut = Number(BigInt(comparisonInfo.current.expenseMinor)) / 100;
    const prevIn = Number(BigInt(comparisonInfo.previous.incomeMinor)) / 100;
    const prevOut = Number(BigInt(comparisonInfo.previous.expenseMinor)) / 100;

    return [
      {
        name: comparisonInfo.previous.label,
        periodLabel: comparisonInfo.previous.periodLabel,
        inflow: prevIn,
        outflow: prevOut,
        netflow: prevIn - prevOut,
        incomeMinor: BigInt(comparisonInfo.previous.incomeMinor),
        expenseMinor: BigInt(comparisonInfo.previous.expenseMinor),
        netMinor: BigInt(comparisonInfo.previous.netMinor),
        isCurrent: false,
      },
      {
        name: comparisonInfo.current.label,
        periodLabel: comparisonInfo.current.periodLabel,
        inflow: currIn,
        outflow: currOut,
        netflow: currIn - currOut,
        incomeMinor: BigInt(comparisonInfo.current.incomeMinor),
        expenseMinor: BigInt(comparisonInfo.current.expenseMinor),
        netMinor: BigInt(comparisonInfo.current.netMinor),
        isCurrent: true,
      },
    ];
  }, [comparisonInfo]);

  // Calculate percentage delta for comparison cards
  const deltas = useMemo(() => {
    if (!comparisonInfo) return null;

    const currIn = BigInt(comparisonInfo.current.incomeMinor);
    const prevIn = BigInt(comparisonInfo.previous.incomeMinor);
    const diffIn = currIn - prevIn;
    const inPercent = prevIn > 0n ? Number((diffIn * 100n) / prevIn) : currIn > 0n ? 100 : 0;

    const currOut = BigInt(comparisonInfo.current.expenseMinor);
    const prevOut = BigInt(comparisonInfo.previous.expenseMinor);
    const diffOut = currOut - prevOut;
    const outPercent = prevOut > 0n ? Number((diffOut * 100n) / prevOut) : currOut > 0n ? 100 : 0;

    const currNet = BigInt(comparisonInfo.current.netMinor);
    const prevNet = BigInt(comparisonInfo.previous.netMinor);
    const diffNet = currNet - prevNet;

    return {
      income: { diff: diffIn, percent: inPercent, increased: diffIn > 0n },
      expense: { diff: diffOut, percent: outPercent, increased: diffOut > 0n },
      net: { diff: diffNet, improved: diffNet >= 0n },
    };
  }, [comparisonInfo]);

  // Trading stats (peak inflow, peak outflow, overall net flow)
  const tradingStats = useMemo(() => {
    let peakIn = 0;
    let peakOut = 0;
    let totalNet = 0;

    const src = isComparing ? comparisonChartData : timelineChartData;
    for (const d of src) {
      if (d.inflow > peakIn) peakIn = d.inflow;
      if (d.outflow > peakOut) peakOut = d.outflow;
      totalNet += d.netflow;
    }

    return {
      peakIn: BigInt(Math.round(peakIn * 100)),
      peakOut: BigInt(Math.round(peakOut * 100)),
      totalNet: BigInt(Math.round(totalNet * 100)),
      isSurplus: totalNet >= 0,
    };
  }, [isComparing, comparisonChartData, timelineChartData]);

  // Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="rounded-2xl border border-slate-700 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md min-w-[210px]">
          <div className="mb-2 border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-200">{label}</p>
            {point.periodLabel && (
              <span className="text-[10px] text-slate-400 font-medium">
                {point.periodLabel}
              </span>
            )}
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-4 text-emerald-400">
              <span className="flex items-center gap-1 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {t.dashboard.addIncome}:
              </span>
              <span className="font-bold">
                {formatLocalizedAmount(point.incomeMinor, currency, locale, false)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-rose-400">
              <span className="flex items-center gap-1 font-medium">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                {t.dashboard.addExpense}:
              </span>
              <span className="font-bold">
                {formatLocalizedAmount(point.expenseMinor, currency, locale, false)}
              </span>
            </div>
            <div className="mt-2 border-t border-slate-800 pt-1.5 flex items-center justify-between gap-4 text-slate-200">
              <span className="font-semibold">{t.dashboard.netSavings}:</span>
              <span className={`font-bold ${point.netMinor >= 0n ? "text-emerald-400" : "text-rose-400"}`}>
                {formatLocalizedAmount(point.netMinor, currency, locale, true)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const chartData = isComparing ? comparisonChartData : timelineChartData;

  return (
    <div className="space-y-4 pt-1">
      {/* 0. Dynamic Title and Subtitle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-100">{dynamicTitle}</h3>
          <p className="text-xs text-slate-400">{t.dashboard.cashFlowSubtitle}</p>
        </div>
      </div>

      {/* 1. Header Toolbar with Filter Pills, Chart View Switcher & Compare Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        {/* Left: Period Granularity Buttons & Chart Type Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Pills: Hour | Day | Week | Month | Year */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs font-semibold">
            {(["hour", "day", "week", "month", "year"] as GranularityPeriod[]).map((p) => {
              const isActive = period === p;
              const label =
                p === "hour"
                  ? t.dashboard.periodHour || "Hour"
                  : p === "day"
                  ? t.dashboard.periodDay || "Day"
                  : p === "week"
                  ? t.dashboard.periodWeek || "Week"
                  : p === "month"
                  ? t.dashboard.periodMonth || "Month"
                  : t.dashboard.periodYear || "Year";

              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`relative px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Chart Type View Switcher: Bar | Area | Trading */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs font-semibold">
            {/* Bar Mode */}
            <button
              type="button"
              onClick={() => setChartType("bar")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
                chartType === "bar"
                  ? "bg-slate-800 text-slate-100 font-bold border border-slate-700 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
              title="Bar Chart View"
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.dashboard.chartTypeBar || "Bars"}</span>
            </button>

            {/* Area Mode */}
            <button
              type="button"
              onClick={() => setChartType("area")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
                chartType === "area"
                  ? "bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
              title="Area Gradient Waves View"
            >
              <Activity className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.dashboard.chartTypeArea || "Waves"}</span>
            </button>

            {/* Trading View Mode */}
            <button
              type="button"
              onClick={() => setChartType("trading")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
                chartType === "trading"
                  ? "bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
              title="Trading Financial View"
            >
              <CandlestickChart className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.dashboard.chartTypeTrading || "Trading"}</span>
            </button>
          </div>
        </div>

        {/* Right: Compare to Previous Toggle Button */}
        {comparisonInfo && (
          <button
            type="button"
            onClick={() => setIsComparing((prev) => !prev)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl text-xs font-semibold transition-all duration-200 border cursor-pointer ${
              isComparing
                ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-950/30"
                : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <ArrowRightLeft className={`h-3.5 w-3.5 ${isComparing ? "text-cyan-400" : "text-slate-400"}`} />
            <span>{compareButtonLabel}</span>
            {isComparing && <Check className="h-3 w-3 text-cyan-400 ml-0.5" />}
          </button>
        )}
      </div>

      {/* 2. Comparison Delta KPI Card (Shown when compare is ON) */}
      {isComparing && comparisonInfo && deltas && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-200">
          {/* Income Comparison */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-400">{t.dashboard.addIncome}</span>
              <span className="text-[11px] font-bold text-slate-400">
                {deltas.income.diff >= 0n ? "+" : ""}
                {deltas.income.percent}%
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-slate-100">
                {formatLocalizedAmount(BigInt(comparisonInfo.current.incomeMinor), currency, locale, false)}
              </span>
              <span className="text-[11px] text-slate-400">
                vs {formatLocalizedAmount(BigInt(comparisonInfo.previous.incomeMinor), currency, locale, false)}
              </span>
            </div>
          </div>

          {/* Expense Comparison */}
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-rose-400">{t.dashboard.addExpense}</span>
              <span className={`text-[11px] font-bold ${deltas.expense.increased ? "text-rose-400" : "text-emerald-400"}`}>
                {deltas.expense.diff >= 0n ? "+" : ""}
                {deltas.expense.percent}%
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-slate-100">
                {formatLocalizedAmount(BigInt(comparisonInfo.current.expenseMinor), currency, locale, false)}
              </span>
              <span className="text-[11px] text-slate-400">
                vs {formatLocalizedAmount(BigInt(comparisonInfo.previous.expenseMinor), currency, locale, false)}
              </span>
            </div>
          </div>

          {/* Net Savings Comparison */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">{t.dashboard.netSavings}</span>
              <span className={`text-[11px] font-bold ${deltas.net.improved ? "text-emerald-400" : "text-rose-400"}`}>
                {deltas.net.improved ? "▲ Improved" : "▼ Lower"}
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className={`text-base font-bold ${BigInt(comparisonInfo.current.netMinor) >= 0n ? "text-emerald-400" : "text-rose-400"}`}>
                {formatLocalizedAmount(BigInt(comparisonInfo.current.netMinor), currency, locale, true)}
              </span>
              <span className="text-[11px] text-slate-400">
                vs {formatLocalizedAmount(BigInt(comparisonInfo.previous.netMinor), currency, locale, true)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Trading View Ribbon (Shown when chartType === 'trading') */}
      {chartType === "trading" && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-2xl border border-slate-800 bg-slate-950/80 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">{t.dashboard.peakInflow || "Peak In"}:</span>
              <span className="font-bold text-emerald-400">
                {formatLocalizedAmount(tradingStats.peakIn, currency, locale, false)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">{t.dashboard.peakOutflow || "Peak Out"}:</span>
              <span className="font-bold text-rose-400">
                {formatLocalizedAmount(tradingStats.peakOut, currency, locale, false)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Trajectory:</span>
            <span
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                tradingStats.isSurplus
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}
            >
              {tradingStats.isSurplus ? (
                <>
                  <TrendingUp className="h-3 w-3" />
                  <span>{t.dashboard.netSurplus || "Surplus"}</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3" />
                  <span>{t.dashboard.netDeficit || "Deficit"}</span>
                </>
              )}
            </span>
          </div>
        </div>
      )}

      {/* 4. Visual Chart Renderers */}
      {chartData.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/40 text-sm text-slate-400">
          {t.dashboard.noTransactionsYet}
        </div>
      ) : (
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {/* Visual Mode 1: Bar Chart */}
            {chartType === "bar" && (
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#94a3b8", fontSize: period === "hour" ? 10 : 12 }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={false}
                  interval={period === "hour" ? "preserveStartEnd" : 0}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) =>
                    `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: "12px", fontSize: "12px" }}
                  formatter={(value) => (
                    <span className="text-slate-300">
                      {value === "inflow"
                        ? t.dashboard.addIncome
                        : t.dashboard.addExpense}
                    </span>
                  )}
                />
                <Bar
                  dataKey="inflow"
                  name="inflow"
                  fill="#10B981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={isComparing ? 48 : period === "hour" ? 20 : 36}
                />
                <Bar
                  dataKey="outflow"
                  name="outflow"
                  fill="#F43F5E"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={isComparing ? 48 : period === "hour" ? 20 : 36}
                />
              </BarChart>
            )}

            {/* Visual Mode 2: Area Wave Chart with Gradient Fills */}
            {chartType === "area" && (
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorCashInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.75} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorCashOutflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.65} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#94a3b8", fontSize: period === "hour" ? 10 : 12 }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={false}
                  interval={period === "hour" ? "preserveStartEnd" : 0}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) =>
                    `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: "12px", fontSize: "12px" }}
                  formatter={(value) => (
                    <span className="text-slate-300">
                      {value === "inflow"
                        ? t.dashboard.addIncome
                        : t.dashboard.addExpense}
                    </span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="inflow"
                  name="inflow"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCashInflow)"
                  activeDot={{ r: 5, stroke: "#10B981", strokeWidth: 2, fill: "#fff" }}
                  isAnimationActive={true}
                />
                <Area
                  type="monotone"
                  dataKey="outflow"
                  name="outflow"
                  stroke="#F43F5E"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCashOutflow)"
                  activeDot={{ r: 5, stroke: "#F43F5E", strokeWidth: 2, fill: "#fff" }}
                  isAnimationActive={true}
                />
              </AreaChart>
            )}

            {/* Visual Mode 3: Trading Financial View (ComposedChart with Volume & Net Curve) */}
            {chartType === "trading" && (
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="tradingNetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.65} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={true} />
                <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#94a3b8", fontSize: period === "hour" ? 10 : 12 }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={false}
                  interval={period === "hour" ? "preserveStartEnd" : 0}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) =>
                    `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                  }
                />
                <Tooltip
                  cursor={{ stroke: "#64748b", strokeWidth: 1, strokeDasharray: "3 3" }}
                  content={<CustomTooltip />}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: "12px", fontSize: "12px" }}
                  formatter={(value) => (
                    <span className="text-slate-300">
                      {value === "inflow"
                        ? t.dashboard.addIncome
                        : value === "outflow"
                        ? t.dashboard.addExpense
                        : "Net Momentum"}
                    </span>
                  )}
                />
                {/* Background Volume Pillars */}
                <Bar
                  dataKey="inflow"
                  name="inflow"
                  fill="#10B981"
                  opacity={0.45}
                  barSize={18}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="outflow"
                  name="outflow"
                  fill="#F43F5E"
                  opacity={0.45}
                  barSize={18}
                  radius={[4, 4, 0, 0]}
                />
                {/* Dynamic Net Cash Flow Trajectory Curve */}
                <Area
                  type="monotone"
                  dataKey="netflow"
                  name="netflow"
                  stroke="#38BDF8"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#tradingNetGrad)"
                  dot={{ r: 3, fill: "#38BDF8", stroke: "#0f172a", strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: "#38BDF8", stroke: "#fff", strokeWidth: 2 }}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}


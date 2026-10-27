"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useI18n } from "../../lib/i18n/context";
import { formatLocalizedAmount } from "../../lib/i18n";

export interface MonthlyCashFlowPoint {
  month: string;
  incomeMinor: string;
  expenseMinor: string;
  netMinor: string;
}

interface CashFlowChartProps {
  data: MonthlyCashFlowPoint[];
  currency?: string;
}

export function CashFlowChart({ data, currency = "BDT" }: CashFlowChartProps) {
  const { locale, t } = useI18n();

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/40 text-sm text-slate-400">
        {t.dashboard.noTransactionsYet}
      </div>
    );
  }

  // Format data for Recharts (convert minor units to major numbers for visual scale)
  const chartData = data.map((d) => ({
    name: d.month,
    inflow: Number(BigInt(d.incomeMinor) / 100n),
    outflow: Number(BigInt(d.expenseMinor) / 100n),
    incomeMinor: BigInt(d.incomeMinor),
    expenseMinor: BigInt(d.expenseMinor),
    netMinor: BigInt(d.netMinor),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md">
          <p className="mb-2 text-xs font-semibold text-slate-300">{label}</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-4 text-emerald-400">
              <span>{t.dashboard.addIncome}:</span>
              <span className="font-bold">
                {formatLocalizedAmount(point.incomeMinor, currency, locale, false)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-rose-400">
              <span>{t.dashboard.addExpense}:</span>
              <span className="font-bold">
                {formatLocalizedAmount(point.expenseMinor, currency, locale, false)}
              </span>
            </div>
            <div className="mt-2 border-t border-slate-800 pt-1.5 flex items-center justify-between gap-4 text-slate-200">
              <span>{t.dashboard.netSavings}:</span>
              <span className="font-bold">
                {formatLocalizedAmount(point.netMinor, currency, locale, true)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-72 w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={{ stroke: "#334155" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: "12px", fontSize: "12px" }}
            formatter={(value) => (
              <span className="text-slate-300">
                {value === "inflow" ? t.dashboard.addIncome : t.dashboard.addExpense}
              </span>
            )}
          />
          <Bar
            dataKey="inflow"
            name="inflow"
            fill="#10B981"
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
          />
          <Bar
            dataKey="outflow"
            name="outflow"
            fill="#F43F5E"
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

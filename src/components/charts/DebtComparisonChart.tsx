"use client";

import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useI18n } from "../../lib/i18n/context";
import { formatLocalizedAmount } from "../../lib/i18n";

interface DebtComparisonProps {
  receivablesMinor: string;
  payablesMinor: string;
  currency?: string;
}

export function DebtComparisonChart({
  receivablesMinor,
  payablesMinor,
  currency = "BDT",
}: DebtComparisonProps) {
  const { locale, t } = useI18n();

  const recMinor = BigInt(receivablesMinor || "0");
  const payMinor = BigInt(payablesMinor || "0");

  const chartData = [
    {
      category: t.dashboard.peopleOweYou,
      amount: Number(recMinor / 100n),
      minor: recMinor,
      fill: "#10B981", // Emerald (you receive)
    },
    {
      category: t.dashboard.youOwePeople,
      amount: Number(payMinor / 100n),
      minor: payMinor,
      fill: "#F43F5E", // Rose (you owe)
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur-md text-xs">
          <p className="font-semibold text-slate-200">{p.category}</p>
          <p className="mt-1 font-bold text-slate-100">
            {formatLocalizedAmount(p.minor, currency, locale, false)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-44 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="category"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="amount" radius={[0, 6, 6, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

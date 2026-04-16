'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface ChartDataPoint {
  label: string;
  value: number;
}

interface DashboardChartProps {
  data: ChartDataPoint[];
  title: string;
  color?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}

function CustomTooltip({
  active,
  payload,
  label,
  valuePrefix = '',
  valueSuffix = '',
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[oklch(0.10_0.008_240)] px-3 py-2 shadow-xl">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      <p className="text-sm font-bold text-white">
        {valuePrefix}{payload[0].value.toLocaleString('fr-FR')}{valueSuffix}
      </p>
    </div>
  );
}

export function DashboardChart({
  data,
  title,
  color = 'oklch(0.52 0.20 18)',
  valuePrefix = '',
  valueSuffix = '',
}: DashboardChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-white/30">
        Pas encore de données
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">{title}</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barCategoryGap="30%">
          <CartesianGrid
            vertical={false}
            stroke="oklch(1 0 0 / 6%)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="label"
            tick={{ fill: 'oklch(1 0 0 / 35%)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'oklch(1 0 0 / 35%)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            content={<CustomTooltip valuePrefix={valuePrefix} valueSuffix={valueSuffix} />}
            cursor={{ fill: 'oklch(1 0 0 / 4%)' }}
          />
          <Bar
            dataKey="value"
            fill={color}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

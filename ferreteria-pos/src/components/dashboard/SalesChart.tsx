'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { SalesChartData, DateFilter } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface SalesChartProps {
  data: SalesChartData[];
  filter: DateFilter;
  onFilterChange: (f: DateFilter) => void;
  loading?: boolean;
}

const FILTER_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: '7 días' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
];

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-gray-700">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-sm text-gray-600">
          <span className="font-medium text-orange-600">
            {formatCurrency(p.value)}
          </span>
          {p.name === 'count' && (
            <span className="ml-1 text-gray-400">ventas</span>
          )}
        </p>
      ))}
    </div>
  );
};

export default function SalesChart({
  data,
  filter,
  onFilterChange,
  loading = false,
}: SalesChartProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-800">
            Ventas por período
          </h3>
          <p className="text-sm text-gray-500">Ingresos y cantidad de ventas</p>
        </div>
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onFilterChange(value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === value
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-56 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-sm text-gray-400">
          No hay datos para este período
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(v) =>
                v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
              }
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              formatter={(value) =>
                value === 'revenue' ? 'Ingresos' : 'Cant. ventas'
              }
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#f97316' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

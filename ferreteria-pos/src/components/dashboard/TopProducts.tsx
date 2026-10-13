'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TopProductData } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface TopProductsProps {
  data: TopProductData[];
  loading?: boolean;
}

export default function TopProducts({ data, loading = false }: TopProductsProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-800">
          Productos más vendidos
        </h3>
        <p className="text-sm text-gray-500">Top 5 por ingresos generados</p>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-400">
          Sin datos disponibles
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 10, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) =>
                v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
              }
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              width={110}
              tickFormatter={(v: string) =>
                v.length > 14 ? v.slice(0, 14) + '…' : v
              }
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Ingresos']}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid #e5e7eb',
              }}
            />
            <Bar dataKey="revenue" fill="#f97316" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

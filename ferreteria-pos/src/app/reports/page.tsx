'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Download, TrendingUp, ShoppingBag, Package, CreditCard } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import * as XLSX from 'xlsx';

type Period = 'week' | 'month' | 'quarter' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Última semana',
  month: 'Último mes',
  quarter: 'Últimos 3 meses',
  year: 'Último año',
};

const COLORS = ['#1CA7EC', '#3b82f6', '#22c55e', '#a855f7', '#eab308', '#06b6d4', '#ef4444', '#6b7280'];

function getPeriodRange(period: Period): { from: Date; to: Date; groupBy: 'day' | 'week' | 'month' } {
  const to = new Date();
  const from = new Date();
  if (period === 'week')    { from.setDate(to.getDate() - 7);   return { from, to, groupBy: 'day' }; }
  if (period === 'month')   { from.setMonth(to.getMonth() - 1); return { from, to, groupBy: 'day' }; }
  if (period === 'quarter') { from.setMonth(to.getMonth() - 3); return { from, to, groupBy: 'week' }; }
  from.setFullYear(to.getFullYear() - 1);
  return { from, to, groupBy: 'month' };
}

function formatLabel(dateStr: string, groupBy: 'day' | 'week' | 'month') {
  const d = new Date(dateStr);
  if (groupBy === 'month') return d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
  if (groupBy === 'week')  return `Sem ${Math.ceil(d.getDate() / 7)} ${d.toLocaleDateString('es-CO', { month: 'short' })}`;
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);

  const [salesChart, setSalesChart] = useState<{ label: string; ingresos: number; ventas: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; cantidad: number; ingresos: number }[]>([]);
  const [byPayment, setByPayment] = useState<{ name: string; value: number; total: number }[]>([]);
  const [summary, setSummary] = useState({ revenue: 0, sales: 0, avgTicket: 0, topDay: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to, groupBy } = getPeriodRange(period);

    // ── Ventas del período ─────────────────────────────────────────────────
    const { data: salesData } = await supabase
      .from('sales')
      .select('id, total, payment_method, created_at')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
      .order('created_at');

    if (!salesData) { setLoading(false); return; }

    // Agrupar por período
    const buckets: Record<string, { ingresos: number; ventas: number }> = {};
    salesData.forEach(s => {
      const d = new Date(s.created_at);
      let key: string;
      if (groupBy === 'month') key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      else if (groupBy === 'week') {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = d.toISOString().split('T')[0];
      }
      if (!buckets[key]) buckets[key] = { ingresos: 0, ventas: 0 };
      buckets[key].ingresos += Number(s.total);
      buckets[key].ventas += 1;
    });

    const chartData = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({ label: formatLabel(key, groupBy), ...val }));
    setSalesChart(chartData);

    // Resumen
    const totalRevenue = salesData.reduce((a, s) => a + Number(s.total), 0);
    const maxBucket = Object.entries(buckets).sort((a, b) => b[1].ventas - a[1].ventas)[0];
    setSummary({
      revenue: totalRevenue,
      sales: salesData.length,
      avgTicket: salesData.length ? totalRevenue / salesData.length : 0,
      topDay: maxBucket ? formatLabel(maxBucket[0], groupBy) : '—',
    });

    // Por método de pago
    const payMap: Record<string, { count: number; total: number }> = {};
    salesData.forEach(s => {
      const k = s.payment_method;
      if (!payMap[k]) payMap[k] = { count: 0, total: 0 };
      payMap[k].count += 1;
      payMap[k].total += Number(s.total);
    });
    const payLabels: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' };
    setByPayment(Object.entries(payMap).map(([k, v]) => ({
      name: payLabels[k] ?? k,
      value: v.count,
      total: v.total,
    })));

    // ── Top productos ──────────────────────────────────────────────────────
    const saleIds = salesData.map(s => s.id);
    if (saleIds.length > 0) {
      const { data: itemsData } = await supabase
        .from('sale_items')
        .select('product_id, quantity, subtotal, product:products(name)')
        .in('sale_id', saleIds);

      if (itemsData) {
        const prodMap: Record<string, { name: string; cantidad: number; ingresos: number }> = {};
        itemsData.forEach((item: any) => {
          const pid = item.product_id;
          if (!prodMap[pid]) prodMap[pid] = { name: item.product?.name ?? pid, cantidad: 0, ingresos: 0 };
          prodMap[pid].cantidad += item.quantity;
          prodMap[pid].ingresos += Number(item.subtotal);
        });
        const sorted = Object.values(prodMap).sort((a, b) => b.ingresos - a.ingresos).slice(0, 8);
        setTopProducts(sorted);
      }
    } else {
      setTopProducts([]);
    }

    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // ── Exportar a Excel ───────────────────────────────────────────────────────
  const exportExcel = async () => {
    const { from, to } = getPeriodRange(period);
    const { data: salesData } = await supabase
      .from('sales')
      .select('id, total, discount, payment_method, cash_received, change_given, notes, created_at')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
      .order('created_at');

    if (!salesData?.length) return alert('No hay ventas en este período');

    const wb = XLSX.utils.book_new();

    // Hoja resumen
    const resumenWs = XLSX.utils.aoa_to_sheet([
      ['Reporte de Ventas — Ferretería POS'],
      ['Período', PERIOD_LABELS[period]],
      ['Desde', from.toLocaleDateString('es-CO')],
      ['Hasta', to.toLocaleDateString('es-CO')],
      [],
      ['Total ingresos', summary.revenue],
      ['Total ventas', summary.sales],
      ['Ticket promedio', summary.avgTicket],
    ]);
    XLSX.utils.book_append_sheet(wb, resumenWs, 'Resumen');

    // Hoja ventas
    const ventasRows = salesData.map(s => ({
      'Fecha': new Date(s.created_at).toLocaleString('es-CO'),
      'Total': Number(s.total),
      'Descuento': Number(s.discount),
      'Método de pago': s.payment_method === 'cash' ? 'Efectivo' : s.payment_method === 'card' ? 'Tarjeta' : 'Transferencia',
      'Efectivo recibido': s.cash_received ?? '',
      'Vuelto': s.change_given ?? '',
      'Notas': s.notes ?? '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ventasRows), 'Ventas');

    // Hoja top productos
    if (topProducts.length) {
      const prodRows = topProducts.map(p => ({
        'Producto': p.name,
        'Unidades vendidas': p.cantidad,
        'Ingresos': p.ingresos,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prodRows), 'Top Productos');
    }

    XLSX.writeFile(wb, `reporte_${period}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <AppShell>
      <div className="space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Reportes</h2>
            <p className="text-sm text-gray-500">Análisis de ventas e inventario</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Selector de período */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-2 font-medium transition-colors ${
                    period === p ? 'bg-sky-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p === 'week' ? '7d' : p === 'month' ? 'Mes' : p === 'quarter' ? '3m' : 'Año'}
                </button>
              ))}
            </div>
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4 text-green-600" />
              <span className="hidden sm:inline">Exportar </span>Excel
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {[
                { label: 'Ingresos totales', value: formatCurrency(summary.revenue), icon: TrendingUp, color: 'text-sky-500', bg: 'bg-sky-50' },
                { label: 'Total ventas', value: summary.sales.toString(), icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-50' },
                { label: 'Ticket promedio', value: formatCurrency(summary.avgTicket), icon: CreditCard, color: 'text-green-500', bg: 'bg-green-50' },
                { label: 'Período más activo', value: summary.topDay || '—', icon: Package, color: 'text-purple-500', bg: 'bg-purple-50' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-500">{label}</p>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
              ))}
            </div>

            {/* Gráfica de ventas por período */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Ingresos por período</h3>
              <p className="text-sm text-gray-500 mb-5">{PERIOD_LABELS[period]}</p>
              {salesChart.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-gray-400 text-sm">
                  No hay ventas en este período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={salesChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === 'ingresos' ? [formatCurrency(value), 'Ingresos'] : [value, 'Ventas']
                      }
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="ingresos" stroke="#1CA7EC" strokeWidth={2} dot={false} name="ingresos" />
                    <Line yAxisId="right" type="monotone" dataKey="ventas" stroke="#3b82f6" strokeWidth={2} dot={false} name="ventas" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top productos */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Productos más vendidos</h3>
                <p className="text-sm text-gray-500 mb-5">Top 8 por ingresos generados</p>
                {topProducts.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-gray-400 text-sm">Sin datos</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={topProducts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis type="number" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="ingresos" fill="#1CA7EC" radius={[0, 4, 4, 0]} name="Ingresos" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Métodos de pago */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Métodos de pago</h3>
                <p className="text-sm text-gray-500 mb-5">Distribución de ventas</p>
                {byPayment.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-gray-400 text-sm">Sin datos</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={byPayment} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {byPayment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number, name: string) => [v + ' ventas', name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                      {byPayment.map((p, i) => (
                        <div key={p.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="text-gray-700">{p.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium text-gray-900">{formatCurrency(p.total)}</span>
                            <span className="text-gray-400 ml-2">({p.value} ventas)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Tabla detalle por período */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Detalle por período</h3>
              {salesChart.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin datos para mostrar</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-3 font-medium">Período</th>
                        <th className="pb-3 font-medium text-right">Ventas</th>
                        <th className="pb-3 font-medium text-right">Ingresos</th>
                        <th className="pb-3 font-medium text-right">Ticket promedio</th>
                        <th className="pb-3 font-medium text-right">% del total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {salesChart.map((row) => (
                        <tr key={row.label} className="hover:bg-gray-50">
                          <td className="py-3 font-medium text-gray-900">{row.label}</td>
                          <td className="py-3 text-right text-gray-600">{row.ventas}</td>
                          <td className="py-3 text-right text-gray-900 font-medium">{formatCurrency(row.ingresos)}</td>
                          <td className="py-3 text-right text-gray-600">
                            {row.ventas > 0 ? formatCurrency(row.ingresos / row.ventas) : '—'}
                          </td>
                          <td className="py-3 text-right text-gray-600">
                            {summary.revenue > 0 ? ((row.ingresos / summary.revenue) * 100).toFixed(1) + '%' : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 font-semibold">
                        <td className="pt-3 text-gray-900">Total</td>
                        <td className="pt-3 text-right text-gray-900">{summary.sales}</td>
                        <td className="pt-3 text-right text-sky-600">{formatCurrency(summary.revenue)}</td>
                        <td className="pt-3 text-right text-gray-900">{formatCurrency(summary.avgTicket)}</td>
                        <td className="pt-3 text-right text-gray-900">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DollarSign,
  ShoppingBag,
  Package,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import StatsCard from '@/components/dashboard/StatsCard';
import SalesChart from '@/components/dashboard/SalesChart';
import TopProducts from '@/components/dashboard/TopProducts';
import { supabase } from '@/lib/supabase';
import {
  formatCurrency,
  formatDateTime,
  getDateRange,
  groupByDate,
  paymentMethodLabel,
} from '@/lib/utils';
import type {
  DateFilter,
  KPIStats,
  SalesChartData,
  TopProductData,
  Sale,
  Product,
} from '@/types';

// ─── Mock helpers while DB is empty ──────────────────────────────────────────
function emptyKPI(): KPIStats {
  return {
    todayRevenue: 0,
    todaySalesCount: 0,
    totalProducts: 0,
    lowStockCount: 0,
    revenueChange: 0,
    salesCountChange: 0,
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<KPIStats>(emptyKPI());
  const [chartData, setChartData] = useState<SalesChartData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductData[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [chartFilter, setChartFilter] = useState<DateFilter>('week');
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);

  // ── KPI stats — 2 consultas en vez de 5 ───────────────────────────────────
  const loadStats = useCallback(async () => {
    setLoadingStats(true);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // Consulta 1: ventas de los últimos 2 días + recientes en una sola llamada
    // Consulta 2: todos los productos activos (stock + count) en una sola llamada
    const [{ data: salesData }, { data: productsData }] = await Promise.all([
      supabase
        .from('sales')
        .select('id, total, payment_method, created_at, sale_items(*, product:products(name))')
        .gte('created_at', yesterdayStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('products')
        .select('id, name, stock, min_stock, unit, active')
        .eq('active', true)
        .order('stock', { ascending: true })
        .limit(200),
    ]);

    // Calcular KPIs en cliente — sin round-trips extra
    const todaySales     = (salesData ?? []).filter(s => s.created_at >= todayStart.toISOString());
    const yesterdaySales = (salesData ?? []).filter(s => s.created_at < todayStart.toISOString());
    const todayRevenue     = todaySales.reduce((s, r) => s + Number(r.total), 0);
    const yesterdayRevenue = yesterdaySales.reduce((s, r) => s + Number(r.total), 0);
    const revenueChange    = yesterdayRevenue === 0 ? 0
      : ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;

    const allProducts  = (productsData ?? []) as Product[];
    const lowStockList = allProducts.filter(p => p.stock <= p.min_stock);

    setStats({
      todayRevenue,
      todaySalesCount: todaySales.length,
      totalProducts:   allProducts.length,
      lowStockCount:   lowStockList.length,
      revenueChange,
      salesCountChange: 0,
    });

    setLowStock(lowStockList.slice(0, 10));
    setRecentSales((salesData ?? []).slice(0, 5) as Sale[]);
    setLoadingStats(false);
  }, []);

  // ── Chart data — 1 consulta con join incluido ─────────────────────────────
  const loadChartData = useCallback(
    async (filter: DateFilter) => {
      setLoadingChart(true);
      const { from, to } = getDateRange(filter);

      // Una sola consulta que trae ventas + items + productos
      const { data } = await supabase
        .from('sales')
        .select('created_at, total, sale_items(quantity, subtotal, product:products(name))')
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at', { ascending: true });

      setChartData(groupByDate(data ?? [], filter));

      // Top productos calculado del mismo resultado
      const productMap = new Map<string, { quantity: number; revenue: number }>();
      for (const sale of data ?? []) {
        for (const item of (sale.sale_items as any[]) ?? []) {
          const name = item.product?.name ?? 'Desconocido';
          const existing = productMap.get(name) ?? { quantity: 0, revenue: 0 };
          productMap.set(name, {
            quantity: existing.quantity + item.quantity,
            revenue:  existing.revenue  + Number(item.subtotal),
          });
        }
      }
      setTopProducts(
        Array.from(productMap.entries())
          .map(([name, v]) => ({ name, ...v }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
      );
      setLoadingChart(false);
    },
    []
  );

  // Cargar stats y gráfico en paralelo al montar
  useEffect(() => {
    loadStats();
    loadChartData(chartFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadChartData(chartFilter);
  }, [chartFilter, loadChartData]);

  const handleFilterChange = (f: DateFilter) => {
    setChartFilter(f);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            title="Ingresos de hoy"
            value={formatCurrency(stats.todayRevenue)}
            change={stats.revenueChange}
            changeLabel="vs ayer"
            icon={DollarSign}
            iconColor="text-orange-600"
            iconBg="bg-orange-100"
            loading={loadingStats}
          />
          <StatsCard
            title="Ventas hoy"
            value={stats.todaySalesCount.toString()}
            icon={ShoppingBag}
            iconColor="text-blue-600"
            iconBg="bg-blue-100"
            loading={loadingStats}
          />
          <StatsCard
            title="Productos activos"
            value={stats.totalProducts.toString()}
            icon={Package}
            iconColor="text-purple-600"
            iconBg="bg-purple-100"
            loading={loadingStats}
          />
          <StatsCard
            title="Stock bajo"
            value={stats.lowStockCount.toString()}
            icon={AlertTriangle}
            iconColor="text-red-600"
            iconBg="bg-red-100"
            loading={loadingStats}
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <SalesChart
              data={chartData}
              filter={chartFilter}
              onFilterChange={handleFilterChange}
              loading={loadingChart}
            />
          </div>
          <TopProducts data={topProducts} loading={loadingChart} />
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent sales */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <h3 className="text-base font-semibold text-gray-800">
                Ventas recientes
              </h3>
            </div>
            {loadingStats ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-lg bg-gray-100"
                  />
                ))}
              </div>
            ) : recentSales.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                No hay ventas registradas
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {formatDateTime(sale.created_at)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {paymentMethodLabel(sale.payment_method)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(sale.total)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low stock */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="text-base font-semibold text-gray-800">
                Alertas de stock
              </h3>
            </div>
            {loadingStats ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-lg bg-gray-100"
                  />
                ))}
              </div>
            ) : lowStock.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                ¡Todo el inventario en orden! 🎉
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {lowStock.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Mínimo: {product.min_stock} {product.unit}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        product.stock === 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {product.stock} {product.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

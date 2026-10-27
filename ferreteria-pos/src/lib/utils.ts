import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { DateFilter } from '@/types';

// ─── Tailwind ─────────────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency ─────────────────────────────────────────────────────────────────

const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return COP_FORMATTER.format(value);
}

export function parseCurrency(value: string): number {
  return Number(value.replace(/[^0-9.-]/g, '')) || 0;
}

// ─── Dates ────────────────────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
}

export function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

/**
 * Returns ISO start/end timestamps for a given DateFilter.
 */
export function getDateRange(filter: DateFilter): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  let from: Date;

  switch (filter) {
    case 'today':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      from = new Date(now);
      from.setDate(now.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      break;
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      from = new Date(now.getFullYear(), 0, 1);
      break;
  }

  return { from: from.toISOString(), to };
}

/**
 * Group an array of dated items into chart-friendly buckets.
 */
export function groupByDate(
  items: Array<{ created_at: string; total: number }>,
  filter: DateFilter
): Array<{ date: string; revenue: number; count: number }> {
  const map = new Map<string, { revenue: number; count: number }>();

  const fmt = (d: Date) => {
    if (filter === 'today') {
      return `${d.getHours().toString().padStart(2, '0')}:00`;
    }
    if (filter === 'year') {
      return d.toLocaleString('es-CO', { month: 'short', year: '2-digit' });
    }
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
  };

  for (const item of items) {
    const key = fmt(new Date(item.created_at));
    const existing = map.get(key) ?? { revenue: 0, count: 0 };
    map.set(key, {
      revenue: existing.revenue + item.total,
      count: existing.count + 1,
    });
  }

  return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function generateId(): string {
  return crypto.randomUUID();
}

export function truncate(text: string, length = 40): string {
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

export function stockStatusColor(stock: number, minStock: number): string {
  if (stock === 0) return 'text-red-600 bg-red-50';
  if (stock <= minStock) return 'text-amber-600 bg-amber-50';
  return 'text-green-600 bg-green-50';
}

export function stockStatusLabel(stock: number, minStock: number): string {
  if (stock === 0) return 'Agotado';
  if (stock <= minStock) return 'Stock bajo';
  return 'En stock';
}

export function paymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
  };
  return labels[method] ?? method;
}

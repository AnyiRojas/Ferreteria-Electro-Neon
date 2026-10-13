'use client';

import Image from 'next/image';
import {
  Edit2,
  EyeOff,
  Package,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { Product } from '@/types';
import {
  formatCurrency,
  stockStatusColor,
  stockStatusLabel,
} from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useMode } from '@/lib/ModeContext';

interface ProductTableProps {
  products: Product[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onAdjust: (p: Product) => void;
  loading?: boolean;
}

const ADMIN_COLUMNS = [
  { key: 'name',     label: 'Producto' },
  { key: 'category', label: 'Categoría' },
  { key: 'supplier', label: 'Proveedor' },
  { key: 'price',    label: 'P. Venta' },
  { key: 'cost',     label: 'P. Compra' },
  { key: 'stock',    label: 'Stock' },
  { key: 'status',   label: 'Estado' },
  { key: 'actions',  label: '' },
];

const CAJA_COLUMNS = [
  { key: 'name',     label: 'Producto' },
  { key: 'category', label: 'Categoría' },
  { key: 'price',    label: 'Precio' },
  { key: 'stock',    label: 'Stock' },
  { key: 'status',   label: 'Estado' },
];

export default function ProductTable({
  products,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  onAdjust,
  loading = false,
}: ProductTableProps) {
  const { mode } = useMode();
  const isAdmin = mode !== 'caja';
  const COLUMNS = isAdmin ? ADMIN_COLUMNS : CAJA_COLUMNS;

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp className="ml-1 h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3" />
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {COLUMNS.map(({ key, label }) => (
              <th
                key={key}
                onClick={() =>
                  ['name', 'price', 'cost', 'stock'].includes(key)
                    ? onSort(key)
                    : undefined
                }
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500',
                  ['name', 'price', 'cost', 'stock'].includes(key) &&
                    'cursor-pointer select-none hover:text-gray-700'
                )}
              >
                <span className="flex items-center">
                  {label}
                  <SortIcon col={key} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <tr key={i}>
                {COLUMNS.map((c) => (
                  <td key={c.key} className="px-4 py-3">
                    <div className="h-4 animate-pulse rounded bg-gray-100" />
                  </td>
                ))}
              </tr>
            ))
          ) : products.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length} className="py-12 text-center text-gray-400">
                No se encontraron productos
              </td>
            </tr>
          ) : (
            products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                {/* Producto */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                      {p.image_url ? (
                        <Image src={p.image_url} alt={p.name} fill className="object-contain p-1" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package className="h-5 w-5 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{p.name}</p>
                      {p.barcode && <p className="text-xs text-gray-400">{p.barcode}</p>}
                    </div>
                  </div>
                </td>
                {/* Categoría */}
                <td className="px-4 py-3 text-gray-500">{p.category?.name ?? '—'}</td>
                {/* Proveedor — solo admin */}
                {isAdmin && (
                  <td className="px-4 py-3 text-gray-500">{p.supplier ?? '—'}</td>
                )}
                {/* Precio venta */}
                <td className="px-4 py-3 font-medium text-gray-800">{formatCurrency(p.price)}</td>
                {/* Precio compra — solo admin */}
                {isAdmin && (
                  <td className="px-4 py-3 text-gray-500">{formatCurrency(p.cost)}</td>
                )}
                {/* Stock */}
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${stockStatusColor(p.stock, p.min_stock)}`}>
                    {p.stock} {p.unit}
                  </span>
                </td>
                {/* Estado */}
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-500">{stockStatusLabel(p.stock, p.min_stock)}</span>
                </td>
                {/* Acciones — solo admin */}
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => onAdjust(p)} className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100">
                        Stock
                      </button>
                      <button onClick={() => onEdit(p)} className="rounded-md p-1.5 text-orange-500 hover:bg-orange-50">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(p)}
                        title="Desactivar producto"
                        className="rounded-md p-1.5 text-red-400 hover:bg-red-50"
                      >
                        <EyeOff className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

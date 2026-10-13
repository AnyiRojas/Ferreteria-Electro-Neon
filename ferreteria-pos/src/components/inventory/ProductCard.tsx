'use client';

import Image from 'next/image';
import { Edit2, Trash2, Package, AlertTriangle } from 'lucide-react';
import type { Product } from '@/types';
import { formatCurrency, stockStatusColor, stockStatusLabel } from '@/lib/utils';
import { useMode } from '@/lib/ModeContext';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onAdjust: (product: Product) => void;
}

export default function ProductCard({
  product,
  onEdit,
  onDelete,
  onAdjust,
}: ProductCardProps) {
  const isLowStock = product.stock <= product.min_stock;
  const { mode } = useMode();
  const isAdmin = mode !== 'caja';

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Image */}
      <div className="relative h-40 bg-gray-50">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-contain p-3"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-12 w-12 text-gray-300" />
          </div>
        )}
        {isLowStock && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
            <AlertTriangle className="h-3 w-3" />
            {product.stock === 0 ? 'Agotado' : 'Stock bajo'}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-orange-500">
          {product.category?.name ?? 'Sin categoría'}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-gray-800">
          {product.name}
        </h3>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(product.price)}
            </p>
            {isAdmin && (
              <p className="text-xs text-gray-400">
                Costo: {formatCurrency(product.cost)}
              </p>
            )}
            {isAdmin && product.supplier && (
              <p className="text-xs text-gray-400">
                {product.supplier}
              </p>
            )}
          </div>
          <div className="text-right">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${stockStatusColor(
                product.stock,
                product.min_stock
              )}`}
            >
              {product.stock} {product.unit}
            </span>
            <p className="mt-0.5 text-xs text-gray-400">
              {stockStatusLabel(product.stock, product.min_stock)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onAdjust(product)}
            className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Ajustar stock
          </button>
          <button
            onClick={() => onEdit(product)}
            className="rounded-lg border border-orange-200 p-1.5 text-orange-500 hover:bg-orange-50"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(product)}
            className="rounded-lg border border-red-100 p-1.5 text-red-400 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import type { CartItem } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface POSCartProps {
  items: CartItem[];
  discount: number;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onDiscountChange: (discount: number) => void;
  onCheckout: () => void;
}

export default function POSCart({
  items,
  discount,
  onUpdateQty,
  onRemove,
  onDiscountChange,
  onCheckout,
}: POSCartProps) {
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <ShoppingCart className="h-5 w-5 text-orange-500" />
        <h3 className="font-semibold text-gray-800">
          Carrito
        </h3>
        <span className="ml-auto rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-600">
          {items.length}
        </span>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
            <ShoppingCart className="h-8 w-8" />
            <p className="text-sm">Carrito vacío</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.product.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 line-clamp-1">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatCurrency(item.unit_price)} c/u
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onUpdateQty(item.product.id, item.quantity - 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-7 text-center text-sm font-semibold text-gray-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQty(item.product.id, item.quantity + 1)}
                    disabled={item.quantity >= item.product.stock}
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onRemove(item.product.id)}
                    className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-red-400 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <p className="mt-1 text-right text-sm font-semibold text-gray-700">
                {formatCurrency(item.subtotal)}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {items.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-3">
          {/* Discount */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">
              Descuento %
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={discount || ''}
              onChange={(e) => onDiscountChange(Math.min(100, Math.max(0, Number(e.target.value))))}
              placeholder="0"
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento ({discount}%)</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-2 font-bold text-gray-900 text-base">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <button
            onClick={onCheckout}
            className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 active:scale-95 transition-transform"
          >
            Cobrar {formatCurrency(total)}
          </button>
        </div>
      )}
    </div>
  );
}

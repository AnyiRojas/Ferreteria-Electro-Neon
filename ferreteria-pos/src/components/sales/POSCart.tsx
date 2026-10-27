'use client';

import { useState } from 'react';
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

// Sub-componente para editar cantidad con input directo
function QtyEditor({
  item,
  onUpdateQty,
  onRemove,
}: {
  item: CartItem;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) {
  const [inputVal, setInputVal] = useState(item.quantity.toString());
  const [editing, setEditing] = useState(false);
  const [overStock, setOverStock] = useState(false); // alerta de exceso de stock

  const commit = (val: string) => {
    const n = parseInt(val, 10);
    setOverStock(false);
    if (!isNaN(n) && n <= 0) {
      onRemove(item.product.id);
    } else if (!isNaN(n) && n > item.product.stock) {
      // Supera stock: aplicar el máximo y mostrar alerta
      onUpdateQty(item.product.id, item.product.stock);
      setInputVal(item.product.stock.toString());
      setOverStock(true);
      // Ocultar alerta después de 3 segundos
      setTimeout(() => setOverStock(false), 3000);
    } else if (!isNaN(n) && n > 0) {
      onUpdateQty(item.product.id, n);
      setInputVal(n.toString());
    } else {
      setInputVal(item.quantity.toString());
    }
    setEditing(false);
  };

  // Sincronizar si el qty cambia externamente
  if (!editing && item.quantity.toString() !== inputVal && !overStock) {
    setInputVal(item.quantity.toString());
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            const next = item.quantity - 1;
            if (next <= 0) { onRemove(item.product.id); return; }
            onUpdateQty(item.product.id, next);
            setInputVal(next.toString());
            setOverStock(false);
          }}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          <Minus className="h-3 w-3" />
        </button>

        {/* Input directo editable */}
        <input
          type="number"
          min="1"
          max={item.product.stock}
          value={editing ? inputVal : item.quantity}
          onFocus={() => {
            setEditing(true);
            setOverStock(false);
            setInputVal(item.quantity.toString());
          }}
          onChange={(e) => {
            setInputVal(e.target.value);
            // Alerta visual en tiempo real si supera stock
            const n = parseInt(e.target.value, 10);
            setOverStock(!isNaN(n) && n > item.product.stock);
          }}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(inputVal);
            if (e.key === 'Escape') {
              setInputVal(item.quantity.toString());
              setOverStock(false);
              setEditing(false);
            }
          }}
          className={`w-10 rounded-md border text-center text-sm font-semibold py-0.5 focus:outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            overStock
              ? 'border-red-400 bg-red-50 text-red-600 focus:ring-red-400'
              : 'border-gray-200 text-gray-800 focus:ring-sky-400'
          }`}
        />

        <button
          onClick={() => {
            const next = item.quantity + 1;
            if (next > item.product.stock) {
              setOverStock(true);
              setTimeout(() => setOverStock(false), 3000);
              return;
            }
            onUpdateQty(item.product.id, next);
            setInputVal(next.toString());
          }}
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

      {/* Alerta de stock insuficiente */}
      {overStock && (
        <p className="text-xs font-medium text-red-500 leading-none">
          Máx. disponible: {item.product.stock}
        </p>
      )}
    </div>
  );
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
        <ShoppingCart className="h-5 w-5 text-sky-500" />
        <h3 className="font-semibold text-gray-800">Carrito</h3>
        <span className="ml-auto rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-600">
          {items.length}
        </span>
      </div>

      {/* Items — scroll propio */}
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
                     <p className="text-base font-semibold text-gray-900 line-clamp-2 leading-tight">
                       {item.product.name}
                     </p>
                     <p className="text-sm text-gray-500 mt-0.5">
                       {formatCurrency(item.unit_price)} c/u
                     </p>
                </div>
                <QtyEditor item={item} onUpdateQty={onUpdateQty} onRemove={onRemove} />
              </div>
              <p className="mt-1 text-right text-base font-bold text-gray-800">
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
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
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
            className="w-full rounded-xl bg-sky-500 py-3 text-sm font-bold text-white hover:bg-sky-600 active:scale-95 transition-transform"
          >
            Cobrar {formatCurrency(total)}
          </button>
        </div>
      )}
    </div>
  );
}

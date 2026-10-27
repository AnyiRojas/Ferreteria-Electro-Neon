'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingCart, X, Minus, Plus, Trash2, ArrowRight } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { formatCurrency } from '@/lib/utils';

export default function FloatingCart() {
  const { cart, discount, itemCount, total, updateQty, removeFromCart } = useCart();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Solo mostrar fuera de /sales (en /sales ya hay el carrito lateral)
  // Y solo si hay items en el carrito
  const show = pathname !== '/sales' && itemCount > 0;

  if (!show) return null;

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const discountAmount = (subtotal * discount) / 100;

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #1CA7EC, #4ADEDE)' }}
        title="Ver carrito"
      >
        <ShoppingCart className="h-6 w-6 text-white" />
        {/* Badge con cantidad */}
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      </button>

      {/* Panel lateral del carrito flotante */}
      {open && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="fixed bottom-0 right-0 z-50 flex h-full max-h-[85vh] w-full max-w-sm flex-col rounded-t-2xl bg-white shadow-2xl sm:bottom-6 sm:right-6 sm:h-auto sm:rounded-2xl">
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-sky-500" />
                <h3 className="font-semibold text-gray-800">Carrito activo</h3>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-600">
                  {itemCount}
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Lista de productos */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 px-3">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(item.unit_price)} c/u</p>
                  </div>
                  {/* Controles de cantidad compactos */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => updateQty(item.product.id, item.quantity - 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-gray-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-red-400 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="w-20 shrink-0 text-right text-sm font-semibold text-gray-700">
                    {formatCurrency(item.subtotal)}
                  </p>
                </div>
              ))}
            </div>

            {/* Footer con total y botón ir al POS */}
            <div className="border-t border-gray-100 px-5 py-4 space-y-3">
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
                onClick={() => { setOpen(false); router.push('/sales'); }}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-colors"
                style={{ background: 'linear-gradient(90deg, #1CA7EC, #4ADEDE)' }}
              >
                Ir al Punto de Venta
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-center text-xs text-gray-400">
                El carrito se mantiene al navegar entre secciones
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}

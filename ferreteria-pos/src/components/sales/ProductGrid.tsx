'use client';

import Image from 'next/image';
import { Plus, Package, Search } from 'lucide-react';
import type { CartItem, Product } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface ProductGridProps {
  products: Product[];
  cart: CartItem[];
  search: string;
  onSearch: (q: string) => void;
  onAdd: (product: Product) => void;
  loading?: boolean;
}

export default function ProductGrid({
  products,
  cart,
  search,
  onSearch,
  onAdd,
  loading = false,
}: ProductGridProps) {
  // Mapa rápido: productId → cantidad en carrito
  const cartQty = new Map(cart.map((i) => [i.product.id, i.quantity]));

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar producto o código…"
          className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-gray-400 gap-2">
          <Package className="h-10 w-10" />
          <p className="text-sm">No se encontraron productos</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {products.map((p) => {
              const inCart    = cartQty.get(p.id) ?? 0;
              const available = p.stock - inCart;       // stock real restante
              const isOut     = p.stock === 0;
              const maxed     = available <= 0 && !isOut; // ya en carrito al máximo
              const disabled  = isOut || available <= 0;

              return (
                <button
                  key={p.id}
                  onClick={() => onAdd(p)}
                  disabled={disabled}
                  title={disabled ? (isOut ? 'Agotado' : `Solo quedan ${p.stock} und y ya están en el carrito`) : ''}
                  className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-left transition-all hover:border-orange-300 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {/* Image */}
                  <div className="relative h-24 w-full bg-gray-50">
                    {p.image_url ? (
                      <Image src={p.image_url} alt={p.name} fill className="object-contain p-2" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-8 w-8 text-gray-200" />
                      </div>
                    )}

                    {/* Badge agotado */}
                    {isOut && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                          Agotado
                        </span>
                      </div>
                    )}

                    {/* Badge máximo en carrito */}
                    {maxed && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                          Máx. en carrito
                        </span>
                      </div>
                    )}

                    {/* Badge stock bajo (quedan pocas unidades y aún disponible) */}
                    {!isOut && !maxed && available <= 3 && (
                      <div className="absolute left-1.5 top-1.5">
                        <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-xs font-bold text-white">
                          {available} disp.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col p-2">
                    <p className="line-clamp-2 text-xs font-medium text-gray-800 leading-tight">
                      {p.name}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-1.5">
                      <div>
                        <p className="text-xs font-bold text-orange-600">
                          {formatCurrency(p.price)}
                        </p>
                        {/* Stock siempre visible para el vendedor */}
                        <p className={`text-xs ${available <= 0 ? 'text-red-400' : available <= 3 ? 'text-amber-500' : 'text-gray-400'}`}>
                          {p.stock} en stock{inCart > 0 ? ` · ${inCart} en carrito` : ''}
                        </p>
                      </div>
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full transition-colors ${disabled ? 'bg-gray-200' : 'bg-orange-500'}`}>
                        <Plus className={`h-3 w-3 ${disabled ? 'text-gray-400' : 'text-white'}`} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

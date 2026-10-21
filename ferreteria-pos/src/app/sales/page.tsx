'use client';

import { useCallback, useEffect, useState } from 'react';
import { History, X } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import ProductGrid from '@/components/sales/ProductGrid';
import POSCart from '@/components/sales/POSCart';
import SaleModal from '@/components/sales/SaleModal';
import InvoicePrint from '@/components/sales/InvoicePrint';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDateTime, paymentMethodLabel } from '@/lib/utils';
import type { CartItem, Category, CheckoutData, Product, Sale } from '@/types';

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Factura post-venta
  const [invoiceData, setInvoiceData] = useState<{
    items: CartItem[];
    checkoutData: CheckoutData;
    saleId: string;
  } | null>(null);

  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load products ─────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('products')
      .select('*, category:categories(id,name)')
      .eq('active', true)
      .order('name');

    if (categoryFilter) query = query.eq('category_id', categoryFilter);
    if (search)
      query = query.or(
        `name.ilike.%${search}%,barcode.ilike.%${search}%`
      );

    const { data } = await query;
    setProducts((data ?? []) as Product[]);
    setLoading(false);
  }, [search, categoryFilter]);

  const loadCategories = useCallback(async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    setCategories(data ?? []);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const t = setTimeout(loadProducts, 250);
    return () => clearTimeout(t);
  }, [loadProducts]);

  // ── Cart ops ──────────────────────────────────────────────────────────────
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((i) =>
          i.product.id === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                subtotal: (i.quantity + 1) * i.unit_price,
              }
            : i
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unit_price: product.price,
          subtotal: product.price,
        },
      ];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: qty, subtotal: qty * i.unit_price }
          : i
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  // ── Checkout ──────────────────────────────────────────────────────────────
  const handleCheckout = async (data: CheckoutData) => {
    const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
    const discountAmount = (subtotal * data.discount) / 100;
    const total = subtotal - discountAmount;

    const items = cart.map((i) => ({
      product_id: i.product.id,
      quantity: i.quantity,
      unit_price: i.unit_price,
      subtotal: i.subtotal,
    }));

    // Recuperar el turno de caja activo (si existe)
    const registerId = sessionStorage.getItem('active_register_id') ?? null;

    const { data: saleId, error } = await supabase.rpc('process_sale', {
      p_items: items,
      p_total: total,
      p_discount: discountAmount,
      p_payment_method: data.payment_method,
      p_cash_received: data.cash_received,
      p_change_given: data.cash_received - total,
      p_notes: data.notes || null,
      p_register_id: registerId,
    });

    if (error) {
      showToast('Error procesando venta: ' + error.message);
      return;
    }

    // Guarda snapshot para imprimir la factura
    setInvoiceData({
      items: [...cart],
      checkoutData: data,
      saleId: saleId as string,
    });

    setShowCheckout(false);
    setCart([]);
    setDiscount(0);
    loadProducts(); // refresh stock
  };

  const closeCheckout = () => {
    setShowCheckout(false);
  };

  // ── History ───────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from('sales')
      .select('*, sale_items(quantity, unit_price, product:products(name))')
      .order('created_at', { ascending: false })
      .limit(30);
    setRecentSales((data ?? []) as Sale[]);
    setLoadingHistory(false);
  }, []);

  const openHistory = () => {
    setShowHistory(true);
    loadHistory();
  };

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-4rem)] gap-4">
        {/* Left — product grid */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Category tabs */}
          <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setCategoryFilter('')}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                categoryFilter === ''
                  ? 'bg-sky-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-sky-300'
              }`}
            >
              Todos
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(c.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  categoryFilter === c.id
                    ? 'bg-sky-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-sky-300'
                }`}
              >
                {c.name}
              </button>
            ))}
            {/* History button */}
            <button
              onClick={openHistory}
              className="ml-auto shrink-0 flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-sky-300"
            >
              <History className="h-3.5 w-3.5" />
              Historial
            </button>
          </div>

          <div className="flex-1 min-h-0">
            <ProductGrid
              products={products}
              cart={cart}
              search={search}
              onSearch={setSearch}
              onAdd={addToCart}
              loading={loading}
            />
          </div>
        </div>

        {/* Right — cart */}
        <div className="w-72 shrink-0 xl:w-80">
          <POSCart
            items={cart}
            discount={discount}
            onUpdateQty={updateQty}
            onRemove={removeFromCart}
            onDiscountChange={setDiscount}
            onCheckout={() => setShowCheckout(true)}
          />
        </div>
      </div>

      {/* Checkout modal */}
      {showCheckout && cart.length > 0 && (
        <SaleModal
          items={cart}
          discount={discount}
          onConfirm={handleCheckout}
          onClose={closeCheckout}
        />
      )}

      {/* Factura / impresión post-venta */}
      {invoiceData && (
        <InvoicePrint
          items={invoiceData.items}
          checkoutData={invoiceData.checkoutData}
          saleId={invoiceData.saleId}
          onClose={() => setInvoiceData(null)}
        />
      )}

      {/* History drawer */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Historial de ventas
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {loadingHistory ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
                </div>
              ) : recentSales.length === 0 ? (
                <p className="py-16 text-center text-sm text-gray-400">
                  No hay ventas registradas
                </p>
              ) : (
                recentSales.map((sale) => (
                  <div key={sale.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {formatCurrency(sale.total)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {paymentMethodLabel(sale.payment_method)} ·{' '}
                          {formatDateTime(sale.created_at)}
                        </p>
                      </div>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Completada
                      </span>
                    </div>
                    {sale.sale_items && sale.sale_items.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {sale.sale_items.map((item, idx) => (
                          <li key={idx} className="text-xs text-gray-500">
                            {(item.product as unknown as { name: string })?.name ?? '—'} ×{item.quantity} —{' '}
                            {formatCurrency(item.unit_price)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-gray-900 px-5 py-3.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </AppShell>
  );
}

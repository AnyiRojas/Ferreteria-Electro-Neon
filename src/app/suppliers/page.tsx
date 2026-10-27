'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Truck, X, Edit2, Loader2, ShoppingBag, CheckCircle, Clock, XCircle } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { Supplier, PurchaseOrder, PurchaseOrderItem, Product } from '@/types';

type SupplierForm = Omit<Supplier, 'id' | 'created_at'>;

const emptySupplierForm = (): SupplierForm => ({
  name: '', nit: null, contact_name: null, email: null,
  phone: null, address: null, city: null, active: true,
});

const STATUS_LABELS: Record<PurchaseOrder['status'], { label: string; color: string; Icon: React.ElementType }> = {
  pending:   { label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-700', Icon: Clock },
  received:  { label: 'Recibida',   color: 'bg-green-100 text-green-700',   Icon: CheckCircle },
  cancelled: { label: 'Cancelada',  color: 'bg-red-100 text-red-700',       Icon: XCircle },
};

export default function SuppliersPage() {
  const [tab, setTab] = useState<'suppliers' | 'orders'>('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(emptySupplierForm());
  const [editSupplierId, setEditSupplierId] = useState<string | null>(null);

  // Formulario nueva orden de compra
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderSupplierId, setOrderSupplierId] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderItems, setOrderItems] = useState<{ product_id: string; quantity: number; unit_cost: number }[]>([]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('suppliers').select('*').eq('active', true).order('name');
    if (search) q = q.ilike('name', `%${search}%`);
    const { data } = await q;
    setSuppliers((data ?? []) as Supplier[]);
    setLoading(false);
  }, [search]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('purchase_orders')
      .select('*, supplier:suppliers(name), items:purchase_order_items(*, product:products(name))')
      .order('created_at', { ascending: false })
      .limit(50);
    setOrders((data ?? []) as PurchaseOrder[]);
    setLoading(false);
  }, []);

  const loadProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('id, name, cost').eq('active', true).order('name');
    setProducts((data ?? []) as Product[]);
  }, []);

  useEffect(() => { if (tab === 'suppliers') loadSuppliers(); else loadOrders(); }, [tab, loadSuppliers, loadOrders]);
  useEffect(() => { loadProducts(); }, [loadProducts]);

  // ── Guardar proveedor ────────────────────────────────────────────────────
  const handleSaveSupplier = async () => {
    if (!supplierForm.name) return;
    setSaving(true);
    const payload = {
      ...supplierForm,
      nit: supplierForm.nit || null, contact_name: supplierForm.contact_name || null,
      email: supplierForm.email || null, phone: supplierForm.phone || null,
      address: supplierForm.address || null, city: supplierForm.city || null,
    };
    const { error } = editSupplierId
      ? await supabase.from('suppliers').update(payload).eq('id', editSupplierId)
      : await supabase.from('suppliers').insert(payload);
    if (error) showToast('Error: ' + error.message);
    else { showToast(editSupplierId ? 'Proveedor actualizado' : 'Proveedor creado'); closeSupplierForm(); loadSuppliers(); }
    setSaving(false);
  };

  const openEditSupplier = (s: Supplier) => {
    setSupplierForm({ name: s.name, nit: s.nit, contact_name: s.contact_name, email: s.email, phone: s.phone, address: s.address, city: s.city, active: s.active });
    setEditSupplierId(s.id);
    setShowSupplierForm(true);
  };
  const closeSupplierForm = () => { setShowSupplierForm(false); setEditSupplierId(null); setSupplierForm(emptySupplierForm()); };

  // ── Crear orden de compra ────────────────────────────────────────────────
  const addOrderItem = () => setOrderItems(i => [...i, { product_id: '', quantity: 1, unit_cost: 0 }]);
  const updateOrderItem = (idx: number, field: string, value: string | number) => {
    setOrderItems(items => items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };
  const removeOrderItem = (idx: number) => setOrderItems(items => items.filter((_, i) => i !== idx));

  const handleSaveOrder = async () => {
    if (!orderSupplierId || orderItems.length === 0) return;
    const validItems = orderItems.filter(i => i.product_id && i.quantity > 0 && i.unit_cost >= 0);
    if (validItems.length === 0) return;
    setSaving(true);
    const total = validItems.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
    const { data: orderData, error } = await supabase
      .from('purchase_orders')
      .insert({ supplier_id: orderSupplierId, total, notes: orderNotes || null })
      .select('id')
      .single();
    if (error || !orderData) { showToast('Error creando orden'); setSaving(false); return; }
    const items = validItems.map(i => ({ order_id: orderData.id, product_id: i.product_id, quantity: i.quantity, unit_cost: i.unit_cost, subtotal: i.quantity * i.unit_cost }));
    await supabase.from('purchase_order_items').insert(items);
    showToast('Orden de compra creada');
    setShowOrderForm(false);
    setOrderSupplierId(''); setOrderNotes(''); setOrderItems([]);
    setSaving(false);
    loadOrders();
  };

  // ── Recibir orden (actualiza stock) ─────────────────────────────────────
  const receiveOrder = async (order: PurchaseOrder) => {
    if (!order.items || order.items.length === 0) return;
    setSaving(true);
    for (const item of (order.items as unknown as (PurchaseOrderItem & { product?: { name: string } })[]) ) {
      // Actualizar costo del producto
      await supabase.from('products').update({ cost: item.unit_cost }).eq('id', item.product_id);
      // Incrementar stock
      const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
      if (prod) {
        await supabase.from('products').update({ stock: (prod.stock ?? 0) + item.quantity }).eq('id', item.product_id);
        await supabase.from('stock_movements').insert({
          product_id: item.product_id, type: 'in',
          quantity: item.quantity, reason: 'Recepción de compra', reference_id: order.id,
        });
      }
    }
    await supabase.from('purchase_orders').update({ status: 'received', received_at: new Date().toISOString() }).eq('id', order.id);
    showToast('Mercancía recibida y stock actualizado');
    setSaving(false);
    loadOrders();
  };

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Proveedores</h2>
            <p className="text-sm text-gray-500">Gestión de proveedores y órdenes de compra</p>
          </div>
          <div className="flex gap-2">
            {tab === 'suppliers' && (
              <button onClick={() => { setShowSupplierForm(true); setEditSupplierId(null); setSupplierForm(emptySupplierForm()); }}
                className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600">
                <Plus className="h-4 w-4" /> Nuevo proveedor
              </button>
            )}
            {tab === 'orders' && (
              <button onClick={() => setShowOrderForm(true)}
                className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600">
                <Plus className="h-4 w-4" /> Nueva orden
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit text-sm">
          {(['suppliers', 'orders'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 font-medium transition-colors ${tab === t ? 'bg-sky-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {t === 'suppliers' ? 'Proveedores' : 'Órdenes de compra'}
            </button>
          ))}
        </div>

        {tab === 'suppliers' && (
          <>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proveedor…"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-400 hover:bg-gray-600 transition-colors"
                  title="Limpiar búsqueda"
                >
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              )}
            </div>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex h-48 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
                </div>
              ) : suppliers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Truck className="h-10 w-10 mb-2" />
                  <p className="text-sm">No hay proveedores registrados</p>
                </div>
              ) : (
                <>
                  {/* Vista móvil: tarjetas */}
                  <div className="divide-y divide-gray-100 sm:hidden">
                    {suppliers.map(s => (
                      <div key={s.id} className="flex items-start justify-between gap-3 px-4 py-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{s.name}</p>
                          {s.nit && <p className="text-sm text-gray-500">NIT: {s.nit}</p>}
                          {s.contact_name && <p className="text-sm text-gray-500">{s.contact_name}</p>}
                          {s.phone && <p className="text-sm text-gray-500">{s.phone}</p>}
                          {s.city && <p className="text-sm text-gray-400">{s.city}</p>}
                        </div>
                        <button onClick={() => openEditSupplier(s)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-sky-600 shrink-0">
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Vista escritorio: tabla */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>{['Nombre', 'NIT', 'Contacto', 'Teléfono', 'Ciudad', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {suppliers.map(s => (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                            <td className="px-4 py-3 text-gray-600">{s.nit ?? '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{s.contact_name ?? '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{s.phone ?? '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{s.city ?? '—'}</td>
                            <td className="px-4 py-3">
                              <button onClick={() => openEditSupplier(s)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-sky-600">
                                <Edit2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {tab === 'orders' && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ShoppingBag className="h-10 w-10 mb-2" />
                <p className="text-sm">No hay órdenes de compra</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {orders.map(o => {
                  const st = STATUS_LABELS[o.status];
                  return (
                    <div key={o.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{(o.supplier as any)?.name ?? '—'}</p>
                          <p className="text-xs text-gray-400">{formatDateTime(o.created_at)} · {formatCurrency(o.total)}</p>
                          {o.items && o.items.length > 0 && (
                            <ul className="mt-1.5 space-y-0.5">
                              {(o.items as unknown as (PurchaseOrderItem & { product?: { name: string } })[]).map((item, idx) => (
                                <li key={idx} className="text-xs text-gray-500">
                                  {item.product?.name ?? '—'} × {item.quantity} @ {formatCurrency(item.unit_cost)}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${st.color}`}>
                            <st.Icon className="h-3 w-3" /> {st.label}
                          </span>
                          {o.status === 'pending' && (
                            <button
                              onClick={() => receiveOrder(o)}
                              disabled={saving}
                              className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 disabled:opacity-60"
                            >
                              Recibir
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal proveedor ── */}
      {showSupplierForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold">{editSupplierId ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
              <button onClick={closeSupplierForm} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: 'Nombre *', field: 'name', value: supplierForm.name },
                { label: 'NIT', field: 'nit', value: supplierForm.nit ?? '' },
                { label: 'Contacto', field: 'contact_name', value: supplierForm.contact_name ?? '' },
                { label: 'Teléfono', field: 'phone', value: supplierForm.phone ?? '' },
                { label: 'Email', field: 'email', value: supplierForm.email ?? '' },
                { label: 'Ciudad', field: 'city', value: supplierForm.city ?? '' },
                { label: 'Dirección', field: 'address', value: supplierForm.address ?? '' },
              ].map(({ label, field, value }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input value={value} onChange={e => setSupplierForm(f => ({ ...f, [field]: e.target.value || null }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button onClick={closeSupplierForm} className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onClick={handleSaveSupplier} disabled={saving || !supplierForm.name}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-60">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editSupplierId ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal nueva orden ── */}
      {showOrderForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold">Nueva orden de compra</h3>
              <button onClick={() => setShowOrderForm(false)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
                <select value={orderSupplierId} onChange={e => setOrderSupplierId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
                  <option value="">Seleccionar proveedor...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <input value={orderNotes} onChange={e => setOrderNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Productos</label>
                  <button onClick={addOrderItem} className="flex items-center gap-1 text-xs text-sky-600 hover:text-orange-700 font-medium">
                    <Plus className="h-3.5 w-3.5" /> Agregar
                  </button>
                </div>
                {orderItems.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
                    Agrega productos a la orden
                  </p>
                ) : (
                  <div className="space-y-2">
                    {orderItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select value={item.product_id} onChange={e => updateOrderItem(idx, 'product_id', e.target.value)}
                          className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
                          <option value="">Producto...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input type="number" min="1" value={item.quantity} onChange={e => updateOrderItem(idx, 'quantity', parseInt(e.target.value))}
                          placeholder="Cant" className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                        <input type="number" min="0" value={item.unit_cost} onChange={e => updateOrderItem(idx, 'unit_cost', parseFloat(e.target.value))}
                          placeholder="Costo" className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                        <button onClick={() => removeOrderItem(idx)} className="text-gray-400 hover:text-red-500">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <div className="text-right text-sm font-semibold text-gray-900 pt-1">
                      Total: {formatCurrency(orderItems.reduce((s, i) => s + (i.quantity || 0) * (i.unit_cost || 0), 0))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
              <button onClick={() => setShowOrderForm(false)} className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSaveOrder} disabled={saving || !orderSupplierId || orderItems.length === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Crear orden
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-gray-900 px-5 py-3.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </AppShell>
  );
}

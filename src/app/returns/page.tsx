'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, RotateCcw, X, Search, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { Return, Product, Sale } from '@/types';

type ReturnForm = {
  sale_id: string;
  reason: string;
  notes: string;
  items: { product_id: string; quantity: number; unit_price: number }[];
};

const STATUS_STYLES: Record<Return['status'], { label: string; color: string; Icon: React.ElementType }> = {
  pending:  { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', Icon: Clock },
  approved: { label: 'Aprobada',  color: 'bg-green-100 text-green-700',   Icon: CheckCircle },
  rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-700',       Icon: XCircle },
};

export default function ReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ReturnForm>({ sale_id: '', reason: '', notes: '', items: [] });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('returns')
      .select('*, items:return_items(*, product:products(name))')
      .order('created_at', { ascending: false })
      .limit(50);
    setReturns((data ?? []) as Return[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    supabase.from('products').select('id, name, price').eq('active', true).order('name')
      .then(({ data }) => setProducts((data ?? []) as Product[]));
  }, []);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_id: '', quantity: 1, unit_price: 0 }] }));
  const updateItem = (idx: number, field: string, value: string | number) =>
    setForm(f => ({ ...f, items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item) }));
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    if (!form.reason || form.items.length === 0) return;
    const validItems = form.items.filter(i => i.product_id && i.quantity > 0);
    if (!validItems.length) return;
    setSaving(true);
    const total = validItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const { data: ret, error } = await supabase
      .from('returns')
      .insert({ sale_id: form.sale_id || null, reason: form.reason, total, notes: form.notes || null })
      .select('id').single();
    if (error || !ret) { showToast('Error creando devolución'); setSaving(false); return; }
    await supabase.from('return_items').insert(
      validItems.map(i => ({ return_id: ret.id, product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price, subtotal: i.quantity * i.unit_price }))
    );
    showToast('Devolución registrada');
    setShowForm(false);
    setForm({ sale_id: '', reason: '', notes: '', items: [] });
    setSaving(false);
    load();
  };

  const updateStatus = async (id: string, status: Return['status'], restoreStock: boolean) => {
    setSaving(true);
    const ret = returns.find(r => r.id === id);
    if (status === 'approved' && restoreStock && ret?.items) {
      for (const item of ret.items as any[]) {
        const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
        if (prod) {
          await supabase.from('products').update({ stock: prod.stock + item.quantity }).eq('id', item.product_id);
          await supabase.from('stock_movements').insert({ product_id: item.product_id, type: 'in', quantity: item.quantity, reason: 'Devolución aprobada', reference_id: id });
        }
      }
    }
    await supabase.from('returns').update({ status }).eq('id', id);
    showToast(`Devolución ${status === 'approved' ? 'aprobada' : 'rechazada'}`);
    setSaving(false);
    load();
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Devoluciones</h2>
            <p className="text-sm text-gray-500">Registro y gestión de devoluciones</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600">
            <Plus className="h-4 w-4" /> Nueva devolución
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
            </div>
          ) : returns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <RotateCcw className="h-10 w-10 mb-2" />
              <p className="text-sm">No hay devoluciones registradas</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {returns.map(r => {
                const st = STATUS_STYLES[r.status];
                return (
                  <div key={r.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{r.reason}</p>
                        <p className="text-xs text-gray-400">{formatDateTime(r.created_at)} · {formatCurrency(r.total)}</p>
                        {r.notes && <p className="text-xs text-gray-500 mt-0.5">{r.notes}</p>}
                        {r.items && r.items.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {(r.items as any[]).map((item, idx) => (
                              <li key={idx} className="text-xs text-gray-500">
                                {item.product?.name ?? '—'} × {item.quantity} — {formatCurrency(item.unit_price)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${st.color}`}>
                          <st.Icon className="h-3 w-3" /> {st.label}
                        </span>
                        {r.status === 'pending' && (
                          <>
                            <button onClick={() => updateStatus(r.id, 'approved', true)}
                              disabled={saving}
                              className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 disabled:opacity-60">
                              Aprobar
                            </button>
                            <button onClick={() => updateStatus(r.id, 'rejected', false)}
                              disabled={saving}
                              className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60">
                              Rechazar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal nueva devolución ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold">Nueva devolución</h3>
              <button onClick={() => setShowForm(false)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de devolución *</label>
                <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Ej: Producto defectuoso, error en pedido..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID de venta original (opcional)</label>
                <input value={form.sale_id} onChange={e => setForm(f => ({ ...f, sale_id: e.target.value }))} placeholder="UUID de la venta..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Productos devueltos</label>
                  <button onClick={addItem} className="flex items-center gap-1 text-xs text-sky-600 hover:text-orange-700 font-medium">
                    <Plus className="h-3.5 w-3.5" /> Agregar
                  </button>
                </div>
                {form.items.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">Agrega los productos a devolver</p>
                ) : (
                  <div className="space-y-2">
                    {form.items.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)}
                          className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
                          <option value="">Producto...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value))}
                          placeholder="Cant" className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                        <input type="number" min="0" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value))}
                          placeholder="Precio" className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                        <button onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                      </div>
                    ))}
                    <p className="text-right text-sm font-semibold text-gray-900">
                      Total: {formatCurrency(form.items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0))}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.reason || form.items.length === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Registrar devolución
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

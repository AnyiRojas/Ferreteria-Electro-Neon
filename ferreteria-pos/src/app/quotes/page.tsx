'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, FileText, X, Loader2, CheckCircle, Clock, XCircle, Send, Copy } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { Quote, Customer, Product } from '@/types';

const STATUS_STYLES: Record<Quote['status'], { label: string; color: string; Icon: React.ElementType }> = {
  draft:    { label: 'Borrador', color: 'bg-gray-100 text-gray-600',     Icon: FileText },
  sent:     { label: 'Enviada',  color: 'bg-blue-100 text-blue-700',     Icon: Send },
  approved: { label: 'Aprobada', color: 'bg-green-100 text-green-700',   Icon: CheckCircle },
  rejected: { label: 'Rechazada',color: 'bg-red-100 text-red-700',       Icon: XCircle },
};

type QuoteForm = {
  customer_id: string;
  customer_name: string;
  valid_until: string;
  discount: number;
  notes: string;
  items: { product_id: string; quantity: number; unit_price: number }[];
};

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<QuoteForm>({ customer_id: '', customer_name: '', valid_until: '', discount: 0, notes: '', items: [] });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('quotes')
      .select('*, customer:customers(name), items:quote_items(*, product:products(name))')
      .order('created_at', { ascending: false })
      .limit(50);
    setQuotes((data ?? []) as Quote[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    supabase.from('customers').select('id, name').eq('active', true).order('name').then(({ data }) => setCustomers((data ?? []) as Customer[]));
    supabase.from('products').select('id, name, price').eq('active', true).order('name').then(({ data }) => setProducts((data ?? []) as Product[]));
  }, []);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_id: '', quantity: 1, unit_price: 0 }] }));
  const updateItem = (idx: number, field: string, value: string | number) => {
    setForm(f => {
      const items = f.items.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        if (field === 'product_id') {
          const prod = products.find(p => p.id === value);
          if (prod) updated.unit_price = prod.price;
        }
        return updated;
      });
      return { ...f, items };
    });
  };
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    const validItems = form.items.filter(i => i.product_id && i.quantity > 0);
    if (!validItems.length) return;
    setSaving(true);
    const subtotal = validItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const total = subtotal - (subtotal * form.discount / 100);
    const { data: q, error } = await supabase.from('quotes').insert({
      customer_id: form.customer_id || null,
      customer_name: form.customer_name || null,
      valid_until: form.valid_until || null,
      discount: form.discount,
      total,
      notes: form.notes || null,
    }).select('id').single();
    if (error || !q) { showToast('Error creando cotización'); setSaving(false); return; }
    await supabase.from('quote_items').insert(
      validItems.map(i => ({ quote_id: q.id, product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price, subtotal: i.quantity * i.unit_price }))
    );
    showToast('Cotización creada');
    setShowForm(false);
    setForm({ customer_id: '', customer_name: '', valid_until: '', discount: 0, notes: '', items: [] });
    setSaving(false);
    load();
  };

  const updateStatus = async (id: string, status: Quote['status']) => {
    await supabase.from('quotes').update({ status }).eq('id', id);
    showToast('Estado actualizado');
    load();
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Cotizaciones</h2>
            <p className="text-sm text-gray-500">Genera y gestiona cotizaciones para clientes</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600">
            <Plus className="h-4 w-4" /> Nueva cotización
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileText className="h-10 w-10 mb-2" />
              <p className="text-sm">No hay cotizaciones registradas</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {quotes.map(q => {
                const st = STATUS_STYLES[q.status];
                return (
                  <div key={q.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {(q.customer as any)?.name ?? q.customer_name ?? 'Cliente sin nombre'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDateTime(q.created_at)} · {formatCurrency(q.total)}
                          {q.valid_until && ` · Válida hasta: ${q.valid_until}`}
                        </p>
                        {q.notes && <p className="text-xs text-gray-500 mt-0.5">{q.notes}</p>}
                        {q.items && q.items.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {(q.items as any[]).map((item, idx) => (
                              <li key={idx} className="text-xs text-gray-500">
                                {item.product?.name ?? '—'} × {item.quantity} — {formatCurrency(item.unit_price)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${st.color}`}>
                          <st.Icon className="h-3 w-3" /> {st.label}
                        </span>
                        {q.status === 'draft' && (
                          <div className="flex gap-1.5">
                            <button onClick={() => updateStatus(q.id, 'sent')}
                              className="rounded-lg border border-blue-300 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">
                              Enviar
                            </button>
                            <button onClick={() => updateStatus(q.id, 'approved')}
                              className="rounded-lg bg-green-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-600">
                              Aprobar
                            </button>
                            <button onClick={() => updateStatus(q.id, 'rejected')}
                              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                              Rechazar
                            </button>
                          </div>
                        )}
                        {q.status === 'sent' && (
                          <div className="flex gap-1.5">
                            <button onClick={() => updateStatus(q.id, 'approved')}
                              className="rounded-lg bg-green-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-600">
                              Aprobar
                            </button>
                            <button onClick={() => updateStatus(q.id, 'rejected')}
                              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                              Rechazar
                            </button>
                          </div>
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

      {/* ── Modal nueva cotización ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold">Nueva cotización</h3>
              <button onClick={() => setShowForm(false)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente (registrado)</label>
                  <select value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
                    <option value="">Seleccionar...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">O nombre libre</label>
                  <input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Nombre del cliente"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Válida hasta</label>
                  <input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descuento (%)</label>
                  <input type="number" min="0" max="100" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Productos</label>
                  <button onClick={addItem} className="flex items-center gap-1 text-xs text-sky-600 hover:text-orange-700 font-medium">
                    <Plus className="h-3.5 w-3.5" /> Agregar
                  </button>
                </div>
                {form.items.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">Agrega productos a la cotización</p>
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
                    <div className="text-right text-sm space-y-0.5">
                      <p className="text-gray-500">Subtotal: {formatCurrency(form.items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0))}</p>
                      {form.discount > 0 && <p className="text-green-600">Descuento ({form.discount}%): -{formatCurrency(form.items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0) * form.discount / 100)}</p>}
                      <p className="font-semibold text-gray-900">Total: {formatCurrency(form.items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0) * (1 - form.discount / 100))}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || form.items.length === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Crear cotización
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

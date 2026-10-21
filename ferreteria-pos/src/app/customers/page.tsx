'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Users, X, Edit2, Loader2, History } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { Customer, Sale } from '@/types';

type CustomerForm = Omit<Customer, 'id' | 'created_at'>;

const emptyForm = (): CustomerForm => ({
  name: '', document_type: 'CC', document_number: '',
  email: null, phone: null, address: null, city: null, active: true,
});

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CustomerForm>(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);

  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<Sale[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  // ── Cargar clientes ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('customers').select('*').eq('active', true).order('name');
    if (search) q = q.or(`name.ilike.%${search}%,document_number.ilike.%${search}%,phone.ilike.%${search}%`);
    const { data } = await q;
    setCustomers((data ?? []) as Customer[]);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  // ── Guardar cliente ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name || !form.document_number) return;
    setSaving(true);
    const payload = { ...form, email: form.email || null, phone: form.phone || null, address: form.address || null, city: form.city || null };
    const { error } = editId
      ? await supabase.from('customers').update(payload).eq('id', editId)
      : await supabase.from('customers').insert(payload);
    if (error) showToast('Error: ' + error.message);
    else { showToast(editId ? 'Cliente actualizado' : 'Cliente creado'); closeForm(); load(); }
    setSaving(false);
  };

  const openNew = () => { setForm(emptyForm()); setEditId(null); setShowForm(true); };
  const openEdit = (c: Customer) => {
    setForm({ name: c.name, document_type: c.document_type, document_number: c.document_number, email: c.email, phone: c.phone, address: c.address, city: c.city, active: c.active });
    setEditId(c.id);
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditId(null); setForm(emptyForm()); };

  // ── Historial de compras ─────────────────────────────────────────────────
  const openHistory = async (c: Customer) => {
    setHistoryCustomer(c);
    setLoadingHistory(true);
    const { data } = await supabase
      .from('sales')
      .select('*, sale_items(quantity, unit_price, product:products(name))')
      .eq('customer_id', c.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setHistory((data ?? []) as Sale[]);
    setLoadingHistory(false);
  };

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Clientes</h2>
            <p className="text-sm text-gray-500">Registro de clientes frecuentes</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
          >
            <Plus className="h-4 w-4" /> Nuevo cliente
          </button>
        </div>

        {/* Buscador */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, documento, teléfono…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        {/* Tabla */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Users className="h-10 w-10 mb-2" />
              <p className="text-sm">{search ? 'Sin resultados' : 'No hay clientes registrados'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Nombre', 'Documento', 'Teléfono', 'Ciudad', 'Acciones'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600">{c.document_type} {c.document_number}</td>
                      <td className="px-4 py-3 text-gray-600">{c.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.city ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openHistory(c)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600" title="Historial">
                            <History className="h-4 w-4" />
                          </button>
                          <button onClick={() => openEdit(c)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-sky-600" title="Editar">
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal de formulario ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold">{editId ? 'Editar cliente' : 'Nuevo cliente'}</h3>
              <button onClick={closeForm} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo doc. *</label>
                  <select value={form.document_type} onChange={e => setForm(f => ({ ...f, document_type: e.target.value as Customer['document_type'] }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
                    {['CC', 'NIT', 'CE', 'PP'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número doc. *</label>
                  <input value={form.document_number} onChange={e => setForm(f => ({ ...f, document_number: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value || null }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                  <input value={form.city ?? ''} onChange={e => setForm(f => ({ ...f, city: e.target.value || null }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value || null }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input value={form.address ?? ''} onChange={e => setForm(f => ({ ...f, address: e.target.value || null }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={closeForm} className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name || !form.document_number}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editId ? 'Actualizar' : 'Crear cliente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Historial de compras ── */}
      {historyCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Historial de compras</h3>
                <p className="text-sm text-gray-500">{historyCustomer.name}</p>
              </div>
              <button onClick={() => setHistoryCustomer(null)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {loadingHistory ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
                </div>
              ) : history.length === 0 ? (
                <p className="py-16 text-center text-sm text-gray-400">Sin compras registradas</p>
              ) : (
                history.map(s => (
                  <div key={s.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{formatCurrency(s.total)}</p>
                        <p className="text-xs text-gray-400">{formatDateTime(s.created_at)}</p>
                      </div>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Completada</span>
                    </div>
                    {s.sale_items && s.sale_items.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {s.sale_items.map((item, idx) => (
                          <li key={idx} className="text-xs text-gray-500">
                            {(item.product as any)?.name ?? '—'} ×{item.quantity} — {formatCurrency(item.unit_price)}
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

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-gray-900 px-5 py-3.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </AppShell>
  );
}

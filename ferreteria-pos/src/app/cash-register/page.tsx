'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DollarSign, Lock, Unlock, Plus, Minus, Loader2,
  CreditCard, ArrowLeftRight, History, Printer, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { CashRegister, CashMovement } from '@/types';

type MovementForm = { type: 'income' | 'expense'; amount: string; description: string };

interface SaleRow { id: string; total: number; payment_method: string; created_at: string; sale_items: { quantity: number; unit_price: number; product: { name: string } | null }[] }
interface HistoryRegister extends CashRegister {
  movements: CashMovement[];
  sales: SaleRow[];
  expanded?: boolean;
}

// ─── Componente de impresión del informe de cierre ─────────────────────────────
function CashClosePrintRoot({ reg, sales, movements, settings }: {
  reg: CashRegister;
  sales: SaleRow[];
  movements: CashMovement[];
  settings: { company_name: string; nit: string };
}) {
  const totalIncome   = movements.filter(m => m.type === 'income').reduce((s, m) => s + Number(m.amount), 0);
  const totalExpense  = movements.filter(m => m.type === 'expense').reduce((s, m) => s + Number(m.amount), 0);
  const cashSales     = sales.filter(s => s.payment_method === 'cash').reduce((s, r) => s + r.total, 0);
  const cardSales     = sales.filter(s => s.payment_method === 'card').reduce((s, r) => s + r.total, 0);
  const transferSales = sales.filter(s => s.payment_method === 'transfer').reduce((s, r) => s + r.total, 0);
  const totalSales    = sales.reduce((s, r) => s + r.total, 0);
  const expected      = Number(reg.opening_balance) + cashSales + totalIncome - totalExpense;

  return (
    <div id="cash-close-print-root">
      <div style={{ fontFamily: 'monospace', fontSize: '12px', width: '72mm', padding: '2mm' }}>
        {/* Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>{settings.company_name}</p>
          <p style={{ fontSize: '10px', margin: '1px 0' }}>NIT: {settings.nit}</p>
          <p style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '3px' }}>INFORME DE CIERRE DE CAJA</p>
        </div>

        <hr style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

        {/* Datos del turno */}
        <p style={{ margin: '2px 0' }}><strong>Apertura:</strong> {formatDateTime(reg.opened_at)}</p>
        {reg.closed_at && <p style={{ margin: '2px 0' }}><strong>Cierre:</strong> {formatDateTime(reg.closed_at)}</p>}
        {reg.created_by && <p style={{ margin: '2px 0' }}><strong>Cajero:</strong> {reg.created_by}</p>}

        <hr style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

        {/* Ventas por método */}
        <p style={{ fontWeight: 'bold', margin: '2px 0' }}>VENTAS POR MÉTODO DE PAGO</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
          <span>Efectivo</span><span>{formatCurrency(cashSales)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
          <span>Tarjeta</span><span>{formatCurrency(cardSales)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
          <span>Transferencia</span><span>{formatCurrency(transferSales)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', margin: '3px 0' }}>
          <span>TOTAL VENTAS</span><span>{formatCurrency(totalSales)}</span>
        </div>

        <hr style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

        {/* Detalle de ventas */}
        <p style={{ fontWeight: 'bold', margin: '2px 0' }}>DETALLE DE VENTAS ({sales.length})</p>
        {sales.map((s, idx) => (
          <div key={s.id} style={{ marginBottom: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span>#{idx + 1} {s.payment_method === 'cash' ? 'EFE' : s.payment_method === 'card' ? 'TAR' : 'TRF'} {formatDateTime(s.created_at).split(' ')[1]}</span>
              <span style={{ fontWeight: 'bold' }}>{formatCurrency(s.total)}</span>
            </div>
            {s.sale_items?.map((item, i) => (
              <div key={i} style={{ fontSize: '9px', color: '#444', paddingLeft: '4px' }}>
                {item.product?.name ?? '—'} x{item.quantity} @ {formatCurrency(item.unit_price)}
              </div>
            ))}
          </div>
        ))}

        {/* Ingresos / Egresos */}
        {movements.length > 0 && (
          <>
            <hr style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
            <p style={{ fontWeight: 'bold', margin: '2px 0' }}>INGRESOS Y EGRESOS</p>
            {movements.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0', fontSize: '10px' }}>
                <span>{m.type === 'income' ? '↑' : '↓'} {m.description}</span>
                <span style={{ color: m.type === 'income' ? '#166534' : '#991b1b' }}>
                  {m.type === 'income' ? '+' : '-'}{formatCurrency(m.amount)}
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0', fontSize: '10px' }}>
              <span>Total ingresos extra</span><span style={{ color: '#166534' }}>+{formatCurrency(totalIncome)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0', fontSize: '10px' }}>
              <span>Total egresos</span><span style={{ color: '#991b1b' }}>-{formatCurrency(totalExpense)}</span>
            </div>
          </>
        )}

        <hr style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

        {/* Conciliación */}
        <p style={{ fontWeight: 'bold', margin: '2px 0' }}>CONCILIACIÓN DE EFECTIVO</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
          <span>Base inicial</span><span>{formatCurrency(Number(reg.opening_balance))}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
          <span>+ Ventas efectivo</span><span>{formatCurrency(cashSales)}</span>
        </div>
        {totalIncome > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span>+ Ingresos extra</span><span>{formatCurrency(totalIncome)}</span>
          </div>
        )}
        {totalExpense > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span>- Egresos</span><span style={{ color: '#991b1b' }}>-{formatCurrency(totalExpense)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', margin: '3px 0' }}>
          <span>ESPERADO EN CAJA</span><span>{formatCurrency(expected)}</span>
        </div>
        {reg.closing_balance != null && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
              <span>Contado físicamente</span><span>{formatCurrency(Number(reg.closing_balance))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', margin: '3px 0', color: Number(reg.difference ?? 0) < 0 ? '#991b1b' : '#166534' }}>
              <span>DIFERENCIA</span><span>{formatCurrency(Number(reg.difference ?? 0))}</span>
            </div>
          </>
        )}

        <hr style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
        <p style={{ textAlign: 'center', fontSize: '10px', margin: 0 }}>Generado: {formatDateTime(new Date().toISOString())}</p>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function CashRegisterPage() {
  const [tab, setTab] = useState<'turno' | 'historial'>('turno');
  const [register, setRegister] = useState<CashRegister | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [salesSummary, setSalesSummary] = useState({ cash: 0, card: 0, transfer: 0, total: 0 });
  const [turnSales, setTurnSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Historial
  const [history, setHistory] = useState<HistoryRegister[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Impresión
  const [printData, setPrintData] = useState<{ reg: CashRegister; sales: SaleRow[]; movements: CashMovement[] } | null>(null);
  const [settings, setSettings] = useState({ company_name: 'FERRETERÍA', nit: '—' });

  // Formularios
  const [openBalance, setOpenBalance] = useState('');
  const [openNote, setOpenNote] = useState('');
  const [closeBalance, setCloseBalance] = useState('');
  const [closeNote, setCloseNote] = useState('');
  const [movForm, setMovForm] = useState<MovementForm>({ type: 'income', amount: '', description: '' });
  const [showMovForm, setShowMovForm] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  // Cargar settings para el encabezado de impresión
  useEffect(() => {
    supabase.from('app_settings').select('company_name, nit').eq('id', '00000000-0000-0000-0000-000000000001').single()
      .then(({ data }) => { if (data) setSettings({ company_name: data.company_name || 'FERRETERÍA', nit: data.nit || '—' }); });
  }, []);

  // ── Cargar turno abierto ──────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const { data: reg } = await supabase
      .from('cash_registers').select('*').eq('status', 'open')
      .order('opened_at', { ascending: false }).limit(1).maybeSingle();

    setRegister(reg ?? null);

    if (reg) {
      sessionStorage.setItem('active_register_id', reg.id);
      const [{ data: movs }, { data: sls }] = await Promise.all([
        supabase.from('cash_movements').select('*').eq('register_id', reg.id).order('created_at', { ascending: false }),
        supabase.from('sales').select('id, total, payment_method, created_at, sale_items(quantity, unit_price, product:products(name))')
          .eq('register_id', reg.id).order('created_at', { ascending: false }),
      ]);
      const mList = (movs ?? []) as CashMovement[];
      const sList = (sls ?? []) as unknown as SaleRow[];
      setMovements(mList);
      setTurnSales(sList);
      setSalesSummary({
        cash:     sList.filter(r => r.payment_method === 'cash').reduce((s, r) => s + Number(r.total), 0),
        card:     sList.filter(r => r.payment_method === 'card').reduce((s, r) => s + Number(r.total), 0),
        transfer: sList.filter(r => r.payment_method === 'transfer').reduce((s, r) => s + Number(r.total), 0),
        total:    sList.reduce((s, r) => s + Number(r.total), 0),
      });
    } else {
      sessionStorage.removeItem('active_register_id');
      setMovements([]);
      setTurnSales([]);
      setSalesSummary({ cash: 0, card: 0, transfer: 0, total: 0 });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Cargar historial ──────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    const { data: regs } = await supabase
      .from('cash_registers').select('*').eq('status', 'closed')
      .order('opened_at', { ascending: false }).limit(30);

    if (!regs || regs.length === 0) { setHistory([]); setLoadingHistory(false); return; }

    const ids = regs.map(r => r.id);
    const [{ data: allMovs }, { data: allSales }] = await Promise.all([
      supabase.from('cash_movements').select('*').in('register_id', ids),
      supabase.from('sales')
        .select('id, total, payment_method, created_at, register_id, sale_items(quantity, unit_price, product:products(name))')
        .in('register_id', ids).order('created_at', { ascending: false }),
    ]);

    const movMap: Record<string, CashMovement[]> = {};
    const saleMap: Record<string, SaleRow[]> = {};
    for (const m of allMovs ?? []) { if (!movMap[m.register_id]) movMap[m.register_id] = []; movMap[m.register_id].push(m as CashMovement); }
    for (const s of allSales ?? []) { const rid = (s as any).register_id; if (!saleMap[rid]) saleMap[rid] = []; saleMap[rid].push(s as unknown as SaleRow); }

    setHistory(regs.map(r => ({
      ...(r as CashRegister),
      movements: movMap[r.id] ?? [],
      sales: saleMap[r.id] ?? [],
      expanded: false,
    })));
    setLoadingHistory(false);
  }, []);

  useEffect(() => { if (tab === 'historial') loadHistory(); }, [tab, loadHistory]);

  // ── Apertura ──────────────────────────────────────────────────────────────
  const handleOpen = async () => {
    if (!openBalance) return;
    setSaving(true);
    const { data: newReg, error } = await supabase.from('cash_registers')
      .insert({ opening_balance: parseFloat(openBalance), notes: openNote || null, created_by: 'Cajero' })
      .select('id').single();
    if (error || !newReg) { showToast('Error abriendo caja: ' + (error?.message ?? '')); }
    else { sessionStorage.setItem('active_register_id', newReg.id); showToast('Caja abierta correctamente'); setOpenBalance(''); setOpenNote(''); }
    setSaving(false);
    load();
  };

  // ── Cierre ────────────────────────────────────────────────────────────────
  const handleClose = async () => {
    if (!register || !closeBalance) return;
    setSaving(true);
    const { error } = await supabase.rpc('close_cash_register', {
      p_register_id: register.id,
      p_closing_balance: parseFloat(closeBalance),
      p_notes: closeNote || null,
    });
    if (error) { showToast('Error cerrando caja: ' + error.message); setSaving(false); return; }
    sessionStorage.removeItem('active_register_id');
    showToast('Caja cerrada correctamente');
    setCloseBalance(''); setCloseNote('');
    setSaving(false);
    // Recargar para obtener los datos del turno recién cerrado y disparar impresión
    const { data: closed } = await supabase.from('cash_registers').select('*').eq('id', register.id).single();
    if (closed) setPrintData({ reg: closed as CashRegister, sales: turnSales, movements });
    load();
  };

  // ── Movimiento manual ────────────────────────────────────────────────────
  const handleMovement = async () => {
    if (!register || !movForm.amount || !movForm.description) return;
    setSaving(true);
    const { error } = await supabase.from('cash_movements').insert({
      register_id: register.id, type: movForm.type,
      amount: parseFloat(movForm.amount), description: movForm.description,
    });
    if (error) { showToast('Error registrando movimiento'); }
    else { showToast('Movimiento registrado'); setMovForm({ type: 'income', amount: '', description: '' }); setShowMovForm(false); }
    setSaving(false);
    load();
  };

  // ── Imprimir informe ──────────────────────────────────────────────────────
  const printReport = (pd: typeof printData) => {
    if (!pd) return;
    setPrintData(pd);
    setTimeout(() => window.print(), 300);
  };

  // ── Toggle historial expandido ────────────────────────────────────────────
  const toggleExpand = (id: string) =>
    setHistory(h => h.map(r => r.id === id ? { ...r, expanded: !r.expanded } : r));

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  return (
    <>
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Apertura / Cierre de Caja</h2>
            <p className="text-sm text-gray-500">Control de turnos y flujo de dinero</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${register ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {register ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {register ? 'Caja abierta' : 'Caja cerrada'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit text-sm">
          {(['turno', 'historial'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-5 py-2 font-medium transition-colors ${tab === t ? 'bg-sky-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {t === 'turno' ? <DollarSign className="h-4 w-4" /> : <History className="h-4 w-4" />}
              {t === 'turno' ? 'Turno actual' : 'Historial'}
            </button>
          ))}
        </div>

        {/* ══════════ TAB TURNO ACTUAL ══════════ */}
        {tab === 'turno' && (
          <>
            {!register && (
              <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <Unlock className="h-5 w-5" />
                  <h3 className="font-semibold">Abrir turno de caja</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base inicial en efectivo</label>
                  <input type="number" min="0" value={openBalance} onChange={e => setOpenBalance(e.target.value)}
                    placeholder="Ej: 200000"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                  <input value={openNote} onChange={e => setOpenNote(e.target.value)} placeholder="Ej: Turno mañana, cajero..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <button onClick={handleOpen} disabled={saving || !openBalance}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Abrir caja
                </button>
              </div>
            )}

            {register && (
              <>
                {/* KPIs del turno */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Base inicial',    value: register.opening_balance, icon: DollarSign,     color: 'text-gray-600', bg: 'bg-gray-50' },
                    { label: 'Ventas efectivo', value: salesSummary.cash,        icon: DollarSign,     color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Ventas tarjeta',  value: salesSummary.card,        icon: CreditCard,     color: 'text-blue-600',  bg: 'bg-blue-50' },
                    { label: 'Transferencias',  value: salesSummary.transfer,    icon: ArrowLeftRight, color: 'text-purple-600', bg: 'bg-purple-50' },
                  ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-500">{label}</p>
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                          <Icon className={`h-4 w-4 ${color}`} />
                        </div>
                      </div>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(Number(value))}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Movimientos manuales */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800">Ingresos y egresos</h3>
                      <button onClick={() => setShowMovForm(v => !v)}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                        <Plus className="h-3.5 w-3.5" /> Registrar
                      </button>
                    </div>

                    {showMovForm && (
                      <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-3">
                        <div className="flex gap-2">
                          {(['income', 'expense'] as const).map(t => (
                            <button key={t} onClick={() => setMovForm(f => ({ ...f, type: t }))}
                              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${
                                movForm.type === t
                                  ? t === 'income' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                  : 'border border-gray-200 text-gray-600 hover:bg-white'}`}>
                              {t === 'income' ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                              {t === 'income' ? 'Ingreso' : 'Egreso'}
                            </button>
                          ))}
                        </div>
                        <input type="number" min="0" placeholder="Monto" value={movForm.amount}
                          onChange={e => setMovForm(f => ({ ...f, amount: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                        <input placeholder="Descripción (ej: pago proveedor)" value={movForm.description}
                          onChange={e => setMovForm(f => ({ ...f, description: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                        <div className="flex gap-2">
                          <button onClick={() => setShowMovForm(false)} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                          <button onClick={handleMovement} disabled={saving || !movForm.amount || !movForm.description}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-500 py-2 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-60">
                            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Guardar
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="divide-y divide-gray-100">
                      {movements.length === 0
                        ? <p className="py-8 text-center text-sm text-gray-400">Sin movimientos registrados</p>
                        : movements.map(m => (
                          <div key={m.id} className="flex items-center justify-between py-2.5">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{m.description}</p>
                              <p className="text-xs text-gray-400">{formatDateTime(m.created_at)}</p>
                            </div>
                            <span className={`text-sm font-semibold ${m.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                              {m.type === 'income' ? '+' : '-'}{formatCurrency(m.amount)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Cierre */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-red-600">
                      <Lock className="h-5 w-5" />
                      <h3 className="font-semibold">Cerrar turno</h3>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Apertura:</span>
                        <span className="font-medium">{formatDateTime(register.opened_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ventas ({turnSales.length}):</span>
                        <span className="font-medium text-green-600">{formatCurrency(salesSummary.total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Esperado en caja:</span>
                        <span className="font-semibold">{formatCurrency(Number(register.opening_balance) + salesSummary.cash)}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Efectivo contado físicamente</label>
                      <input type="number" min="0" placeholder="Ej: 350000" value={closeBalance}
                        onChange={e => setCloseBalance(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                      {closeBalance && (
                        <p className={`mt-1 text-xs font-medium ${parseFloat(closeBalance) >= Number(register.opening_balance) + salesSummary.cash ? 'text-green-600' : 'text-red-600'}`}>
                          Diferencia: {formatCurrency(parseFloat(closeBalance) - (Number(register.opening_balance) + salesSummary.cash))}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notas de cierre (opcional)</label>
                      <input value={closeNote} onChange={e => setCloseNote(e.target.value)} placeholder="Observaciones..."
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                    </div>
                    <button onClick={handleClose} disabled={saving || !closeBalance}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                      Cerrar caja e imprimir informe
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ══════════ TAB HISTORIAL ══════════ */}
        {tab === 'historial' && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {loadingHistory ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <History className="h-10 w-10 mb-2" />
                <p className="text-sm">No hay cierres de caja registrados</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {history.map(reg => {
                  const cashS     = reg.sales.filter(s => s.payment_method === 'cash').reduce((a, s) => a + Number(s.total), 0);
                  const cardS     = reg.sales.filter(s => s.payment_method === 'card').reduce((a, s) => a + Number(s.total), 0);
                  const transfS   = reg.sales.filter(s => s.payment_method === 'transfer').reduce((a, s) => a + Number(s.total), 0);
                  const totalS    = reg.sales.reduce((a, s) => a + Number(s.total), 0);
                  const totalExp  = reg.movements.filter(m => m.type === 'expense').reduce((a, m) => a + Number(m.amount), 0);
                  const totalInc  = reg.movements.filter(m => m.type === 'income').reduce((a, m) => a + Number(m.amount), 0);

                  return (
                    <div key={reg.id}>
                      {/* Fila resumen */}
                      <div className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleExpand(reg.id)}>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatDateTime(reg.opened_at)}
                            {reg.closed_at && <span className="text-gray-400 font-normal"> → {formatDateTime(reg.closed_at)}</span>}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                            <span>🛒 {reg.sales.length} ventas</span>
                            <span className="text-green-600 font-medium">Total: {formatCurrency(totalS)}</span>
                            {totalExp > 0 && <span className="text-red-500">Egresos: -{formatCurrency(totalExp)}</span>}
                            {reg.difference != null && (
                              <span className={Number(reg.difference) < 0 ? 'text-red-500' : 'text-green-600'}>
                                Diff: {formatCurrency(Number(reg.difference))}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={e => { e.stopPropagation(); printReport({ reg, sales: reg.sales, movements: reg.movements }); }}
                            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                          >
                            <Printer className="h-3.5 w-3.5" /> Imprimir
                          </button>
                          {reg.expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        </div>
                      </div>

                      {/* Detalle expandido */}
                      {reg.expanded && (
                        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-4">
                          {/* Resumen de métodos de pago */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { label: 'Base inicial', val: reg.opening_balance, color: 'text-gray-700' },
                              { label: 'Efectivo',     val: cashS,   color: 'text-green-700' },
                              { label: 'Tarjeta',      val: cardS,   color: 'text-blue-700' },
                              { label: 'Transferencia',val: transfS, color: 'text-purple-700' },
                            ].map(({ label, val, color }) => (
                              <div key={label} className="rounded-lg bg-white border border-gray-200 p-3">
                                <p className="text-xs text-gray-500 mb-1">{label}</p>
                                <p className={`text-sm font-bold ${color}`}>{formatCurrency(Number(val))}</p>
                              </div>
                            ))}
                          </div>

                          {/* Conciliación */}
                          <div className="rounded-lg bg-white border border-gray-200 p-3 text-sm space-y-1">
                            <p className="font-semibold text-gray-700 mb-2">Conciliación</p>
                            <div className="flex justify-between text-gray-600"><span>Esperado en caja</span><span>{formatCurrency(Number(reg.opening_balance) + cashS + totalInc - totalExp)}</span></div>
                            {reg.closing_balance != null && <div className="flex justify-between text-gray-600"><span>Contado físicamente</span><span>{formatCurrency(Number(reg.closing_balance))}</span></div>}
                            {reg.difference != null && (
                              <div className={`flex justify-between font-semibold ${Number(reg.difference) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                <span>Diferencia</span><span>{formatCurrency(Number(reg.difference))}</span>
                              </div>
                            )}
                          </div>

                          {/* Ventas */}
                          {reg.sales.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ventas del turno</p>
                              <div className="rounded-lg bg-white border border-gray-200 divide-y divide-gray-100 max-h-64 overflow-y-auto">
                                {reg.sales.map((s, idx) => (
                                  <div key={s.id} className="px-3 py-2">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <p className="text-xs font-medium text-gray-800">
                                          #{idx + 1} · {s.payment_method === 'cash' ? 'Efectivo' : s.payment_method === 'card' ? 'Tarjeta' : 'Transferencia'}
                                        </p>
                                        <p className="text-xs text-gray-400">{formatDateTime(s.created_at)}</p>
                                      </div>
                                      <span className="text-xs font-semibold text-gray-900">{formatCurrency(s.total)}</span>
                                    </div>
                                    {s.sale_items?.map((item, i) => (
                                      <p key={i} className="text-xs text-gray-500 pl-2">
                                        {item.product?.name ?? '—'} ×{item.quantity} — {formatCurrency(item.unit_price)}
                                      </p>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Movimientos */}
                          {reg.movements.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ingresos y egresos</p>
                              <div className="rounded-lg bg-white border border-gray-200 divide-y divide-gray-100">
                                {reg.movements.map(m => (
                                  <div key={m.id} className="flex justify-between items-center px-3 py-2">
                                    <div>
                                      <p className="text-xs font-medium text-gray-800">{m.description}</p>
                                      <p className="text-xs text-gray-400">{formatDateTime(m.created_at)}</p>
                                    </div>
                                    <span className={`text-xs font-semibold ${m.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                      {m.type === 'income' ? '+' : '-'}{formatCurrency(m.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-gray-900 px-5 py-3.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </AppShell>

    {/* ── Portal de impresión — montado directo en document.body, fuera del árbol de Next.js ── */}
    {printData && typeof window !== 'undefined' && createPortal(
      <>
        <style>{`
          @media print {
            body > *:not(#ccpr) { display: none !important; }
            #ccpr { display: block !important; }
            @page { size: 80mm auto; margin: 4mm; }
          }
          @media screen { #ccpr { display: none; } }
        `}</style>
        <div id="ccpr">
          <CashClosePrintRoot
            reg={printData.reg}
            sales={printData.sales}
            movements={printData.movements}
            settings={settings}
          />
        </div>
      </>,
      document.body
    )}
  </>
  );
}

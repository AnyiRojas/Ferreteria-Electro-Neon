'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, FileText,
  Plus, X, Download, AlertTriangle, CheckCircle,
  ChevronDown, ChevronUp, Loader2, Package,
  CreditCard, Calendar, Percent, Banknote,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import * as XLSX from 'xlsx';

// ─── Tipos locales ─────────────────────────────────────────────────────────────
type ExpenseCategory =
  | 'nomina' | 'arriendo' | 'servicios' | 'compras' | 'impuestos'
  | 'transporte' | 'publicidad' | 'mantenimiento' | 'otros';

interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  receipt_number: string | null;
  supplier: string | null;
  tax_base: number;
  iva: number;
  retefuente: number;
  reteica: number;
  created_at: string;
}

interface DebtPayment {
  id: string;
  debt_id: string;
  date: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

interface Debt {
  id: string;
  creditor: string;
  description: string;
  original_amount: number;
  interest_rate: number;        // % mensual, 0 si no aplica
  daily_payment: number;        // cuota diaria sugerida
  start_date: string;
  due_date: string | null;
  status: 'active' | 'paid';
  created_at: string;
  payments?: DebtPayment[];
  paid_amount?: number;         // calculado en cliente
}

interface StockProduct {
  id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  category?: { name: string } | null;
}

type Period = 'month' | 'quarter' | 'year';
type ActiveTab = 'resumen' | 'gastos' | 'pyl' | 'inventario' | 'deudas' | 'dian';

const PERIOD_LABELS: Record<Period, string> = {
  month: 'Este mes',
  quarter: 'Este trimestre',
  year: 'Este año',
};

const EXPENSE_CATEGORIES: Record<ExpenseCategory, string> = {
  nomina: 'Nómina',
  arriendo: 'Arriendo',
  servicios: 'Servicios públicos',
  compras: 'Compras / Inventario',
  impuestos: 'Impuestos y contribuciones',
  transporte: 'Transporte y logística',
  publicidad: 'Publicidad y marketing',
  mantenimiento: 'Mantenimiento',
  otros: 'Otros gastos',
};

const CAT_COLORS: Record<ExpenseCategory, string> = {
  nomina: 'bg-blue-100 text-blue-700',
  arriendo: 'bg-purple-100 text-purple-700',
  servicios: 'bg-yellow-100 text-yellow-700',
  compras: 'bg-green-100 text-green-700',
  impuestos: 'bg-red-100 text-red-700',
  transporte: 'bg-orange-100 text-orange-700',
  publicidad: 'bg-pink-100 text-pink-700',
  mantenimiento: 'bg-gray-100 text-gray-700',
  otros: 'bg-slate-100 text-slate-700',
};

function getPeriodRange(period: Period): { from: Date; to: Date } {
  const now = new Date();
  if (period === 'month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }
  if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    return {
      from: new Date(now.getFullYear(), q * 3, 1),
      to: new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59),
    };
  }
  return {
    from: new Date(now.getFullYear(), 0, 1),
    to: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
  };
}

const EMPTY_EXPENSE = {
  date: new Date().toISOString().split('T')[0],
  category: 'otros' as ExpenseCategory,
  description: '',
  amount: '',
  receipt_number: '',
  supplier: '',
  tax_base: '',
  iva: '',
  retefuente: '',
  reteica: '',
};

const EMPTY_DEBT = {
  creditor: '',
  description: '',
  original_amount: '',
  interest_rate: '',
  daily_payment: '',
  start_date: new Date().toISOString().split('T')[0],
  due_date: '',
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AccountingPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [activeTab, setActiveTab] = useState<ActiveTab>('resumen');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // ── Gastos ──────────────────────────────────────────────────────────────────
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ ...EMPTY_EXPENSE });
  const [savingExpense, setSavingExpense] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // ── Ventas del período ──────────────────────────────────────────────────────
  const [salesSummary, setSalesSummary] = useState({
    revenue: 0, cost: 0, discount: 0, salesCount: 0,
    byCash: 0, byCard: 0, byTransfer: 0,
  });

  // ── Inventario ──────────────────────────────────────────────────────────────
  const [stockProducts, setStockProducts] = useState<StockProduct[]>([]);
  const [stockSearch, setStockSearch] = useState('');

  // ── Deudas ──────────────────────────────────────────────────────────────────
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [debtForm, setDebtForm] = useState({ ...EMPTY_DEBT });
  const [savingDebt, setSavingDebt] = useState(false);
  const [expandedDebt, setExpandedDebt] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null); // debt id
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingPayment, setSavingPayment] = useState(false);
  const [debtFilter, setDebtFilter] = useState<'active' | 'all'>('active');

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Carga datos ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = getPeriodRange(period);

    // Gastos del período
    const { data: expData } = await supabase
      .from('expenses')
      .select('*')
      .gte('date', from.toISOString().split('T')[0])
      .lte('date', to.toISOString().split('T')[0])
      .order('date', { ascending: false });
    setExpenses((expData ?? []) as Expense[]);

    // Ventas del período
    const { data: salesData } = await supabase
      .from('sales')
      .select('id, total, discount, payment_method, sale_items(quantity, unit_price, subtotal, product:products(cost))')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString());

    if (salesData) {
      let revenue = 0, cost = 0, discount = 0, byCash = 0, byCard = 0, byTransfer = 0;
      salesData.forEach((s: any) => {
        revenue += Number(s.total);
        discount += Number(s.discount ?? 0);
        if (s.payment_method === 'cash') byCash += Number(s.total);
        else if (s.payment_method === 'card') byCard += Number(s.total);
        else byTransfer += Number(s.total);
        (s.sale_items ?? []).forEach((item: any) => {
          cost += (item.product?.cost ?? 0) * item.quantity;
        });
      });
      setSalesSummary({ revenue, cost, discount, salesCount: salesData.length, byCash, byCard, byTransfer });
    }

    // Inventario (todos los activos)
    const { data: prodData } = await supabase
      .from('products')
      .select('id, name, price, cost, stock, min_stock, category:categories(name)')
      .eq('active', true)
      .order('name');
    setStockProducts((prodData ?? []) as unknown as StockProduct[]);

    // Deudas
    const { data: debtData } = await supabase
      .from('debts')
      .select('*, payments:debt_payments(*)')
      .order('created_at', { ascending: false });

    if (debtData) {
      const enriched = (debtData as any[]).map(d => ({
        ...d,
        paid_amount: (d.payments ?? []).reduce((s: number, p: DebtPayment) => s + Number(p.amount), 0),
      })) as Debt[];
      setDebts(enriched);
    }

    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // ── Guardar gasto ─────────────────────────────────────────────────────────────
  const handleSaveExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount || !expenseForm.date) {
      showToast('Completa los campos obligatorios', 'err'); return;
    }
    setSavingExpense(true);
    const { error } = await supabase.from('expenses').insert({
      date: expenseForm.date,
      category: expenseForm.category,
      description: expenseForm.description.trim(),
      amount: Number(expenseForm.amount),
      receipt_number: expenseForm.receipt_number || null,
      supplier: expenseForm.supplier || null,
      tax_base: Number(expenseForm.tax_base) || 0,
      iva: Number(expenseForm.iva) || 0,
      retefuente: Number(expenseForm.retefuente) || 0,
      reteica: Number(expenseForm.reteica) || 0,
    });
    setSavingExpense(false);
    if (error) { showToast('Error: ' + error.message, 'err'); return; }
    showToast('Gasto registrado');
    setShowExpenseForm(false);
    setExpenseForm({ ...EMPTY_EXPENSE });
    load();
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    load();
  };

  // ── Guardar deuda ─────────────────────────────────────────────────────────────
  const handleSaveDebt = async () => {
    if (!debtForm.creditor || !debtForm.original_amount) {
      showToast('Acreedor y monto son obligatorios', 'err'); return;
    }
    setSavingDebt(true);
    const { error } = await supabase.from('debts').insert({
      creditor: debtForm.creditor.trim(),
      description: debtForm.description.trim() || null,
      original_amount: Number(debtForm.original_amount),
      interest_rate: Number(debtForm.interest_rate) || 0,
      daily_payment: Number(debtForm.daily_payment) || 0,
      start_date: debtForm.start_date,
      due_date: debtForm.due_date || null,
      status: 'active',
    });
    setSavingDebt(false);
    if (error) { showToast('Error: ' + error.message, 'err'); return; }
    showToast('Deuda registrada');
    setShowDebtForm(false);
    setDebtForm({ ...EMPTY_DEBT });
    load();
  };

  const handleMarkDebtPaid = async (id: string) => {
    if (!confirm('¿Marcar esta deuda como pagada en su totalidad?')) return;
    await supabase.from('debts').update({ status: 'paid' }).eq('id', id);
    load();
  };

  const handleDeleteDebt = async (id: string) => {
    if (!confirm('¿Eliminar esta deuda? Se eliminarán también todos sus pagos.')) return;
    await supabase.from('debt_payments').delete().eq('debt_id', id);
    await supabase.from('debts').delete().eq('id', id);
    load();
  };

  // ── Registrar pago/abono a deuda ───────────────────────────────────────────
  const handleSavePayment = async (debtId: string) => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      showToast('Ingresa un monto válido', 'err'); return;
    }
    setSavingPayment(true);
    const { error } = await supabase.from('debt_payments').insert({
      debt_id: debtId,
      date: paymentDate,
      amount: Number(paymentAmount),
      notes: paymentNotes.trim() || null,
    });
    setSavingPayment(false);
    if (error) { showToast('Error: ' + error.message, 'err'); return; }
    showToast('Abono registrado');
    setShowPaymentForm(null);
    setPaymentAmount('');
    setPaymentNotes('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    load();
  };

  // ── Exportar Excel ────────────────────────────────────────────────────────────
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const { from, to } = getPeriodRange(period);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const grossProfit = salesSummary.revenue - salesSummary.cost;
    const netProfit = grossProfit - totalExpenses;
    const totalIva = expenses.reduce((s, e) => s + e.iva, 0);
    const totalRetefuente = expenses.reduce((s, e) => s + e.retefuente, 0);
    const totalReteica = expenses.reduce((s, e) => s + e.reteica, 0);

    // P&L
    const resumen = [
      ['INFORME CONTABLE — FERRETERÍA'],
      ['Período:', PERIOD_LABELS[period]],
      ['Desde:', from.toLocaleDateString('es-CO')],
      ['Hasta:', to.toLocaleDateString('es-CO')],
      ['Generado:', new Date().toLocaleString('es-CO')],
      [],
      ['INGRESOS'],
      ['Ventas brutas', salesSummary.revenue],
      ['(-) Descuentos', -salesSummary.discount],
      ['Ventas netas', salesSummary.revenue - salesSummary.discount],
      [],
      ['COSTO DE VENTAS', salesSummary.cost],
      ['UTILIDAD BRUTA', grossProfit],
      [],
      ['GASTOS OPERACIONALES'],
      ...Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => {
        const t = expenses.filter(e => e.category === k).reduce((s, e) => s + e.amount, 0);
        return t > 0 ? [v, t] : null;
      }).filter(Boolean) as [string, number][],
      ['Total gastos', totalExpenses],
      ['UTILIDAD NETA', netProfit],
      [],
      ['OBLIGACIONES TRIBUTARIAS'],
      ['IVA en gastos', totalIva],
      ['Retefuente', totalRetefuente],
      ['ReteICA', totalReteica],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'P&L');

    if (expenses.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenses.map(e => ({
        'Fecha': e.date, 'Categoría': EXPENSE_CATEGORIES[e.category] ?? e.category,
        'Descripción': e.description, 'Proveedor': e.supplier ?? '',
        'N° Soporte': e.receipt_number ?? '', 'Base gravable': e.tax_base,
        'IVA': e.iva, 'Retefuente': e.retefuente, 'ReteICA': e.reteica, 'Total': e.amount,
      }))), 'Gastos');
    }

    // Inventario
    if (stockProducts.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stockProducts.map(p => ({
        'Producto': p.name, 'Categoría': (p.category as any)?.name ?? '',
        'Stock': p.stock, 'Mín. stock': p.min_stock,
        'Costo unit.': p.cost, 'Precio unit.': p.price,
        'Valor costo total': p.cost * p.stock,
        'Valor venta total': p.price * p.stock,
        'Estado': p.stock === 0 ? 'Agotado' : p.stock <= p.min_stock ? 'Stock bajo' : 'OK',
      }))), 'Inventario');
    }

    // Deudas
    if (debts.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(debts.map(d => ({
        'Acreedor': d.creditor, 'Descripción': d.description,
        'Monto original': d.original_amount,
        'Abonado': d.paid_amount ?? 0,
        'Saldo pendiente': Math.max(0, d.original_amount - (d.paid_amount ?? 0)),
        'Cuota diaria': d.daily_payment,
        'Interés mensual %': d.interest_rate,
        'Inicio': d.start_date, 'Vencimiento': d.due_date ?? '',
        'Estado': d.status === 'paid' ? 'Pagada' : 'Activa',
      }))), 'Deudas');
    }

    XLSX.writeFile(wb, `contabilidad_${period}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ── Valores derivados ──────────────────────────────────────────────────────
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const grossProfit = salesSummary.revenue - salesSummary.cost;
  const netProfit = grossProfit - totalExpenses;
  const margin = salesSummary.revenue > 0 ? (netProfit / salesSummary.revenue) * 100 : 0;
  const totalIva = expenses.reduce((s, e) => s + e.iva, 0);
  const totalRetefuente = expenses.reduce((s, e) => s + e.retefuente, 0);
  const totalReteica = expenses.reduce((s, e) => s + e.reteica, 0);

  const byCategory = Object.entries(EXPENSE_CATEGORIES).map(([k, label]) => ({
    key: k as ExpenseCategory, label,
    total: expenses.filter(e => e.category === k).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  // Inventario derivados
  const stockFiltered = stockSearch.trim()
    ? stockProducts.filter(p => p.name.toLowerCase().includes(stockSearch.toLowerCase()))
    : stockProducts;
  const totalStockCost = stockProducts.reduce((s, p) => s + p.cost * p.stock, 0);
  const totalStockPrice = stockProducts.reduce((s, p) => s + p.price * p.stock, 0);
  const criticalProducts = stockProducts.filter(p => p.stock === 0 || p.stock <= p.min_stock);
  const outOfStock = stockProducts.filter(p => p.stock === 0).length;

  // Deudas derivados
  const activeDebts = debts.filter(d => d.status === 'active');
  const totalDebt = activeDebts.reduce((s, d) => s + d.original_amount - (d.paid_amount ?? 0), 0);
  const totalDailyRequired = activeDebts.reduce((s, d) => s + d.daily_payment, 0);
  const filteredDebts = debtFilter === 'active' ? activeDebts : debts;

  const TABS: { id: ActiveTab; label: string }[] = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'gastos', label: 'Gastos' },
    { id: 'pyl', label: 'P&L' },
    { id: 'inventario', label: 'Inventario' },
    { id: 'deudas', label: 'Deudas' },
    { id: 'dian', label: 'DIAN' },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Contabilidad e Informes</h2>
            <p className="text-sm text-gray-500">Control de gastos, inventario, deudas y obligaciones DIAN</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-2 font-medium transition-colors ${period === p ? 'bg-sky-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
            <button onClick={exportExcel}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Download className="h-4 w-4 text-green-600" />
              Exportar Excel
            </button>
            {activeTab === 'gastos' && (
              <button onClick={() => setShowExpenseForm(true)}
                className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-white hover:bg-sky-600">
                <Plus className="h-4 w-4" /> Nuevo gasto
              </button>
            )}
            {activeTab === 'deudas' && (
              <button onClick={() => setShowDebtForm(true)}
                className="flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-600">
                <Plus className="h-4 w-4" /> Nueva deuda
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
          {TABS.map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* ══════ RESUMEN ══════ */}
            {activeTab === 'resumen' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Ingresos', value: formatCurrency(salesSummary.revenue), Icon: TrendingUp, color: 'text-sky-500', bg: 'bg-sky-50' },
                    { label: 'Gastos totales', value: formatCurrency(totalExpenses), Icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
                    { label: 'Utilidad neta', value: formatCurrency(netProfit), Icon: DollarSign, color: netProfit >= 0 ? 'text-green-500' : 'text-red-500', bg: netProfit >= 0 ? 'bg-green-50' : 'bg-red-50' },
                    { label: 'Margen neto', value: margin.toFixed(1) + '%', Icon: FileText, color: 'text-purple-500', bg: 'bg-purple-50' },
                  ].map(({ label, value, Icon, color, bg }) => (
                    <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-gray-500">{label}</p>
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
                          <Icon className={`h-5 w-5 ${color}`} />
                        </div>
                      </div>
                      <p className={`text-2xl font-bold ${netProfit < 0 && label === 'Utilidad neta' ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Alertas rápidas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-amber-500" />
                      <p className="text-sm font-semibold text-amber-800">Inventario crítico</p>
                    </div>
                    <p className="text-2xl font-bold text-amber-700">{criticalProducts.length}</p>
                    <p className="text-xs text-amber-600 mt-0.5">{outOfStock} agotados · {criticalProducts.length - outOfStock} bajo mínimo</p>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-4 w-4 text-rose-500" />
                      <p className="text-sm font-semibold text-rose-800">Deuda activa total</p>
                    </div>
                    <p className="text-2xl font-bold text-rose-700">{formatCurrency(totalDebt)}</p>
                    <p className="text-xs text-rose-600 mt-0.5">{activeDebts.length} obligación{activeDebts.length !== 1 ? 'es' : ''} activa{activeDebts.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Banknote className="h-4 w-4 text-blue-500" />
                      <p className="text-sm font-semibold text-blue-800">Cuota diaria requerida</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalDailyRequired)}</p>
                    <p className="text-xs text-blue-600 mt-0.5">Suma de cuotas diarias de todas las deudas</p>
                  </div>
                </div>

                {byCategory.length > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Gastos por categoría</h3>
                    <div className="space-y-3">
                      {byCategory.map(cat => (
                        <div key={cat.key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CAT_COLORS[cat.key]}`}>{cat.label}</span>
                            <span className="text-sm font-semibold text-gray-900">{formatCurrency(cat.total)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100">
                            <div className="h-2 rounded-full bg-sky-400" style={{ width: `${totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Ingresos por medio de pago</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Efectivo', value: salesSummary.byCash },
                      { label: 'Tarjeta', value: salesSummary.byCard },
                      { label: 'Transferencia', value: salesSummary.byTransfer },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center rounded-xl bg-gray-50 p-4">
                        <p className="text-xs text-gray-500 mb-1">{label}</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(value)}</p>
                        <p className="text-xs text-gray-400">{salesSummary.revenue > 0 ? ((value / salesSummary.revenue) * 100).toFixed(1) + '%' : '0%'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══════ GASTOS ══════ */}
            {activeTab === 'gastos' && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Registro de gastos</h3>
                  <span className="text-sm text-gray-500">{expenses.length} registros · <strong>{formatCurrency(totalExpenses)}</strong></span>
                </div>
                {expenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <TrendingDown className="h-10 w-10 mb-2" />
                    <p className="text-sm">No hay gastos registrados en este período</p>
                    <button onClick={() => setShowExpenseForm(true)} className="mt-4 text-sm font-medium text-sky-500 hover:underline">+ Registrar primer gasto</button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {expenses.map(exp => (
                      <div key={exp.id}>
                        <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => setExpandedRows(prev => { const n = new Set(prev); n.has(exp.id) ? n.delete(exp.id) : n.add(exp.id); return n; })}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CAT_COLORS[exp.category]}`}>{EXPENSE_CATEGORIES[exp.category]}</span>
                              <p className="text-sm font-medium text-gray-800 truncate">{exp.description}</p>
                              {exp.supplier && <span className="text-xs text-gray-400">· {exp.supplier}</span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{exp.date}{exp.receipt_number && ` · Soporte: ${exp.receipt_number}`}</p>
                          </div>
                          <p className="text-sm font-bold text-gray-900 shrink-0">{formatCurrency(exp.amount)}</p>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteExpense(exp.id); }}
                            className="shrink-0 rounded-md p-1 text-gray-300 hover:text-red-500 hover:bg-red-50">
                            <X className="h-4 w-4" />
                          </button>
                          {expandedRows.has(exp.id) ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
                        </div>
                        {expandedRows.has(exp.id) && (
                          <div className="px-5 pb-3 bg-gray-50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div><p className="text-gray-400">Base gravable</p><p className="font-semibold">{formatCurrency(exp.tax_base)}</p></div>
                            <div><p className="text-gray-400">IVA</p><p className="font-semibold">{formatCurrency(exp.iva)}</p></div>
                            <div><p className="text-gray-400">Retefuente</p><p className="font-semibold">{formatCurrency(exp.retefuente)}</p></div>
                            <div><p className="text-gray-400">ReteICA</p><p className="font-semibold">{formatCurrency(exp.reteica)}</p></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══════ P&L ══════ */}
            {activeTab === 'pyl' && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Estado de Pérdidas y Ganancias</h3>
                  <span className="text-xs text-gray-400">{PERIOD_LABELS[period]}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-2 mb-1">Ingresos</p>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-600">Ventas brutas</span><span className="font-medium">{formatCurrency(salesSummary.revenue)}</span>
                  </div>
                  {salesSummary.discount > 0 && (
                    <div className="flex justify-between py-1.5 border-b border-gray-100 text-red-500">
                      <span>(-) Descuentos</span><span>-{formatCurrency(salesSummary.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 font-semibold">
                    <span className="text-gray-800">Ventas netas</span><span>{formatCurrency(salesSummary.revenue - salesSummary.discount)}</span>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-4 mb-1">Costo de ventas</p>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-600">Costo mercancía vendida</span><span className="font-medium text-red-600">-{formatCurrency(salesSummary.cost)}</span>
                  </div>
                  <div className="flex justify-between py-2.5 rounded-lg bg-gray-50 px-3 font-bold text-base mt-2">
                    <span>Utilidad bruta</span><span className={grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(grossProfit)}</span>
                  </div>
                  {byCategory.length > 0 && (
                    <>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-4 mb-1">Gastos operacionales</p>
                      {byCategory.map(cat => (
                        <div key={cat.key} className="flex justify-between py-1.5 border-b border-gray-100">
                          <span className="text-gray-600">{cat.label}</span><span className="font-medium text-red-600">-{formatCurrency(cat.total)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-1.5 font-semibold">
                        <span className="text-gray-700">Total gastos</span><span className="text-red-600">-{formatCurrency(totalExpenses)}</span>
                      </div>
                    </>
                  )}
                  {activeDebts.length > 0 && (
                    <>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-4 mb-1">Obligaciones financieras (cuotas diarias × días del período)</p>
                      {activeDebts.map(d => {
                        const { from, to } = getPeriodRange(period);
                        const days = Math.round((to.getTime() - from.getTime()) / 86400000);
                        const periodPayment = d.daily_payment * days;
                        return (
                          <div key={d.id} className="flex justify-between py-1.5 border-b border-gray-100">
                            <span className="text-gray-600">{d.creditor} ({d.daily_payment > 0 ? `${formatCurrency(d.daily_payment)}/día` : 'sin cuota'})</span>
                            <span className="font-medium text-rose-600">{periodPayment > 0 ? `-${formatCurrency(periodPayment)}` : '—'}</span>
                          </div>
                        );
                      })}
                    </>
                  )}
                  <div className={`flex justify-between py-3 rounded-xl px-3 font-bold text-lg mt-3 ${netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span>Utilidad neta</span><span className={netProfit >= 0 ? 'text-green-700' : 'text-red-700'}>{formatCurrency(netProfit)}</span>
                  </div>
                  <p className="text-xs text-gray-400 text-right pt-1">Margen neto: {margin.toFixed(2)}%</p>
                </div>
              </div>
            )}

            {/* ══════ INVENTARIO ══════ */}
            {activeTab === 'inventario' && (
              <div className="space-y-5">
                {/* KPIs de inventario */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Valor al costo', value: formatCurrency(totalStockCost), sub: 'Lo invertido en stock', color: 'text-blue-500', bg: 'bg-blue-50', Icon: Package },
                    { label: 'Valor al precio de venta', value: formatCurrency(totalStockPrice), sub: 'Potencial de ingreso', color: 'text-green-500', bg: 'bg-green-50', Icon: TrendingUp },
                    { label: 'Margen potencial', value: formatCurrency(totalStockPrice - totalStockCost), sub: 'Ganancia si se vende todo', color: 'text-purple-500', bg: 'bg-purple-50', Icon: Percent },
                    { label: 'Productos críticos', value: criticalProducts.length.toString(), sub: `${outOfStock} agotados`, color: 'text-red-500', bg: 'bg-red-50', Icon: AlertTriangle },
                  ].map(({ label, value, sub, color, bg, Icon }) => (
                    <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-500">{label}</p>
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                          <Icon className={`h-4 w-4 ${color}`} />
                        </div>
                      </div>
                      <p className="text-xl font-bold text-gray-900">{value}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Alertas de stock crítico */}
                {criticalProducts.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <p className="text-sm font-semibold text-amber-800">Productos que requieren reabastecimiento ({criticalProducts.length})</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {criticalProducts.slice(0, 9).map(p => (
                        <div key={p.id} className="flex items-center justify-between rounded-lg bg-white border border-amber-100 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{p.name}</p>
                            <p className="text-xs text-gray-400">{(p.category as any)?.name ?? ''}</p>
                          </div>
                          <span className={`shrink-0 ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${p.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {p.stock === 0 ? 'Agotado' : `${p.stock} und`}
                          </span>
                        </div>
                      ))}
                      {criticalProducts.length > 9 && (
                        <p className="text-xs text-amber-600 col-span-full">+ {criticalProducts.length - 9} productos más...</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Tabla completa de inventario */}
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="font-semibold text-gray-900">Todos los productos ({stockProducts.length})</h3>
                    <input
                      value={stockSearch}
                      onChange={e => setStockSearch(e.target.value)}
                      placeholder="Buscar producto…"
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 w-48"
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
                          <th className="px-5 py-3 font-medium">Producto</th>
                          <th className="px-5 py-3 font-medium">Categoría</th>
                          <th className="px-5 py-3 font-medium text-right">Stock</th>
                          <th className="px-5 py-3 font-medium text-right">Mín.</th>
                          <th className="px-5 py-3 font-medium text-right">Costo unit.</th>
                          <th className="px-5 py-3 font-medium text-right">Precio unit.</th>
                          <th className="px-5 py-3 font-medium text-right">Valor stock (costo)</th>
                          <th className="px-5 py-3 font-medium text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stockFiltered.map(p => {
                          const status = p.stock === 0 ? 'agotado' : p.stock <= p.min_stock ? 'bajo' : 'ok';
                          return (
                            <tr key={p.id} className={`hover:bg-gray-50 ${status === 'agotado' ? 'bg-red-50/30' : status === 'bajo' ? 'bg-amber-50/30' : ''}`}>
                              <td className="px-5 py-2.5 font-medium text-gray-800">{p.name}</td>
                              <td className="px-5 py-2.5 text-gray-500">{(p.category as any)?.name ?? '—'}</td>
                              <td className="px-5 py-2.5 text-right font-semibold text-gray-900">{p.stock}</td>
                              <td className="px-5 py-2.5 text-right text-gray-400">{p.min_stock}</td>
                              <td className="px-5 py-2.5 text-right text-gray-600">{formatCurrency(p.cost)}</td>
                              <td className="px-5 py-2.5 text-right text-gray-600">{formatCurrency(p.price)}</td>
                              <td className="px-5 py-2.5 text-right font-medium text-gray-900">{formatCurrency(p.cost * p.stock)}</td>
                              <td className="px-5 py-2.5 text-right">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${status === 'agotado' ? 'bg-red-100 text-red-700' : status === 'bajo' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                  {status === 'agotado' ? 'Agotado' : status === 'bajo' ? 'Stock bajo' : 'OK'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 font-semibold bg-gray-50">
                          <td colSpan={6} className="px-5 py-3 text-gray-700">Total</td>
                          <td className="px-5 py-3 text-right text-sky-700">{formatCurrency(stockFiltered.reduce((s, p) => s + p.cost * p.stock, 0))}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══════ DEUDAS ══════ */}
            {activeTab === 'deudas' && (
              <div className="space-y-5">
                {/* KPIs deudas */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-rose-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-500">Deuda total activa</p>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
                        <CreditCard className="h-4 w-4 text-rose-500" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-rose-700">{formatCurrency(totalDebt)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{activeDebts.length} obligación{activeDebts.length !== 1 ? 'es' : ''}</p>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-500">Cuota diaria total</p>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                        <Calendar className="h-4 w-4 text-blue-500" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalDailyRequired)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Debes apartar esta cantidad cada día</p>
                  </div>
                  <div className="rounded-xl border border-purple-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-500">Total abonado (todas)</p>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
                        <CheckCircle className="h-4 w-4 text-purple-500" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-purple-700">{formatCurrency(debts.reduce((s, d) => s + (d.paid_amount ?? 0), 0))}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{debts.filter(d => d.status === 'paid').length} deuda{debts.filter(d => d.status === 'paid').length !== 1 ? 's' : ''} saldada{debts.filter(d => d.status === 'paid').length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Alerta cuota diaria vs utilidad */}
                {totalDailyRequired > 0 && salesSummary.revenue > 0 && (
                  <div className={`flex items-start gap-3 rounded-xl border p-4 ${netProfit / 30 >= totalDailyRequired ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                    {netProfit / 30 >= totalDailyRequired
                      ? <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      : <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                    }
                    <div>
                      <p className={`text-sm font-semibold ${netProfit / 30 >= totalDailyRequired ? 'text-green-800' : 'text-amber-800'}`}>
                        {netProfit / 30 >= totalDailyRequired
                          ? 'La utilidad cubre las cuotas diarias ✓'
                          : 'Atención: la utilidad del período puede no cubrir las cuotas diarias'}
                      </p>
                      <p className={`text-xs mt-0.5 ${netProfit / 30 >= totalDailyRequired ? 'text-green-700' : 'text-amber-700'}`}>
                        Utilidad diaria estimada: <strong>{formatCurrency(Math.round(netProfit / 30))}</strong> · Cuota diaria requerida: <strong>{formatCurrency(totalDailyRequired)}</strong>
                      </p>
                    </div>
                  </div>
                )}

                {/* Filtro activas / todas */}
                <div className="flex items-center gap-2">
                  <button onClick={() => setDebtFilter('active')}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${debtFilter === 'active' ? 'bg-rose-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-rose-300'}`}>
                    Solo activas ({activeDebts.length})
                  </button>
                  <button onClick={() => setDebtFilter('all')}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${debtFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                    Todas ({debts.length})
                  </button>
                </div>

                {/* Lista de deudas */}
                {filteredDebts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <CreditCard className="h-10 w-10 mb-2" />
                    <p className="text-sm">No hay deudas registradas</p>
                    <button onClick={() => setShowDebtForm(true)} className="mt-4 text-sm font-medium text-rose-500 hover:underline">+ Registrar primera deuda</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredDebts.map(debt => {
                      const paid = debt.paid_amount ?? 0;
                      const remaining = Math.max(0, debt.original_amount - paid);
                      const pct = debt.original_amount > 0 ? (paid / debt.original_amount) * 100 : 0;
                      const daysLeft = debt.daily_payment > 0 ? Math.ceil(remaining / debt.daily_payment) : null;
                      const isExpanded = expandedDebt === debt.id;

                      return (
                        <div key={debt.id} className={`rounded-xl border bg-white shadow-sm overflow-hidden ${debt.status === 'paid' ? 'border-green-200 opacity-70' : 'border-gray-200'}`}>
                          {/* Cabecera de la deuda */}
                          <div className="flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50"
                            onClick={() => setExpandedDebt(isExpanded ? null : debt.id)}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-gray-900">{debt.creditor}</p>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${debt.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                                  {debt.status === 'paid' ? 'Saldada' : 'Activa'}
                                </span>
                                {debt.interest_rate > 0 && (
                                  <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
                                    {debt.interest_rate}% mensual
                                  </span>
                                )}
                              </div>
                              {debt.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{debt.description}</p>}

                              {/* Barra de progreso */}
                              <div className="mt-2">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>Abonado: <strong className="text-green-600">{formatCurrency(paid)}</strong></span>
                                  <span>Pendiente: <strong className="text-rose-600">{formatCurrency(remaining)}</strong></span>
                                </div>
                                <div className="h-2 rounded-full bg-gray-100">
                                  <div className="h-2 rounded-full bg-green-400 transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">{pct.toFixed(1)}% pagado de {formatCurrency(debt.original_amount)}</p>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              {debt.daily_payment > 0 && (
                                <p className="text-xs font-semibold text-blue-600">{formatCurrency(debt.daily_payment)}/día</p>
                              )}
                              {daysLeft !== null && debt.status === 'active' && (
                                <p className="text-xs text-gray-400">~{daysLeft} días restantes</p>
                              )}
                              {debt.due_date && <p className="text-xs text-gray-400">Vence: {debt.due_date}</p>}
                            </div>

                            {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 mt-1" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 mt-1" />}
                          </div>

                          {/* Detalle expandido */}
                          {isExpanded && (
                            <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-4">
                              {/* Acciones */}
                              <div className="flex gap-2 flex-wrap">
                                {debt.status === 'active' && (
                                  <button onClick={() => { setShowPaymentForm(debt.id); setPaymentAmount(''); setPaymentNotes(''); setPaymentDate(new Date().toISOString().split('T')[0]); }}
                                    className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-600">
                                    <Plus className="h-3 w-3" /> Registrar abono
                                  </button>
                                )}
                                {debt.status === 'active' && (
                                  <button onClick={() => handleMarkDebtPaid(debt.id)}
                                    className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-600">
                                    <CheckCircle className="h-3 w-3" /> Marcar como saldada
                                  </button>
                                )}
                                <button onClick={() => handleDeleteDebt(debt.id)}
                                  className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50">
                                  <X className="h-3 w-3" /> Eliminar
                                </button>
                              </div>

                              {/* Formulario de abono inline */}
                              {showPaymentForm === debt.id && (
                                <div className="rounded-xl border border-sky-200 bg-white p-4 space-y-3">
                                  <p className="text-sm font-semibold text-gray-800">Registrar abono</p>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                                      <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Monto *</label>
                                      <input type="number" min="1" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
                                    <input value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)}
                                      placeholder="Cuota semanal, transferencia…"
                                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => setShowPaymentForm(null)}
                                      className="flex-1 rounded-lg border border-gray-300 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                                      Cancelar
                                    </button>
                                    <button onClick={() => handleSavePayment(debt.id)} disabled={savingPayment}
                                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-500 py-1.5 text-xs font-bold text-white hover:bg-sky-600 disabled:opacity-60">
                                      {savingPayment && <Loader2 className="h-3 w-3 animate-spin" />}
                                      Guardar abono
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Historial de pagos */}
                              {(debt.payments ?? []).length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Historial de abonos</p>
                                  <div className="space-y-1.5">
                                    {([...(debt.payments ?? [])].sort((a, b) => b.date.localeCompare(a.date))).map(p => (
                                      <div key={p.id} className="flex items-center justify-between rounded-lg bg-white border border-gray-100 px-3 py-2 text-xs">
                                        <div>
                                          <span className="font-medium text-gray-700">{p.date}</span>
                                          {p.notes && <span className="text-gray-400 ml-2">· {p.notes}</span>}
                                        </div>
                                        <span className="font-bold text-green-600">+{formatCurrency(Number(p.amount))}</span>
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

            {/* ══════ DIAN ══════ */}
            {activeTab === 'dian' && (
              <div className="space-y-5">
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Información para auditoría DIAN</p>
                    <p className="text-xs text-amber-700 mt-0.5">Consolida los valores para tu declaración. Asegúrate de cargar todos los soportes antes del vencimiento.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'IVA en compras / gastos', value: totalIva, note: 'IVA descontable', ok: true },
                    { label: 'Retefuente practicada', value: totalRetefuente, note: 'A favor del estado', ok: false },
                    { label: 'ReteICA', value: totalReteica, note: 'Impuesto industria y comercio', ok: false },
                    { label: 'Total obligaciones', value: totalIva + totalRetefuente + totalReteica, note: 'Suma retenciones + IVA', ok: false },
                  ].map(({ label, value, note, ok }) => (
                    <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        {ok ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                        <p className="text-xs text-gray-500 leading-tight">{label}</p>
                      </div>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(value)}</p>
                      <p className="text-xs text-gray-400 mt-1">{note}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Soportes con retenciones</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Solo registros con alguna retención o IVA</p>
                  </div>
                  {expenses.filter(e => e.iva > 0 || e.retefuente > 0 || e.reteica > 0).length === 0 ? (
                    <p className="py-10 text-center text-sm text-gray-400">No hay gastos con retenciones en este período</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
                            <th className="px-5 py-3 font-medium">Fecha</th>
                            <th className="px-5 py-3 font-medium">Descripción / Proveedor</th>
                            <th className="px-5 py-3 font-medium">N° Soporte</th>
                            <th className="px-5 py-3 font-medium text-right">Base</th>
                            <th className="px-5 py-3 font-medium text-right">IVA</th>
                            <th className="px-5 py-3 font-medium text-right">Retefuente</th>
                            <th className="px-5 py-3 font-medium text-right">ReteICA</th>
                            <th className="px-5 py-3 font-medium text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {expenses.filter(e => e.iva > 0 || e.retefuente > 0 || e.reteica > 0).map(e => (
                            <tr key={e.id} className="hover:bg-gray-50">
                              <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{e.date}</td>
                              <td className="px-5 py-3"><p className="font-medium text-gray-800">{e.description}</p>{e.supplier && <p className="text-xs text-gray-400">{e.supplier}</p>}</td>
                              <td className="px-5 py-3 text-gray-500">{e.receipt_number ?? '—'}</td>
                              <td className="px-5 py-3 text-right">{formatCurrency(e.tax_base)}</td>
                              <td className="px-5 py-3 text-right text-blue-600">{formatCurrency(e.iva)}</td>
                              <td className="px-5 py-3 text-right text-amber-600">{formatCurrency(e.retefuente)}</td>
                              <td className="px-5 py-3 text-right text-purple-600">{formatCurrency(e.reteica)}</td>
                              <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatCurrency(e.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-200 font-semibold bg-gray-50">
                            <td colSpan={4} className="px-5 py-3 text-gray-700">Totales</td>
                            <td className="px-5 py-3 text-right text-blue-700">{formatCurrency(totalIva)}</td>
                            <td className="px-5 py-3 text-right text-amber-700">{formatCurrency(totalRetefuente)}</td>
                            <td className="px-5 py-3 text-right text-purple-700">{formatCurrency(totalReteica)}</td>
                            <td className="px-5 py-3 text-right text-gray-900">{formatCurrency(expenses.filter(e => e.iva > 0 || e.retefuente > 0 || e.reteica > 0).reduce((s, e) => s + e.amount, 0))}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ Modal: Nuevo gasto ══ */}
      {showExpenseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Registrar gasto</h2>
              <button onClick={() => setShowExpenseForm(false)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                  <select value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
                    {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                <input value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ej: Pago factura electricidad enero"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor / Tercero</label>
                  <input value={expenseForm.supplier} onChange={e => setExpenseForm(f => ({ ...f, supplier: e.target.value }))}
                    placeholder="Nombre o NIT"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° Soporte / Factura</label>
                  <input value={expenseForm.receipt_number} onChange={e => setExpenseForm(f => ({ ...f, receipt_number: e.target.value }))}
                    placeholder="FAC-0001"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor total del gasto *</label>
                <input type="number" min="0" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                <p className="text-xs font-semibold text-amber-700 mb-3 uppercase tracking-wide">Información tributaria (para DIAN)</p>
                <div className="grid grid-cols-2 gap-3">
                  {[['tax_base', 'Base gravable'], ['iva', 'IVA'], ['retefuente', 'Retefuente'], ['reteica', 'ReteICA']].map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                      <input type="number" min="0" value={(expenseForm as any)[key]}
                        onChange={e => setExpenseForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder="0"
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowExpenseForm(false)}
                  className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onClick={handleSaveExpense} disabled={savingExpense}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-60">
                  {savingExpense && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar gasto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal: Nueva deuda ══ */}
      {showDebtForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Registrar deuda / obligación</h2>
              <button onClick={() => setShowDebtForm(false)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Acreedor *</label>
                <input value={debtForm.creditor} onChange={e => setDebtForm(f => ({ ...f, creditor: e.target.value }))}
                  placeholder="Nombre del banco, persona, proveedor…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del préstamo</label>
                <input value={debtForm.description} onChange={e => setDebtForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ej: Préstamo para compra de inventario"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto total de la deuda *</label>
                  <input type="number" min="0" value={debtForm.original_amount} onChange={e => setDebtForm(f => ({ ...f, original_amount: e.target.value }))}
                    placeholder="20000000"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interés mensual %</label>
                  <input type="number" min="0" step="0.1" value={debtForm.interest_rate} onChange={e => setDebtForm(f => ({ ...f, interest_rate: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cuota diaria sugerida
                  <span className="ml-1 text-xs text-gray-400">(cuánto apartar cada día para pagar esta deuda)</span>
                </label>
                <input type="number" min="0" value={debtForm.daily_payment} onChange={e => setDebtForm(f => ({ ...f, daily_payment: e.target.value }))}
                  placeholder="Ej: 66667 para pagar $20M en 300 días"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                {debtForm.original_amount && debtForm.daily_payment && Number(debtForm.daily_payment) > 0 && (
                  <p className="text-xs text-sky-600 mt-1">
                    A este ritmo, se pagaría en ~{Math.ceil(Number(debtForm.original_amount) / Number(debtForm.daily_payment))} días ({Math.ceil(Number(debtForm.original_amount) / Number(debtForm.daily_payment) / 30)} meses)
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
                  <input type="date" value={debtForm.start_date} onChange={e => setDebtForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha vencimiento</label>
                  <input type="date" value={debtForm.due_date} onChange={e => setDebtForm(f => ({ ...f, due_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowDebtForm(false)}
                  className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onClick={handleSaveDebt} disabled={savingDebt}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500 py-3 text-sm font-bold text-white hover:bg-rose-600 disabled:opacity-60">
                  {savingDebt && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar deuda
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3.5 text-sm font-medium text-white shadow-lg ${toast.type === 'err' ? 'bg-red-600' : 'bg-gray-900'}`}>
          {toast.msg}
        </div>
      )}
    </AppShell>
  );
}

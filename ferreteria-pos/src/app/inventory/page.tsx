'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Search,
  LayoutGrid,
  LayoutList,
  Filter,
  RefreshCw,
  X,
  Loader2,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  FileSpreadsheet,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import ProductCard from '@/components/inventory/ProductCard';
import ProductTable from '@/components/inventory/ProductTable';
import ProductForm from '@/components/inventory/ProductForm';
import ExcelImport from '@/components/inventory/ExcelImport';
import { supabase } from '@/lib/supabase';
import { generateId } from '@/lib/utils';
import type { Category, Product, ProductFormData, StockMovementType } from '@/types';

type ViewMode = 'grid' | 'table';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('table');

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);

  // Stock adjustment
  const [adjustType, setAdjustType] = useState<StockMovementType>('in');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Delete confirm
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadCategories = useCallback(async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    setCategories(data ?? []);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('products')
      .select('*, category:categories(id,name,color)')
      .order(sortBy === 'category' ? 'name' : sortBy, {
        ascending: sortOrder === 'asc',
      });

    if (activeOnly) query = query.eq('active', true);
    if (categoryFilter) query = query.eq('category_id', categoryFilter);
    if (search)
      query = query.or(
        `name.ilike.%${search}%,barcode.ilike.%${search}%,description.ilike.%${search}%`
      );

    const { data, error } = await query;
    if (error) showToast('Error cargando productos', 'error');
    else setProducts((data ?? []) as Product[]);
    setLoading(false);
  }, [search, categoryFilter, activeOnly, sortBy, sortOrder]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const t = setTimeout(loadProducts, 300);
    return () => clearTimeout(t);
  }, [loadProducts]);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const handleSort = (column: string) => {
    if (sortBy === column) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(column); setSortOrder('asc'); }
  };

  // ── Save / Update product ─────────────────────────────────────────────────
  const handleSave = async (formData: ProductFormData) => {
    const payload = {
      name:        formData.name.trim(),
      description: formData.description.trim() || null,
      price:       Number(formData.price),
      cost:        Number(formData.cost),
      stock:       editingProduct ? editingProduct.stock : Number(formData.stock),
      min_stock:   Number(formData.min_stock) || 5,
      category_id: formData.category_id || null,
      barcode:     formData.barcode.trim() || null,
      unit:        formData.unit,
      supplier:    formData.supplier.trim() || null,
      image_url:   formData.image_url || null,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id);
      if (error) return showToast('Error actualizando producto', 'error');
      showToast('Producto actualizado correctamente');
    } else {
      const { error } = await supabase.from('products').insert({
        ...payload,
        id: generateId(),
        active: true,
      });
      if (error) return showToast('Error creando producto', 'error');
      showToast('Producto creado correctamente');
    }

    setShowForm(false);
    setEditingProduct(null);
    loadProducts();
  };

  // ── Delete (soft) ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteProduct) return;
    setDeleting(true);
    const { error } = await supabase
      .from('products')
      .update({ active: false })
      .eq('id', deleteProduct.id);
    setDeleting(false);
    setDeleteProduct(null);
    if (error) return showToast('Error eliminando producto', 'error');
    showToast('Producto desactivado');
    loadProducts();
  };

  // ── Stock adjustment ──────────────────────────────────────────────────────
  const handleAdjust = async () => {
    if (!adjustProduct) return;
    const qty = parseInt(adjustQty, 10);
    if (isNaN(qty) || qty <= 0) return;

    setAdjusting(true);
    const delta =
      adjustType === 'in' ? qty : adjustType === 'out' ? -qty : qty - adjustProduct.stock;
    const newStock =
      adjustType === 'adjustment' ? qty : adjustProduct.stock + delta;

    const { error: stockErr } = await supabase
      .from('products')
      .update({ stock: Math.max(0, newStock) })
      .eq('id', adjustProduct.id);

    if (!stockErr) {
      await supabase.from('stock_movements').insert({
        id: generateId(),
        product_id: adjustProduct.id,
        type: adjustType,
        quantity: qty,
        reason: adjustReason || null,
      });
    }

    setAdjusting(false);
    setAdjustProduct(null);
    setAdjustQty('');
    setAdjustReason('');
    if (stockErr) return showToast('Error ajustando stock', 'error');
    showToast('Stock ajustado correctamente');
    loadProducts();
  };

  const openAdd = () => {
    setEditingProduct(null);
    setShowForm(true);
  };
  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setShowForm(true);
  };

  const lowStockCount = products.filter(
    (p) => p.stock <= p.min_stock && p.active
  ).length;

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Inventario
            </h2>
            <p className="text-sm text-gray-500">
              {products.length} productos
              {lowStockCount > 0 && (
                <span className="ml-2 text-amber-600 font-medium">
                  · {lowStockCount} con stock bajo
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExcelImport(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-95 transition-transform"
            >
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Importar Excel
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 active:scale-95 transition-transform"
            >
              <Plus className="h-4 w-4" />
              Nuevo producto
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, código…"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-gray-200 py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Active toggle */}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded border-gray-300 accent-orange-500"
            />
            Solo activos
          </label>

          {/* Refresh */}
          <button
            onClick={loadProducts}
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {/* View mode */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView('table')}
              className={`p-2 transition-colors ${
                view === 'table'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('grid')}
              className={`p-2 transition-colors ${
                view === 'grid'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Product list */}
        {view === 'table' ? (
          <ProductTable
            products={products}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            onEdit={openEdit}
            onDelete={setDeleteProduct}
            onAdjust={setAdjustProduct}
            loading={loading}
          />
        ) : loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {products.length === 0 ? (
              <p className="col-span-full py-16 text-center text-gray-400">
                No se encontraron productos
              </p>
            ) : (
              products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onEdit={openEdit}
                  onDelete={setDeleteProduct}
                  onAdjust={setAdjustProduct}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Product form modal */}
      {showForm && (
        <ProductForm
          product={editingProduct}
          categories={categories}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingProduct(null); }}
        />
      )}

      {/* Delete confirm modal */}
      {deleteProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              ¿Desactivar producto?
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              <strong>{deleteProduct.name}</strong> se marcará como inactivo y
              no aparecerá en el POS. Puedes reactivarlo en cualquier momento.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteProduct(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock adjustment modal */}
      {adjustProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Ajustar stock
              </h3>
              <button
                onClick={() => setAdjustProduct(null)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {adjustProduct.name} — actual:{' '}
              <strong>{adjustProduct.stock} {adjustProduct.unit}</strong>
            </p>

            <div className="mt-5 space-y-4">
              {/* Type */}
              <div className="grid grid-cols-3 gap-2">
                {([
                  { v: 'in', label: 'Entrada', Icon: ArrowUpCircle, color: 'green' },
                  { v: 'out', label: 'Salida', Icon: ArrowDownCircle, color: 'red' },
                  { v: 'adjustment', label: 'Ajuste', Icon: RefreshCw, color: 'blue' },
                ] as const).map(({ v, label, Icon, color }) => (
                  <button
                    key={v}
                    onClick={() => setAdjustType(v)}
                    className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2.5 text-xs font-medium transition-colors ${
                      adjustType === v
                        ? color === 'green'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : color === 'red'
                          ? 'border-red-400 bg-red-50 text-red-600'
                          : 'border-blue-400 bg-blue-50 text-blue-600'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {adjustType === 'adjustment' ? 'Nuevo stock' : 'Cantidad'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="0"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Motivo
                </label>
                <input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Compra, devolución, pérdida…"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <button
                onClick={handleAdjust}
                disabled={adjusting || !adjustQty}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
              >
                {adjusting && <Loader2 className="h-4 w-4 animate-spin" />}
                Aplicar ajuste
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel import modal */}
      {showExcelImport && (
        <ExcelImport
          onImportComplete={() => { loadProducts(); loadCategories(); }}
          onClose={() => setShowExcelImport(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3.5 text-sm font-medium text-white shadow-lg transition-all ${
            toast.type === 'success' ? 'bg-gray-900' : 'bg-red-500'
          }`}
        >
          {toast.message}
        </div>
      )}
    </AppShell>
  );
}

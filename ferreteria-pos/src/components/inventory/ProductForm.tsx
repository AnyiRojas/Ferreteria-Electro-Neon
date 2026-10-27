'use client';

import { useEffect, useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import ImageUpload from './ImageUpload';
import { cn } from '@/lib/utils';
import type { Category, Product, ProductFormData } from '@/types';

interface ProductFormProps {
  product?: Product | null;
  categories: Category[];
  onSave: (data: ProductFormData) => Promise<void>;
  onClose: () => void;
}

const UNITS = ['und', 'mt', 'm²', 'm³', 'kg', 'lb', 'lt', 'gal', 'par', 'paq', 'rollo', 'varilla'];

const EMPTY_FORM: ProductFormData = {
  name: '',
  description: '',
  price: '',
  cost: '',
  stock: '',
  min_stock: '5',
  category_id: '',
  barcode: '',
  unit: 'und',
  supplier: '',
  image_url: '',
};

export default function ProductForm({
  product,
  categories,
  onSave,
  onClose,
}: ProductFormProps) {
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<ProductFormData>>({});

  // Enter global en el modal → guardar (excepto textarea y selects abiertos)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const tag = (e.target as HTMLElement).tagName;
      // No interceptar en textarea ni en el input file oculto
      if (tag === 'TEXTAREA' || tag === 'SELECT') return;
      // No interceptar si hay un botón enfocado (deja que el click natural ocurra)
      if (tag === 'BUTTON') return;
      e.preventDefault();
      // Disparar submit solo si no está guardando ya
      if (!saving) {
        const fakeEvent = new Event('submit', { bubbles: true, cancelable: true });
        (e.target as HTMLElement).closest('form')?.dispatchEvent(fakeEvent);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saving]);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        description: product.description ?? '',
        price: product.price.toString(),
        cost: product.cost.toString(),
        stock: product.stock.toString(),
        min_stock: product.min_stock.toString(),
        category_id: product.category_id ?? '',
        barcode: product.barcode ?? '',
        unit: product.unit,
        supplier: product.supplier ?? '',
        image_url: product.image_url ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [product]);

  const set = (field: keyof ProductFormData) => (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<ProductFormData> = {};
    if (!form.name.trim()) errs.name = 'Nombre requerido';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0)
      errs.price = 'Precio inválido';
    if (!form.cost || isNaN(Number(form.cost)) || Number(form.cost) < 0)
      errs.cost = 'Costo inválido';
    if (isNaN(Number(form.stock)) || Number(form.stock) < 0)
      errs.stock = 'Stock inválido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const field = (
    label: string,
    key: keyof ProductFormData,
    props?: React.InputHTMLAttributes<HTMLInputElement>
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        {...props}
        value={form[key]}
        onChange={set(key)}
        className={cn(
          'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400',
          errors[key] ? 'border-red-400' : 'border-gray-300'
        )}
      />
      {errors[key] && (
        <p className="mt-1 text-xs text-red-500">{errors[key]}</p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {product ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Image */}
          <ImageUpload
            value={form.image_url}
            onChange={(url) => setForm((p) => ({ ...p, image_url: url }))}
            productId={product?.id}
          />

          {/* Name */}
          {field('Nombre del producto *', 'name', {
            placeholder: 'Ej: Martillo de Carpintero 16oz',
          })}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Descripción
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              rows={2}
              placeholder="Descripción breve del producto…"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          {/* Price / Cost */}
          <div className="grid grid-cols-2 gap-4">
            {field('Precio de venta (COP) *', 'price', {
              type: 'number', min: '0', step: '1', placeholder: '0',
            })}
            {field('Costo / P. Compra (COP)', 'cost', {
              type: 'number', min: '0', step: '1', placeholder: '0',
            })}
          </div>

          {/* Supplier */}
          {field('Proveedor', 'supplier', { placeholder: 'Ej: TRUPER, STANLEY…' })}

          {/* Stock / Min stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Stock actual
                {product && (
                  <span className="ml-1.5 text-xs font-normal text-amber-600">
                    (editable — ten cuidado)
                  </span>
                )}
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={form.stock}
                onChange={set('stock')}
                className={cn(
                  'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400',
                  errors.stock ? 'border-red-400' : 'border-gray-300'
                )}
              />
              {errors.stock && (
                <p className="mt-1 text-xs text-red-500">{errors.stock}</p>
              )}
              {product && (
                <p className="mt-1 text-xs text-gray-400">
                  Usa "Ajustar stock" para entradas/salidas con historial
                </p>
              )}
            </div>
            {field('Stock mínimo', 'min_stock', {
              type: 'number',
              min: '0',
              placeholder: '5',
            })}
          </div>

          {/* Category / Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Categoría
              </label>
              <select
                value={form.category_id}
                onChange={set('category_id')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Unidad
              </label>
              <select
                value={form.unit}
                onChange={set('unit')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Barcode */}
          {field('Código de barras', 'barcode', {
            placeholder: 'EAN, SKU, referencia…',
          })}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useRef, useState } from 'react';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

// ─── Columnas aceptadas ───────────────────────────────────────────────────────
// Español (tu formato):  DEPARTAMENTO | PRODUCTO | CANTIDAD | P. COMPRA | F. COMPRA | PROVEEDOR | P. VENTA
// Inglés (alternativo):  categoria/category | nombre/name | stock | costo/cost | proveedor/supplier | precio/price

interface ExcelRow {
  // Español — formato ferretería
  DEPARTAMENTO?: string;
  PRODUCTO?: string;
  CANTIDAD?: number | string;
  'P. COMPRA'?: number | string;
  'P.COMPRA'?: number | string;
  'F. COMPRA'?: string;
  'F.COMPRA'?: string;
  PROVEEDOR?: string;
  'P. VENTA'?: number | string;
  'P.VENTA'?: number | string;
  // Alias en minúsculas
  departamento?: string;
  producto?: string;
  cantidad?: number | string;
  proveedor?: string;
  // Inglés genérico
  name?: string;
  nombre?: string;
  category?: string;
  categoria?: string;
  price?: number | string;
  precio?: number | string;
  cost?: number | string;
  costo?: number | string;
  stock?: number | string;
  supplier?: string;
  unit?: string;
  unidad?: string;
  barcode?: string;
  codigo_barras?: string;
  description?: string;
  descripcion?: string;
  min_stock?: number | string;
  stock_minimo?: number | string;
}

interface ImportResult {
  success: number;
  errors: { row: number; message: string }[];
}

interface ExcelImportProps {
  onImportComplete: () => void;
  onClose: () => void;
}

function toNum(val: unknown, fallback = 0): number {
  if (val == null || val === '') return fallback;
  // Limpiar formato moneda: "$730" → 730
  const cleaned = String(val).replace(/[$,\s]/g, '');
  const n = Number(cleaned);
  return isNaN(n) ? fallback : n;
}

function toStr(val: unknown): string {
  return val == null ? '' : String(val).trim();
}

export default function ExcelImport({ onImportComplete, onClose }: ExcelImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<ExcelRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function parseFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<ExcelRow>(ws, { defval: '' });
      setFileName(file.name);
      setPreview(rows.slice(0, 5));
    };
    reader.readAsArrayBuffer(file);
  }

  function handleFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert('Solo se aceptan archivos .xlsx, .xls o .csv');
      return;
    }
    setResult(null);
    parseFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function runImport() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setImporting(true);
    const errors: ImportResult['errors'] = [];
    let success = 0;

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<ExcelRow>(ws, { defval: '' });

    const categoryCache: Record<string, string> = {};

    async function getCategoryId(rawName: string): Promise<string | null> {
      const name = rawName.trim();
      if (!name) return null;

      // Limpiar prefijo numérico tipo "09. Herrajes y Seguridad" → "Herrajes y Seguridad"
      const cleanName = name.replace(/^\d+\.\s*/, '').trim();
      const cacheKey = cleanName.toLowerCase();

      if (categoryCache[cacheKey]) return categoryCache[cacheKey];

      const { data } = await supabase
        .from('categories')
        .select('id')
        .ilike('name', cleanName)
        .maybeSingle();

      if (data?.id) {
        categoryCache[cacheKey] = data.id;
        return data.id;
      }

      const { data: newCat, error } = await supabase
        .from('categories')
        .insert({ name: cleanName })
        .select('id')
        .single();

      if (error || !newCat) return null;
      categoryCache[cacheKey] = newCat.id;
      return newCat.id;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      // ── Normalizar campos (tu formato o alternativo) ──────────────────────
      const name = toStr(
        row.PRODUCTO ?? row.producto ?? row.nombre ?? row.name
      );
      if (!name) {
        errors.push({ row: rowNum, message: 'Falta el nombre del producto' });
        continue;
      }

      const precio = toNum(
        row['P. VENTA'] ?? row['P.VENTA'] ?? row.precio ?? row.price, 0
      );
      if (precio <= 0) {
        errors.push({ row: rowNum, message: `"${name}": P. VENTA debe ser mayor a 0` });
        continue;
      }

      const categoryRaw = toStr(
        row.DEPARTAMENTO ?? row.departamento ?? row.categoria ?? row.category
      );
      const category_id = categoryRaw ? await getCategoryId(categoryRaw) : null;

      const product = {
        name,
        description:  null,
        price:        precio,
        cost:         toNum(row['P. COMPRA'] ?? row['P.COMPRA'] ?? row.costo ?? row.cost, 0),
        stock:        Math.round(toNum(row.CANTIDAD ?? row.cantidad ?? row.stock, 0)),
        min_stock:    Math.round(toNum(row.stock_minimo ?? row.min_stock, 5)),
        unit:         toStr(row.unidad ?? row.unit) || 'und',
        barcode:      toStr(row.barcode ?? row.codigo_barras) || null,
        supplier:     toStr(row.PROVEEDOR ?? row.proveedor ?? row.supplier) || null,
        category_id,
        active:       true,
      };

      const { error } = await supabase.from('products').insert(product);
      if (error) {
        errors.push({ row: rowNum, message: `"${name}": ${error.message}` });
      } else {
        success++;
      }
    }

    setResult({ success, errors });
    setImporting(false);
    if (success > 0) onImportComplete();
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['DEPARTAMENTO', 'PRODUCTO', 'CANTIDAD', 'P. COMPRA', 'F. COMPRA', 'PROVEEDOR', 'P. VENTA'],
      ['09. Herrajes y Seguridad', 'ABRAZADERA METALICA 3/8"', 15, 730, '1/07/2026', 'TRUPER', 800],
      ['01. Herramientas Manuales', 'MARTILLO 16oz', 20, 22000, '1/07/2026', 'STANLEY', 35000],
      ['03. Plomería', 'LLAVE STILSON 14"', 8, 45000, '1/07/2026', 'ROTOPLAS', 68000],
    ]);
    ws['!cols'] = [28, 30, 10, 12, 12, 15, 12].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');
    XLSX.writeFile(wb, 'plantilla_productos.xlsx');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Importar productos desde Excel</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

          {/* Plantilla */}
          <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
            <p className="text-sm text-blue-700">
              Descarga la plantilla con el formato de tu inventario.
            </p>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Download className="h-3.5 w-3.5" />
              Plantilla
            </button>
          </div>

          {/* Columnas */}
          <div className="rounded-lg border bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Columnas del Excel</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                ['DEPARTAMENTO', 'Categoría (requerida)'],
                ['PRODUCTO', 'Nombre del producto (requerido)'],
                ['P. VENTA', 'Precio de venta (requerido)'],
                ['CANTIDAD', 'Stock inicial'],
                ['P. COMPRA', 'Precio de costo (solo admin)'],
                ['PROVEEDOR', 'Nombre del proveedor'],
                ['F. COMPRA', 'Fecha compra (se ignora)'],
              ].map(([col, note]) => (
                <div key={col} className="flex items-center gap-1.5">
                  <code className="text-xs bg-white border rounded px-1.5 py-0.5 text-orange-600 font-mono whitespace-nowrap">{col}</code>
                  <span className="text-xs text-gray-400">{note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragging ? 'border-orange-400 bg-orange-50' : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50'
            }`}
          >
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            {fileName ? (
              <p className="text-sm font-medium text-green-700">📄 {fileName}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">Arrastra tu archivo o haz clic para seleccionar</p>
                <p className="text-xs text-gray-400 mt-1">.xlsx · .xls · .csv</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          {/* Preview */}
          {preview.length > 0 && !result && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Vista previa (primeras {preview.length} filas)
              </p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      {Object.keys(preview[0]).map(k => (
                        <th key={k} className="px-3 py-2 text-left font-medium whitespace-nowrap">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {preview.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[160px] truncate">
                            {String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                <p className="text-sm text-green-800 font-medium">
                  {result.success} producto{result.success !== 1 ? 's' : ''} importado{result.success !== 1 ? 's' : ''} correctamente
                </p>
              </div>
              {result.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <p className="text-sm font-medium text-red-800">{result.errors.length} fila{result.errors.length !== 1 ? 's' : ''} con error:</p>
                  </div>
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <li key={i} className="text-xs text-red-700">
                        <span className="font-medium">Fila {e.row}:</span> {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {result ? 'Cerrar' : 'Cancelar'}
          </button>
          {!result && (
            <button
              onClick={runImport}
              disabled={importing || preview.length === 0}
              className="flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Importar productos
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

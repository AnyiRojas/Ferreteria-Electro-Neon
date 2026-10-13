/**
 * backup-diario.js — Electro Neon Ferrelectricos
 * ------------------------------------------------
 * Exporta productos e inventario a un archivo Excel con timestamp.
 * Ejecución: node backup-diario.js
 *
 * Para programarlo todos los días a las 8:00 AM en Windows:
 *   schtasks /create /tn "ElectroNeon-Backup" /tr "node C:\ruta\ferreteria-pos\scripts\backup-diario.js" /sc daily /st 08:00
 */

const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// ─── Configuración ────────────────────────────────────────────────────────────
const localEnv     = require('./env-loader');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL  || localEnv.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || localEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Carpeta donde se guardan los backups (se crea si no existe)
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// ─── Main ─────────────────────────────────────────────────────────────────────
async function runBackup() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const now      = new Date();
  const stamp    = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backup_inventario_${stamp}.xlsx`;

  console.log(`\n🔄  Iniciando backup — ${now.toLocaleString('es-CO')}`);

  // ── 1. Productos ──────────────────────────────────────────────────────────
  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('*, category:categories(name)')
    .order('name');

  if (pErr) { console.error('❌  Error al obtener productos:', pErr.message); process.exit(1); }

  const productsSheet = (products ?? []).map(p => ({
    'ID':             p.id,
    'PRODUCTO':       p.name,
    'DESCRIPCION':    p.description ?? '',
    'DEPARTAMENTO':   p.category?.name ?? '',
    'PROVEEDOR':      p.supplier ?? '',
    'P. VENTA':       Number(p.price),
    'P. COMPRA':      Number(p.cost),
    'STOCK':          p.stock,
    'STOCK MINIMO':   p.min_stock,
    'UNIDAD':         p.unit,
    'CODIGO BARRAS':  p.barcode ?? '',
    'ACTIVO':         p.active ? 'Sí' : 'No',
    'IMAGEN URL':     p.image_url ?? '',
    'FECHA CREACION': new Date(p.created_at).toLocaleString('es-CO'),
    'ULTIMA EDICION': new Date(p.updated_at).toLocaleString('es-CO'),
  }));

  // ── 2. Movimientos de stock del día ───────────────────────────────────────
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const { data: movements } = await supabase
    .from('stock_movements')
    .select('*, product:products(name)')
    .gte('created_at', dayStart.toISOString())
    .order('created_at', { ascending: false });

  const movSheet = (movements ?? []).map(m => ({
    'PRODUCTO':  m.product?.name ?? m.product_id,
    'TIPO':      m.type === 'in' ? 'Entrada' : m.type === 'out' ? 'Salida' : 'Ajuste',
    'CANTIDAD':  m.quantity,
    'MOTIVO':    m.reason ?? '',
    'FECHA':     new Date(m.created_at).toLocaleString('es-CO'),
  }));

  // ── 3. Ventas del día ─────────────────────────────────────────────────────
  const { data: sales } = await supabase
    .from('sales')
    .select('*, sale_items(quantity, unit_price, subtotal, product:products(name))')
    .gte('created_at', dayStart.toISOString())
    .order('created_at', { ascending: false });

  const salesSheet = (sales ?? []).flatMap(s =>
    (s.sale_items ?? []).map((item) => ({
      'VENTA ID':      s.id.slice(0, 8),
      'PRODUCTO':      item.product?.name ?? '',
      'CANTIDAD':      item.quantity,
      'PRECIO UNIT':   Number(item.unit_price),
      'SUBTOTAL':      Number(item.subtotal),
      'TOTAL VENTA':   Number(s.total),
      'PAGO':          s.payment_method === 'cash' ? 'Efectivo' : s.payment_method === 'card' ? 'Tarjeta' : 'Transferencia',
      'FECHA':         new Date(s.created_at).toLocaleString('es-CO'),
    }))
  );

  // ── 4. Resumen del día ────────────────────────────────────────────────────
  const totalVentas   = (sales ?? []).reduce((s, v) => s + Number(v.total), 0);
  const totalSales    = (sales ?? []).length;
  const stockBajo     = (products ?? []).filter(p => p.active && p.stock <= p.min_stock).length;
  const agotados      = (products ?? []).filter(p => p.stock === 0).length;

  const resumenSheet = [
    { 'CONCEPTO': 'Fecha del backup',       'VALOR': now.toLocaleString('es-CO') },
    { 'CONCEPTO': 'Total productos activos', 'VALOR': (products ?? []).filter(p => p.active).length },
    { 'CONCEPTO': 'Productos agotados',      'VALOR': agotados },
    { 'CONCEPTO': 'Productos stock bajo',    'VALOR': stockBajo },
    { 'CONCEPTO': 'Ventas del día',          'VALOR': totalSales },
    { 'CONCEPTO': 'Ingresos del día',        'VALOR': `$${totalVentas.toLocaleString('es-CO')}` },
  ];

  // ── 5. Crear el Excel ─────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();

  const wsResumen   = XLSX.utils.json_to_sheet(resumenSheet);
  const wsProducts  = XLSX.utils.json_to_sheet(productsSheet);
  const wsMov       = XLSX.utils.json_to_sheet(movSheet.length ? movSheet : [{ 'INFO': 'Sin movimientos hoy' }]);
  const wsSales     = XLSX.utils.json_to_sheet(salesSheet.length ? salesSheet : [{ 'INFO': 'Sin ventas hoy' }]);

  // Anchos de columna
  wsProducts['!cols'] = [36,30,30,25,15,12,12,8,12,8,18,6,50,20,20].map(w => ({ wch: w }));
  wsResumen['!cols']  = [{ wch: 28 }, { wch: 25 }];

  XLSX.utils.book_append_sheet(wb, wsResumen,  'Resumen');
  XLSX.utils.book_append_sheet(wb, wsProducts, 'Inventario');
  XLSX.utils.book_append_sheet(wb, wsMov,      'Movimientos Hoy');
  XLSX.utils.book_append_sheet(wb, wsSales,    'Ventas Hoy');

  // ── 6. Guardar ────────────────────────────────────────────────────────────
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const filePath = path.join(BACKUP_DIR, filename);
  XLSX.writeFile(wb, filePath);

  // Limpiar backups de más de 30 días
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup_inventario_') && f.endsWith('.xlsx'))
    .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  const old = files.slice(30); // Mantener solo los últimos 30
  old.forEach(f => {
    fs.unlinkSync(path.join(BACKUP_DIR, f.name));
    console.log(`🗑️   Backup antiguo eliminado: ${f.name}`);
  });

  console.log(`✅  Backup guardado: ${filePath}`);
  console.log(`📊  ${(products ?? []).length} productos · ${totalSales} ventas hoy · $${totalVentas.toLocaleString('es-CO')}`);
  console.log(`⚠️   Stock bajo: ${stockBajo} · Agotados: ${agotados}\n`);
}

runBackup().catch(err => {
  console.error('❌  Error inesperado:', err.message);
  process.exit(1);
});

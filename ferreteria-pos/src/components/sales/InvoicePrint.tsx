'use client';

import { useEffect, useState } from 'react';
import type { CartItem, CheckoutData, AppSettings } from '@/types';
import { formatCurrency, formatDateTime, paymentMethodLabel } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface InvoicePrintProps {
  items: CartItem[];
  checkoutData: CheckoutData;
  saleId?: string;
  onClose: () => void;
}

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

/** Genera el HTML completo de la factura para imprimir en ventana nueva */
function buildReceiptHTML(params: {
  items: CartItem[];
  checkoutData: CheckoutData;
  saleId?: string;
  settings: AppSettings | null;
  subtotal: number;
  discountAmount: number;
  total: number;
  change: number;
  now: string;
}): string {
  const { items, checkoutData, saleId, settings, subtotal, discountAmount, total, change, now } = params;

  const companyName = settings?.company_name || 'FERRETERÍA';
  const nit         = settings?.nit          || '—';
  const address     = settings?.address      || '—';
  const phone       = settings?.phone        || '—';
  const resolution  = settings?.dian_resolution || '';
  const prefix      = settings?.dian_prefix    || '';
  const dianFrom    = settings?.dian_from      ?? '';
  const dianTo      = settings?.dian_to        ?? '';
  const dianUntil   = settings?.dian_valid_until || '';

  const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  const logoHtml = `<img src="${window.location.origin}/logo-electroneon.png" alt="Logo" style="max-width:40mm;max-height:20mm;margin:0 auto 4px;display:block;object-fit:contain;" />`;

  const dianSection = resolution ? `
    <hr style="border-top:1px dashed #000;margin:3px 0"/>
    <div style="font-size:9px;text-align:center;line-height:1.4">
      <p style="margin:0;font-weight:bold">DOCUMENTO EQUIVALENTE ELECTRÓNICO</p>
      <p style="margin:1px 0">Res. DIAN N° ${resolution}</p>
      ${prefix ? `<p style="margin:1px 0">Prefijo: ${prefix} · Rango: ${dianFrom}–${dianTo}</p>` : ''}
      ${dianUntil ? `<p style="margin:1px 0">Vigencia: ${dianUntil}</p>` : ''}
    </div>` : '';

  const customerSection = (checkoutData.customer_name || checkoutData.customer_id_number || checkoutData.customer_phone) ? `
    <hr style="border-top:1px dashed #000;margin:4px 0"/>
    <p style="font-size:10px;font-weight:bold;margin:2px 0;text-transform:uppercase">Cliente</p>
    ${checkoutData.customer_name ? `<p style="margin:2px 0"><strong>Nombre:</strong> ${checkoutData.customer_name}</p>` : ''}
    ${checkoutData.customer_id_number ? `<p style="margin:2px 0"><strong>CC/NIT:</strong> ${checkoutData.customer_id_number}</p>` : ''}
    ${checkoutData.customer_phone ? `<p style="margin:2px 0"><strong>Tel:</strong> ${checkoutData.customer_phone}</p>` : ''}
  ` : '';

  const itemsHtml = items.map(item => `
    <div style="display:flex;justify-content:space-between;margin:2px 0">
      <span style="flex:3;overflow-wrap:break-word;padding-right:4px">${item.product.name}</span>
      <span style="flex:1;text-align:center">${item.quantity}</span>
      <span style="flex:2;text-align:right">${fmt(item.subtotal)}</span>
    </div>
    <div style="color:#555;font-size:10px;margin-bottom:2px">${fmt(item.unit_price)} c/u</div>
  `).join('');

  const discountHtml = checkoutData.discount > 0
    ? `<div style="display:flex;justify-content:space-between;margin:2px 0"><span>Descuento (${checkoutData.discount}%)</span><span>-${fmt(discountAmount)}</span></div>`
    : '';

  const cashHtml = checkoutData.payment_method === 'cash' ? `
    <div style="display:flex;justify-content:space-between;margin:2px 0"><span>Efectivo recibido</span><span>${fmt(checkoutData.cash_received)}</span></div>
    <div style="display:flex;justify-content:space-between;margin:2px 0"><span>Cambio</span><span>${fmt(Math.max(0, change))}</span></div>
  ` : '';

  const notesHtml = checkoutData.notes
    ? `<p style="margin:2px 0"><strong>Nota:</strong> ${checkoutData.notes}</p>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Factura</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 2mm; font-family: monospace; font-size: 12px; width: 80mm; }
    @page { size: 80mm auto; margin: 2mm; }
    @media print { body { width: 80mm; } }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:4px">
    ${logoHtml}
    <p style="font-size:15px;font-weight:bold;margin:0">${companyName}</p>
    <p style="font-size:10px;margin:1px 0">NIT: ${nit}</p>
    <p style="font-size:10px;margin:1px 0">${address}</p>
    <p style="font-size:10px;margin:1px 0">Tel: ${phone}</p>
  </div>
  ${dianSection}
  <hr style="border-top:1px dashed #000;margin:4px 0"/>
  <p style="margin:2px 0"><strong>Doc:</strong> ${prefix}${saleId ? saleId.slice(-8).toUpperCase() : 'N/A'}</p>
  <p style="margin:2px 0"><strong>Fecha:</strong> ${formatDateTime(now)}</p>
  <p style="margin:2px 0"><strong>Pago:</strong> ${paymentMethodLabel(checkoutData.payment_method)}</p>
  ${notesHtml}
  ${customerSection}
  <hr style="border-top:1px dashed #000;margin:4px 0"/>
  <div style="display:flex;justify-content:space-between;font-weight:bold;margin-bottom:2px">
    <span style="flex:3">Producto</span>
    <span style="flex:1;text-align:center">Cant</span>
    <span style="flex:2;text-align:right">Subtotal</span>
  </div>
  <hr style="border-top:1px dashed #000;margin:2px 0"/>
  ${itemsHtml}
  <hr style="border-top:1px dashed #000;margin:4px 0"/>
  <div style="display:flex;justify-content:space-between;margin:2px 0"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
  ${discountHtml}
  <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:14px;margin:4px 0"><span>TOTAL</span><span>${fmt(total)}</span></div>
  ${cashHtml}
  <hr style="border-top:1px dashed #000;margin:6px 0"/>
  <p style="text-align:center;font-size:11px;margin:0">¡Gracias por su compra!</p>
  <p style="text-align:center;font-size:10px;color:#555;margin-top:2px">Conserve este documento</p>
  <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; };<\/script>
</body>
</html>`;
}

export default function InvoicePrint({
  items,
  checkoutData,
  saleId,
  onClose,
}: InvoicePrintProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const subtotal       = items.reduce((s, i) => s + i.subtotal, 0);
  const discountAmount = (subtotal * checkoutData.discount) / 100;
  const total          = subtotal - discountAmount;
  const change         = checkoutData.cash_received - total;
  const now            = new Date().toISOString();

  // 1. Cargar settings de empresa
  useEffect(() => {
    supabase
      .from('app_settings')
      .select('*')
      .eq('id', SETTINGS_ID)
      .single()
      .then(({ data }) => {
        if (data) setSettings(data as AppSettings);
        setSettingsLoaded(true);
      });
  }, []);

  // 2. Imprimir en ventana nueva una vez cargados los settings
  useEffect(() => {
    if (!settingsLoaded) return;

    const html = buildReceiptHTML({
      items, checkoutData, saleId, settings,
      subtotal, discountAmount, total, change, now,
    });

    const win = window.open('', '_blank', 'width=320,height=600,toolbar=0,scrollbars=0,status=0');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded]);

  /** Reimprime abriendo de nuevo la ventana */
  const handleReprint = () => {
    const html = buildReceiptHTML({
      items, checkoutData, saleId, settings,
      subtotal, discountAmount, total, change, now,
    });
    const win = window.open('', '_blank', 'width=320,height=600,toolbar=0,scrollbars=0,status=0');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl text-center space-y-4">
        {/* Ícono éxito */}
        <div className="flex justify-center">
          <svg className="h-14 w-14 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-gray-900">¡Venta completada!</h3>

        {checkoutData.payment_method === 'cash' && change > 0 && (
          <div className="rounded-xl bg-green-50 p-3">
            <p className="text-sm text-green-700">Cambio a devolver</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(change)}</p>
          </div>
        )}

        <p className="text-sm text-gray-500">
          {settingsLoaded
            ? 'La factura se abrió en una ventana emergente para imprimir.'
            : 'Cargando datos de la empresa…'}
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleReprint}
            className="flex-1 rounded-xl border border-sky-300 py-2.5 text-sm font-medium text-sky-600 hover:bg-sky-50"
          >
            Reimprimir
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-sky-500 py-2.5 text-sm font-bold text-white hover:bg-sky-600"
          >
            Nueva venta
          </button>
        </div>
      </div>
    </div>
  );
}

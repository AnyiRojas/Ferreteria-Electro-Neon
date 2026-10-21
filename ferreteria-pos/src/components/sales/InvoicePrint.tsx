'use client';

import { useEffect, useRef, useState } from 'react';
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

export default function InvoicePrint({
  items,
  checkoutData,
  saleId,
  onClose,
}: InvoicePrintProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const subtotal       = items.reduce((s, i) => s + i.subtotal, 0);
  const discountAmount = (subtotal * checkoutData.discount) / 100;
  const total          = subtotal - discountAmount;
  const change         = checkoutData.cash_received - total;
  const now            = new Date().toISOString();

  // Cargar datos de empresa para el encabezado del comprobante
  useEffect(() => {
    supabase
      .from('app_settings')
      .select('*')
      .eq('id', SETTINGS_ID)
      .single()
      .then(({ data }) => { if (data) setSettings(data as AppSettings); });
  }, []);

  // Dispara la impresión automáticamente al montar
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, []);

  const companyName = settings?.company_name || 'FERRETERÍA';
  const nit         = settings?.nit          || '—';
  const address     = settings?.address      || '—';
  const phone       = settings?.phone        || '—';
  const resolution  = settings?.dian_resolution || '';
  const prefix      = settings?.dian_prefix    || '';
  const dianFrom    = settings?.dian_from      ?? '';
  const dianTo      = settings?.dian_to        ?? '';
  const dianUntil   = settings?.dian_valid_until || '';

  return (
    <>
      {/* ── Estilos solo para impresión ── */}
      <style>{`
        @media print {
          body > *:not(#invoice-print-root) { display: none !important; }
          #invoice-print-root { display: block !important; }
          @page { size: 80mm auto; margin: 4mm; }
        }
        @media screen {
          #invoice-print-root { display: none; }
        }
      `}</style>

      {/* ── Overlay de pantalla ── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl text-center space-y-4">
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
            La factura se está enviando a la impresora…
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
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

      {/* ── Contenido imprimible DEE POS (oculto en pantalla) ── */}
      <div id="invoice-print-root" ref={printRef}>
        <div style={{ fontFamily: 'monospace', fontSize: '12px', width: '72mm', padding: '2mm' }}>

          {/* Encabezado empresa */}
          <div style={{ textAlign: 'center', marginBottom: '4px' }}>
            <p style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>{companyName}</p>
            <p style={{ fontSize: '10px', margin: '1px 0' }}>NIT: {nit}</p>
            <p style={{ fontSize: '10px', margin: '1px 0' }}>{address}</p>
            <p style={{ fontSize: '10px', margin: '1px 0' }}>Tel: {phone}</p>
          </div>

          {/* Datos DEE POS — resolución DIAN */}
          {resolution && (
            <>
              <hr style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />
              <div style={{ fontSize: '9px', textAlign: 'center', lineHeight: '1.4' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>DOCUMENTO EQUIVALENTE ELECTRÓNICO</p>
                <p style={{ margin: '1px 0' }}>Res. DIAN N° {resolution}</p>
                {prefix && <p style={{ margin: '1px 0' }}>Prefijo: {prefix} · Rango: {dianFrom}–{dianTo}</p>}
                {dianUntil && <p style={{ margin: '1px 0' }}>Vigencia: {dianUntil}</p>}
              </div>
            </>
          )}

          <hr style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

          {/* Datos de la venta */}
          <p style={{ margin: '2px 0' }}>
            <strong>Doc:</strong> {prefix}{saleId?.slice(-8).toUpperCase() ?? 'N/A'}
          </p>
          <p style={{ margin: '2px 0' }}>
            <strong>Fecha:</strong> {formatDateTime(now)}
          </p>
          <p style={{ margin: '2px 0' }}>
            <strong>Pago:</strong> {paymentMethodLabel(checkoutData.payment_method)}
          </p>
          {checkoutData.notes && (
            <p style={{ margin: '2px 0' }}>
              <strong>Nota:</strong> {checkoutData.notes}
            </p>
          )}

          <hr style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

          {/* Encabezado de tabla */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '2px' }}>
            <span style={{ flex: 3 }}>Producto</span>
            <span style={{ flex: 1, textAlign: 'center' }}>Cant</span>
            <span style={{ flex: 2, textAlign: 'right' }}>Subtotal</span>
          </div>

          <hr style={{ borderTop: '1px dashed #000', margin: '2px 0' }} />

          {/* Items */}
          {items.map((item, idx) => (
            <div key={idx}>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                <span style={{ flex: 3, overflowWrap: 'break-word', paddingRight: '4px' }}>
                  {item.product.name}
                </span>
                <span style={{ flex: 1, textAlign: 'center' }}>{item.quantity}</span>
                <span style={{ flex: 2, textAlign: 'right' }}>{formatCurrency(item.subtotal)}</span>
              </div>
              <div style={{ color: '#555', fontSize: '10px', marginBottom: '2px' }}>
                {formatCurrency(item.unit_price)} c/u
              </div>
            </div>
          ))}

          <hr style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

          {/* Totales */}
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {checkoutData.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
              <span>Descuento ({checkoutData.discount}%)</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', margin: '4px 0' }}>
            <span>TOTAL</span>
            <span>{formatCurrency(total)}</span>
          </div>
          {checkoutData.payment_method === 'cash' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                <span>Efectivo recibido</span>
                <span>{formatCurrency(checkoutData.cash_received)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                <span>Cambio</span>
                <span>{formatCurrency(Math.max(0, change))}</span>
              </div>
            </>
          )}

          <hr style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

          <p style={{ textAlign: 'center', fontSize: '11px', margin: 0 }}>¡Gracias por su compra!</p>
          <p style={{ textAlign: 'center', fontSize: '10px', color: '#555', marginTop: '2px' }}>Conserve este documento</p>
        </div>
      </div>
    </>
  );
}

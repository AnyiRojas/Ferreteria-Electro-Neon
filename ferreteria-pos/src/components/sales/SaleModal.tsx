'use client';

import { useState } from 'react';
import { X, Banknote, CreditCard, ArrowLeftRight, Loader2, User } from 'lucide-react';
import type { CartItem, CheckoutData, PaymentMethod } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface SaleModalProps {
  items: CartItem[];
  discount: number;
  onConfirm: (data: CheckoutData) => Promise<void>;
  onClose: () => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; Icon: React.ElementType }[] = [
  { value: 'cash', label: 'Efectivo', Icon: Banknote },
  { value: 'card', label: 'Tarjeta', Icon: CreditCard },
  { value: 'transfer', label: 'Transferencia', Icon: ArrowLeftRight },
];

export default function SaleModal({ items, discount, onConfirm, onClose }: SaleModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  // Datos del cliente (opcionales)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerIdNumber, setCustomerIdNumber] = useState('');
  const [showCustomer, setShowCustomer] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;
  const cash = parseFloat(cashReceived) || 0;
  const change = cash - total;

  const handleConfirm = async () => {
    if (paymentMethod === 'cash' && cash < total) return;
    setProcessing(true);
    await onConfirm({
      payment_method: paymentMethod,
      cash_received: paymentMethod === 'cash' ? cash : total,
      discount,
      notes,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_id_number: customerIdNumber.trim(),
    });
    setProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Cobrar venta</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Items summary */}
          <div className="rounded-xl bg-gray-50 p-4 space-y-1.5">
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm text-gray-600">
                  <span className="mr-2 truncate">
                    {item.product.name}{' '}
                    <span className="text-gray-400">x{item.quantity}</span>
                  </span>
                  <span className="font-medium shrink-0">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600 border-t border-gray-200 pt-1.5 mt-1.5">
                <span>Descuento ({discount}%)</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2 mt-1">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Datos del cliente — desplegable opcional */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCustomer(v => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span>
                  Datos del cliente
                  <span className="ml-1.5 text-xs font-normal text-gray-400">(opcional — aparecen en la factura)</span>
                </span>
              </div>
              <span className={`text-xs font-normal transition-colors ${showCustomer ? 'text-sky-500' : 'text-gray-400'}`}>
                {showCustomer ? 'Ocultar ▲' : 'Agregar ▼'}
              </span>
            </button>

            {showCustomer && (
              <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3 bg-gray-50">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo</label>
                  <input
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">CC / NIT</label>
                    <input
                      value={customerIdNumber}
                      onChange={e => setCustomerIdNumber(e.target.value)}
                      placeholder="123456789"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Celular</label>
                    <input
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="300 123 4567"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment method */}
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Método de pago</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => setPaymentMethod(value)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-xs font-medium transition-colors ${
                    paymentMethod === value
                      ? 'border-sky-500 bg-sky-50 text-sky-600'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Cash fields */}
          {paymentMethod === 'cash' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Efectivo recibido
                </label>
                <input
                  type="number"
                  min={total}
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder={formatCurrency(total)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
                {/* Botones rápidos de billetes colombianos */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {/* Exacto: valor preciso del total sin redondear */}
                  <button
                    onClick={() => setCashReceived(total.toString())}
                    className="rounded-lg border border-sky-400 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-600 hover:bg-sky-100"
                  >
                    Exacto ({formatCurrency(total)})
                  </button>
                  {/* Billetes colombianos: solo los >= total */}
                  {[5000, 10000, 20000, 50000, 100000, 200000].filter(v => v >= total).slice(0, 5).map((v) => (
                    <button
                      key={v}
                      onClick={() => setCashReceived(v.toString())}
                      className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      {formatCurrency(v)}
                    </button>
                  ))}
                  {/* Si el total es mayor a 200k, mostrar múltiplos de 100k útiles */}
                  {total > 200000 && [
                    Math.ceil(total / 100000) * 100000,
                    Math.ceil(total / 100000) * 100000 + 100000,
                    Math.ceil(total / 100000) * 100000 + 200000,
                  ].map((v) => (
                    <button
                      key={v}
                      onClick={() => setCashReceived(v.toString())}
                      className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      {formatCurrency(v)}
                    </button>
                  ))}
                </div>
              </div>
              {cash >= total && (
                <div className="rounded-xl bg-green-50 p-3">
                  <p className="text-sm text-green-700">Cambio a devolver</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(change)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notas (opcional)
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones, referencia de pedido…"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={
                processing ||
                (paymentMethod === 'cash' && cash < total)
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-60"
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar venta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

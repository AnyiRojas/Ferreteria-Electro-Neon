'use client';

import { useEffect, useState } from 'react';
import { Settings, Building2, Printer, Shield, Loader2, Check } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { supabase } from '@/lib/supabase';
import type { AppSettings } from '@/types';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

const DEFAULT_SETTINGS: AppSettings = {
  company_name: '', nit: '', address: '', city: '', phone: '', email: '',
  dian_resolution: '', dian_prefix: '', dian_from: 1, dian_to: 1000,
  dian_valid_until: '', printer_name: '', drawer_enabled: false, drawer_port: 'COM1',
};

type Tab = 'empresa' | 'dian' | 'dispositivos';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('empresa');
  const [form, setForm] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from('app_settings').select('*').eq('id', SETTINGS_ID).single()
      .then(({ data }) => {
        if (data) setForm({ ...DEFAULT_SETTINGS, ...data });
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .upsert({ ...form, id: SETTINGS_ID, updated_at: new Date().toISOString() });
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    setSaving(false);
  };

  const set = (field: keyof AppSettings, value: string | number | boolean) =>
    setForm(f => ({ ...f, [field]: value }));

  const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: 'empresa',      label: 'Empresa',     Icon: Building2 },
    { id: 'dian',         label: 'DIAN / DEE POS', Icon: Shield },
    { id: 'dispositivos', label: 'Dispositivos', Icon: Printer },
  ];

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
    <AppShell>
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Configuración</h2>
            <p className="text-sm text-gray-500">Datos de empresa, DIAN y dispositivos</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
            {saved ? '¡Guardado!' : 'Guardar cambios'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit text-sm">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${tab === id ? 'bg-sky-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">

          {/* ── Empresa ── */}
          {tab === 'empresa' && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Razón social / Nombre del negocio</label>
                  <input value={form.company_name} onChange={e => set('company_name', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
                  <input value={form.nit} onChange={e => set('nit', e.target.value)} placeholder="Ej: 900123456-1"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                  <input value={form.city} onChange={e => set('city', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input value={form.address} onChange={e => set('address', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
              </div>
            </>
          )}

          {/* ── DIAN / DEE POS ── */}
          {tab === 'dian' && (
            <>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Documento Equivalente Electrónico (DEE POS)</p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Si no estás obligado a facturación electrónica, igual puedes emitir el DEE POS. Ingresa aquí 
                  los datos de tu resolución DIAN para que aparezcan en cada comprobante impreso.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° de resolución DIAN</label>
                  <input value={form.dian_resolution} onChange={e => set('dian_resolution', e.target.value)} placeholder="Ej: 18764063507816"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prefijo</label>
                  <input value={form.dian_prefix} onChange={e => set('dian_prefix', e.target.value)} placeholder="Ej: POS"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Válida hasta</label>
                  <input type="date" value={form.dian_valid_until} onChange={e => set('dian_valid_until', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desde N°</label>
                  <input type="number" min="1" value={form.dian_from} onChange={e => set('dian_from', parseInt(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hasta N°</label>
                  <input type="number" min="1" value={form.dian_to} onChange={e => set('dian_to', parseInt(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                </div>
              </div>
            </>
          )}

          {/* ── Dispositivos ── */}
          {tab === 'dispositivos' && (
            <>
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Printer className="h-4 w-4 text-gray-500" /> Impresora POS-80
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre / Cola de impresión</label>
                    <input value={form.printer_name} onChange={e => set('printer_name', e.target.value)}
                      placeholder="Ej: POS-80, EPSON TM-T20III, \\SERVIDOR\Caja1"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                    <p className="mt-1 text-xs text-gray-400">
                      Configura el nombre exacto de la impresora en tu sistema operativo o red.
                    </p>
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Monedero / Cajón de dinero</h3>
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Apertura automática</p>
                      <p className="text-xs text-gray-500">Abre el cajón al registrar pagos en efectivo</p>
                    </div>
                    <button
                      onClick={() => set('drawer_enabled', !form.drawer_enabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.drawer_enabled ? 'bg-sky-500' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.drawer_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {form.drawer_enabled && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Puerto del cajón</label>
                      <input value={form.drawer_port} onChange={e => set('drawer_port', e.target.value)} placeholder="Ej: COM1, COM3"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                      <p className="mt-1 text-xs text-gray-400">
                        El cajón se abre enviando el pulso ESC/POS al puerto serie configurado. Asegúrate de que el cajón esté conectado a este puerto.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

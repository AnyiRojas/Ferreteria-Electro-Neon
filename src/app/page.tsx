'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ShieldCheck, ShoppingCart, Zap, BarChart3, Package, Delete, X } from 'lucide-react';
import { useMode, type AppMode } from '@/lib/ModeContext';

// ── Teclado numérico PIN ────────────────────────────────────────────────────
function PinPad({
  mode,
  onSuccess,
  onCancel,
}: {
  mode: AppMode;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { validatePin } = useMode();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const isAdmin = mode === 'admin';
  const accent  = isAdmin
    ? 'linear-gradient(135deg, #1F2F98, #787FF6)'
    : 'linear-gradient(135deg, #1CA7EC, #4ADEDE)';

  const press = (digit: string) => {
    if (pin.length >= 6) return;
    const next = pin + digit;
    setPin(next);
    setError(false);

    // Auto-validar cuando se completan 4 dígitos (o hasta 6 si quieren más)
    if (next.length >= 4) {
      setTimeout(() => {
        if (validatePin(mode, next)) {
          onSuccess();
        } else if (next.length === 6) {
          // Llegó al máximo y es incorrecto
          triggerError();
        }
        // Si tiene 4-5 dígitos incorrectos, esperar a que sigan escribiendo o borren
      }, 120);
    }
  };

  const backspace = () => {
    setPin(p => p.slice(0, -1));
    setError(false);
  };

  const triggerError = () => {
    setError(true);
    setShake(true);
    setTimeout(() => { setPin(''); setShake(false); }, 600);
  };

  const handleConfirm = () => {
    if (validatePin(mode, pin)) {
      onSuccess();
    } else {
      triggerError();
    }
  };

  const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    // Overlay oscuro encima de la pantalla de selección
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>

      <div
        className="w-full max-w-xs rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.25)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div className="relative h-1.5 w-full" style={{ background: accent }} />
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: accent }}>
              {isAdmin
                ? <ShieldCheck className="h-4 w-4 text-white" strokeWidth={2} />
                : <ShoppingCart className="h-4 w-4 text-white" strokeWidth={2} />}
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">
                {isAdmin ? 'Administrador' : 'Caja / Vendedor'}
              </p>
              <p className="text-xs text-white/50 mt-0.5">Ingresa tu PIN</p>
            </div>
          </div>
          <button onClick={onCancel}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Puntos del PIN */}
        <div className={`flex justify-center gap-3 py-5 transition-transform ${shake ? 'animate-[shake_0.5s_ease]' : ''}`}
          style={shake ? { animation: 'shake 0.5s ease' } : {}}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-3.5 w-3.5 rounded-full transition-all duration-150"
              style={{
                background: i < pin.length
                  ? (error ? '#f87171' : 'white')
                  : 'rgba(255,255,255,0.2)',
                boxShadow: i < pin.length && !error ? '0 0 8px rgba(255,255,255,0.6)' : 'none',
                transform: i < pin.length ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Mensaje de error */}
        {error && (
          <p className="text-center text-xs font-medium text-red-400 -mt-2 mb-2">
            PIN incorrecto, intenta de nuevo
          </p>
        )}

        {/* Teclado numérico */}
        <div className="grid grid-cols-3 gap-2 px-5 pb-5">
          {KEYS.map((k, i) => {
            if (k === '') return <div key={i} />;
            if (k === '⌫') return (
              <button
                key={i}
                onClick={backspace}
                disabled={pin.length === 0}
                className="flex h-14 items-center justify-center rounded-2xl text-white/70 hover:text-white hover:bg-white/15 active:scale-95 transition-all disabled:opacity-30"
              >
                <Delete className="h-5 w-5" />
              </button>
            );
            return (
              <button
                key={i}
                onClick={() => press(k)}
                className="flex h-14 items-center justify-center rounded-2xl text-xl font-semibold text-white hover:bg-white/20 active:scale-95 active:bg-white/30 transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {k}
              </button>
            );
          })}
        </div>

        {/* Botón Confirmar */}
        <div className="px-5 pb-5">
          <button
            onClick={handleConfirm}
            disabled={pin.length < 4}
            className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-40"
            style={{ background: accent }}
          >
            Confirmar →
          </button>
        </div>
      </div>

      {/* Animación shake */}
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

// ── Página principal de selección de modo ───────────────────────────────────
export default function ModeSelectPage() {
  const router = useRouter();
  const { setMode } = useMode();
  const [pendingMode, setPendingMode] = useState<AppMode | null>(null);

  const handleSuccess = () => {
    if (!pendingMode) return;
    setMode(pendingMode);
    router.push(pendingMode === 'admin' ? '/dashboard' : '/sales');
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col"
      style={{ background: 'linear-gradient(135deg, #1F2F98 0%, #1CA7EC 40%, #4ADEDE 70%, #787FF6 100%)' }}>

      {/* ── Esferas decorativas de fondo ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #7BD5F5 0%, transparent 70%)' }} />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #787FF6 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #4ADEDE 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* ── Barra superior degradada ── */}
      <div className="relative z-10 h-1 w-full"
        style={{ background: 'linear-gradient(90deg, #1F2F98, #787FF6, #4ADEDE, #7BD5F5)' }} />

      {/* ── Contenido principal ── */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12">

        {/* Logo */}
        <div className="mb-10 flex flex-col items-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl blur-2xl opacity-40"
              style={{ background: 'linear-gradient(135deg, #7BD5F5, #787FF6)', transform: 'scale(1.15)' }} />
            <div className="relative rounded-2xl bg-white px-10 py-6"
              style={{ boxShadow: '0 0 60px rgba(28,167,236,0.35), 0 25px 50px rgba(31,47,152,0.3)' }}>
              <Image
                src="/logo-electroneon.png"
                alt="Electro Neon Ferrelectricos"
                width={360}
                height={140}
                priority
                className="object-contain"
                style={{ maxHeight: '140px', width: 'auto' }}
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-full px-5 py-1.5"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)' }}>
            <Zap className="h-3.5 w-3.5 text-white" />
            <span className="text-xs font-bold tracking-widest text-white uppercase">Sistema de Punto de Venta</span>
          </div>
        </div>

        {/* Título */}
        <p className="mb-8 text-sm font-medium tracking-[0.3em] uppercase text-white/70">
          Selecciona tu perfil para continuar
        </p>

        {/* ── Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full" style={{ maxWidth: '620px' }}>

          {/* ADMINISTRADOR */}
          <button
            onClick={() => setPendingMode('admin')}
            className="group relative flex flex-col rounded-2xl p-0 text-left overflow-hidden transition-all duration-300 active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 4px 24px rgba(31,47,152,0.25)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.border = '1px solid rgba(255,255,255,0.5)';
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(31,47,152,0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.border = '1px solid rgba(255,255,255,0.25)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(31,47,152,0.25)';
            }}
          >
            <div className="h-1 w-full"
              style={{ background: 'linear-gradient(90deg, #1F2F98, #787FF6)' }} />

            <div className="flex flex-col items-center gap-4 p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #1F2F98, #787FF6)', boxShadow: '0 4px 20px rgba(120,127,246,0.5)' }}>
                <ShieldCheck className="h-8 w-8 text-white" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white mb-1">Administrador</p>
                <p className="text-xs leading-relaxed text-white/70">
                  Gestión de inventario, reportes, precios y configuración del sistema
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5 w-full">
                {[
                  { icon: Package,     label: 'Inventario' },
                  { icon: BarChart3,   label: 'Reportes' },
                  { icon: ShieldCheck, label: 'Configurar' },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <Icon className="h-3 w-3" />
                    {label}
                  </span>
                ))}
              </div>
              <div className="w-full rounded-xl py-3 text-center text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #1F2F98, #787FF6)', boxShadow: '0 4px 15px rgba(120,127,246,0.4)' }}>
                Ingresar como Administrador
              </div>
            </div>
          </button>

          {/* CAJA / VENTAS */}
          <button
            onClick={() => setPendingMode('caja')}
            className="group relative flex flex-col rounded-2xl p-0 text-left overflow-hidden transition-all duration-300 active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 4px 24px rgba(28,167,236,0.2)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.border = '1px solid rgba(255,255,255,0.5)';
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(28,167,236,0.35)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.border = '1px solid rgba(255,255,255,0.25)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(28,167,236,0.2)';
            }}
          >
            <div className="h-1 w-full"
              style={{ background: 'linear-gradient(90deg, #1CA7EC, #4ADEDE)' }} />

            <div className="flex flex-col items-center gap-4 p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #1CA7EC, #4ADEDE)', boxShadow: '0 4px 20px rgba(74,222,222,0.5)' }}>
                <ShoppingCart className="h-8 w-8 text-white" strokeWidth={2} />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white mb-1">Caja / Vendedor</p>
                <p className="text-xs leading-relaxed text-white/70">
                  Registra ventas, maneja el carrito y cobra a los clientes rápidamente
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5 w-full">
                {[
                  { icon: ShoppingCart, label: 'Ventas' },
                  { icon: Zap,          label: 'Rápido' },
                  { icon: Package,      label: 'Stock' },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <Icon className="h-3 w-3" />
                    {label}
                  </span>
                ))}
              </div>
              <div className="w-full rounded-xl py-3 text-center text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #1CA7EC, #4ADEDE)', boxShadow: '0 4px 15px rgba(74,222,222,0.4)' }}>
                Ingresar como Vendedor
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-10 flex flex-col items-center gap-1">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} Electro Neon Ferrelectricos — Todos los derechos reservados
          </p>
        </div>
      </div>

      {/* Teclado PIN — se muestra encima cuando se elige un modo */}
      {pendingMode && (
        <PinPad
          mode={pendingMode}
          onSuccess={handleSuccess}
          onCancel={() => setPendingMode(null)}
        />
      )}
    </div>
  );
}

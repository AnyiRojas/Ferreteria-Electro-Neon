'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ShoppingCart, Zap, BarChart3, Package } from 'lucide-react';
import { useMode, type AppMode } from '@/lib/ModeContext';

export default function ModeSelectPage() {
  const router = useRouter();
  const { setMode } = useMode();

  const select = (m: AppMode) => {
    setMode(m);
    router.push(m === 'admin' ? '/dashboard' : '/sales');
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col" style={{ backgroundColor: '#111111' }}>

      {/* ── Fondo con gradiente y textura ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Gradiente radial rojo desde arriba */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, #dc2626 0%, transparent 70%)' }} />
        {/* Líneas decorativas */}
        <div className="absolute bottom-0 left-0 w-full h-px opacity-10" style={{ background: 'linear-gradient(90deg, transparent, #dc2626, transparent)' }} />
        {/* Grid sutil */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#dc2626 1px, transparent 1px), linear-gradient(90deg, #dc2626 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* ── Barra superior ── */}
      <div className="relative z-10 h-1 w-full" style={{ background: 'linear-gradient(90deg, #7f1d1d 0%, #dc2626 40%, #ef4444 60%, #7f1d1d 100%)' }} />

      {/* ── Contenido principal ── */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12">

        {/* Logo */}
        <div className="mb-10 flex flex-col items-center">
          <div className="relative">
            {/* Halo detrás del logo */}
            <div className="absolute inset-0 rounded-2xl blur-2xl opacity-30" style={{ background: '#dc2626', transform: 'scale(1.1)' }} />
            <div className="relative rounded-2xl bg-white px-10 py-6 shadow-2xl" style={{ boxShadow: '0 0 60px rgba(220,38,38,0.3), 0 25px 50px rgba(0,0,0,0.6)' }}>
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

          {/* Badge POS */}
          <div className="mt-5 flex items-center gap-2 rounded-full px-5 py-1.5"
            style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.4)' }}>
            <Zap className="h-3.5 w-3.5 text-red-500" />
            <span className="text-xs font-bold tracking-widest text-red-400 uppercase">Sistema de Punto de Venta</span>
          </div>
        </div>

        {/* Título */}
        <p className="mb-8 text-sm font-medium tracking-[0.3em] uppercase" style={{ color: '#6b7280' }}>
          Selecciona tu perfil para continuar
        </p>

        {/* ── Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full" style={{ maxWidth: '620px' }}>

          {/* ADMINISTRADOR */}
          <button
            onClick={() => select('admin')}
            className="group relative flex flex-col rounded-2xl p-0 text-left overflow-hidden transition-all duration-300 active:scale-95"
            style={{
              background: 'linear-gradient(145deg, #1a0505 0%, #1f1f1f 100%)',
              border: '1px solid rgba(220,38,38,0.3)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.border = '1px solid rgba(220,38,38,0.8)';
              e.currentTarget.style.boxShadow = '0 8px 40px rgba(220,38,38,0.25), 0 4px 24px rgba(0,0,0,0.4)';
              e.currentTarget.style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.border = '1px solid rgba(220,38,38,0.3)';
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Franja roja superior */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #dc2626, #ef4444)' }} />

            <div className="flex flex-col items-center gap-4 p-8">
              {/* Ícono */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #7f1d1d, #dc2626)', boxShadow: '0 4px 20px rgba(220,38,38,0.4)' }}>
                <ShieldCheck className="h-8 w-8 text-white" strokeWidth={1.5} />
              </div>

              {/* Texto */}
              <div className="text-center">
                <p className="text-lg font-bold text-white mb-1">Administrador</p>
                <p className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>
                  Gestión de inventario, reportes, precios y configuración del sistema
                </p>
              </div>

              {/* Features */}
              <div className="flex flex-wrap justify-center gap-1.5 w-full">
                {[
                  { icon: Package,   label: 'Inventario' },
                  { icon: BarChart3, label: 'Reportes' },
                  { icon: ShieldCheck, label: 'Configurar' },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ background: 'rgba(220,38,38,0.1)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <Icon className="h-3 w-3" />
                    {label}
                  </span>
                ))}
              </div>

              {/* Botón */}
              <div className="w-full rounded-xl py-3 text-center text-sm font-bold text-white transition-colors"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 4px 15px rgba(220,38,38,0.4)' }}>
                Ingresar como Administrador
              </div>
            </div>
          </button>

          {/* CAJA / VENTAS */}
          <button
            onClick={() => select('caja')}
            className="group relative flex flex-col rounded-2xl p-0 text-left overflow-hidden transition-all duration-300 active:scale-95"
            style={{
              background: 'linear-gradient(145deg, #0f1a0f 0%, #1f1f1f 100%)',
              border: '1px solid rgba(75,85,99,0.4)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.border = '1px solid rgba(156,163,175,0.7)';
              e.currentTarget.style.boxShadow = '0 8px 40px rgba(156,163,175,0.1), 0 4px 24px rgba(0,0,0,0.4)';
              e.currentTarget.style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.border = '1px solid rgba(75,85,99,0.4)';
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Franja gris superior */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #374151, #9ca3af)' }} />

            <div className="flex flex-col items-center gap-4 p-8">
              {/* Ícono */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #374151, #6b7280)', boxShadow: '0 4px 20px rgba(107,114,128,0.3)' }}>
                <ShoppingCart className="h-8 w-8 text-white" strokeWidth={1.5} />
              </div>

              {/* Texto */}
              <div className="text-center">
                <p className="text-lg font-bold text-white mb-1">Caja / Vendedor</p>
                <p className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>
                  Registra ventas, maneja el carrito y cobra a los clientes rápidamente
                </p>
              </div>

              {/* Features */}
              <div className="flex flex-wrap justify-center gap-1.5 w-full">
                {[
                  { icon: ShoppingCart, label: 'Ventas' },
                  { icon: Zap,          label: 'Rápido' },
                  { icon: Package,      label: 'Stock' },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ background: 'rgba(107,114,128,0.15)', color: '#d1d5db', border: '1px solid rgba(107,114,128,0.3)' }}>
                    <Icon className="h-3 w-3" />
                    {label}
                  </span>
                ))}
              </div>

              {/* Botón */}
              <div className="w-full rounded-xl py-3 text-center text-sm font-bold text-white transition-colors"
                style={{ background: 'linear-gradient(135deg, #374151, #1f2937)', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', border: '1px solid rgba(107,114,128,0.4)' }}>
                Ingresar como Vendedor
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-10 flex flex-col items-center gap-1">
          <p className="text-xs" style={{ color: '#374151' }}>
            © {new Date().getFullYear()} Electro Neon Ferrelectricos — Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
}

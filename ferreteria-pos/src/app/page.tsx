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
    <div className="min-h-screen relative overflow-hidden flex flex-col"
      style={{ background: 'linear-gradient(135deg, #1F2F98 0%, #1CA7EC 40%, #4ADEDE 70%, #787FF6 100%)' }}>

      {/* ── Esferas decorativas de fondo ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Esfera grande superior izquierda */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #7BD5F5 0%, transparent 70%)' }} />
        {/* Esfera media inferior derecha */}
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #787FF6 0%, transparent 70%)' }} />
        {/* Esfera pequeña centro */}
        <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #4ADEDE 0%, transparent 70%)' }} />
        {/* Grid sutil */}
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
            {/* Halo detrás del logo */}
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

          {/* Badge POS */}
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
            onClick={() => select('admin')}
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
            {/* Franja superior */}
            <div className="h-1 w-full"
              style={{ background: 'linear-gradient(90deg, #1F2F98, #787FF6)' }} />

            <div className="flex flex-col items-center gap-4 p-8">
              {/* Ícono */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #1F2F98, #787FF6)', boxShadow: '0 4px 20px rgba(120,127,246,0.5)' }}>
                <ShieldCheck className="h-8 w-8 text-white" strokeWidth={1.5} />
              </div>

              {/* Texto */}
              <div className="text-center">
                <p className="text-lg font-bold text-white mb-1">Administrador</p>
                <p className="text-xs leading-relaxed text-white/70">
                  Gestión de inventario, reportes, precios y configuración del sistema
                </p>
              </div>

              {/* Features */}
              <div className="flex flex-wrap justify-center gap-1.5 w-full">
                {[
                  { icon: Package,    label: 'Inventario' },
                  { icon: BarChart3,  label: 'Reportes' },
                  { icon: ShieldCheck, label: 'Configurar' },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <Icon className="h-3 w-3" />
                    {label}
                  </span>
                ))}
              </div>

              {/* Botón */}
              <div className="w-full rounded-xl py-3 text-center text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #1F2F98, #787FF6)', boxShadow: '0 4px 15px rgba(120,127,246,0.4)' }}>
                Ingresar como Administrador
              </div>
            </div>
          </button>

          {/* CAJA / VENTAS */}
          <button
            onClick={() => select('caja')}
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
            {/* Franja superior */}
            <div className="h-1 w-full"
              style={{ background: 'linear-gradient(90deg, #1CA7EC, #4ADEDE)' }} />

            <div className="flex flex-col items-center gap-4 p-8">
              {/* Ícono */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #1CA7EC, #4ADEDE)', boxShadow: '0 4px 20px rgba(74,222,222,0.5)' }}>
                <ShoppingCart className="h-8 w-8 text-white" strokeWidth={1.5} />
              </div>

              {/* Texto */}
              <div className="text-center">
                <p className="text-lg font-bold text-white mb-1">Caja / Vendedor</p>
                <p className="text-xs leading-relaxed text-white/70">
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
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <Icon className="h-3 w-3" />
                    {label}
                  </span>
                ))}
              </div>

              {/* Botón */}
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
    </div>
  );
}

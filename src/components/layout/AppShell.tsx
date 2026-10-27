'use client';

import { useEffect, useRef, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { usePathname, useRouter } from 'next/navigation';
import { useMode } from '@/lib/ModeContext';

const TITLES: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/inventory':   'Inventario',
  '/sales':       'Punto de Venta',
  '/reports':     'Reportes',
  '/accounting':  'Contabilidad',
  '/settings':    'Configuración',
  '/customers':   'Clientes',
  '/suppliers':   'Proveedores',
  '/quotes':      'Cotizaciones',
  '/returns':     'Devoluciones',
  '/cash-register': 'Caja',
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const mainRef = useRef<HTMLElement>(null);
  const { mode } = useMode();

  // Protección: si no hay modo activo, redirigir al inicio (pedir PIN)
  useEffect(() => {
    if (mode === null) {
      router.replace('/');
    }
  }, [mode, router]);

  const title =
    Object.entries(TITLES).find(([key]) => pathname.startsWith(key))?.[1] ??
    'Ferretería POS';

  // Resetear scroll del área principal al cambiar de página
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
        />
        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
        {/* Pie de página */}
        <footer className="shrink-0 border-t border-gray-100 bg-white px-6 py-2 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Ferretería POS
          </p>
          <p className="text-xs text-gray-400">
            <span className="font-semibold text-gray-600">Anyi Rojas</span>
            {' '}&{' '}
            <span className="font-semibold text-gray-600">Julián Correa</span>
          </p>
        </footer>
      </div>
    </div>
  );
}

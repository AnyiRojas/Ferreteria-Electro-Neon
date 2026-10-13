'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { usePathname } from 'next/navigation';

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventario',
  '/sales': 'Punto de Venta',
  '/reports': 'Reportes',
  '/settings': 'Configuración',
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const title =
    Object.entries(TITLES).find(([key]) => pathname.startsWith(key))?.[1] ??
    'Ferretería POS';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

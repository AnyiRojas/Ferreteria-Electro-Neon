'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  X,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMode } from '@/lib/ModeContext';

// Navegación completa — solo visible en modo Admin
const ADMIN_NAV = [
  { href: '/dashboard', label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventario',     icon: Package },
  { href: '/sales',     label: 'Punto de Venta', icon: ShoppingCart },
  { href: '/reports',   label: 'Reportes',       icon: BarChart3 },
];

// Navegación reducida — modo Caja
const CAJA_NAV = [
  { href: '/sales', label: 'Punto de Venta', icon: ShoppingCart },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { mode, clearMode } = useMode();

  const navItems = mode === 'caja' ? CAJA_NAV : ADMIN_NAV;

  const handleExit = () => {
    clearMode();
    onClose();
    router.push('/');
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-gray-900 transition-transform duration-300 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-700">
          <div className="flex items-center gap-2.5">
            {/* Logo real en miniatura con fondo blanco */}
            <div className="flex h-9 w-auto shrink-0 items-center justify-center rounded-md bg-white px-1.5 py-1">
              <Image
                src="/logo-electroneon.png"
                alt="Electro Neon"
                width={80}
                height={28}
                className="object-contain"
                style={{ height: '28px', width: 'auto' }}
              />
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modo badge */}
        <div className="px-4 py-3 border-b border-gray-700">
          <div className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold',
            mode === 'caja'
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
          )}>
            {mode === 'caja'
              ? <ShoppingCart className="h-3.5 w-3.5" />
              : <ShieldCheck className="h-3.5 w-3.5" />
            }
            {mode === 'caja' ? 'Modo Caja' : 'Modo Administrador'}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    prefetch={true}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-700 px-3 py-3 space-y-1">
          <button
            onClick={handleExit}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Cambiar modo
          </button>
          <p className="text-xs text-gray-600 px-3 pt-1">© 2024 Ferretería POS v1.0</p>
        </div>
      </aside>
    </>
  );
}

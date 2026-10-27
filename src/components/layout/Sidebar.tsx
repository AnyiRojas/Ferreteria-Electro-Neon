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
  Users,
  Truck,
  DollarSign,
  Settings,
  RotateCcw,
  FileText,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMode } from '@/lib/ModeContext';

// Navegación completa — modo Admin
const ADMIN_NAV = [
  { href: '/dashboard',      label: 'Dashboard',       icon: LayoutDashboard, group: null },
  { href: '/sales',          label: 'Punto de Venta',  icon: ShoppingCart,    group: 'Ventas' },
  { href: '/cash-register',  label: 'Caja',            icon: DollarSign,      group: 'Ventas' },
  { href: '/inventory',      label: 'Inventario',      icon: Package,         group: 'Tienda' },
  { href: '/customers',      label: 'Clientes',        icon: Users,           group: 'Tienda' },
  { href: '/suppliers',      label: 'Proveedores',     icon: Truck,           group: 'Tienda' },
  { href: '/quotes',         label: 'Cotizaciones',    icon: FileText,        group: 'Extras' },
  { href: '/returns',        label: 'Devoluciones',    icon: RotateCcw,       group: 'Extras' },
  { href: '/reports',        label: 'Reportes',        icon: BarChart3,       group: 'Admin' },
  { href: '/accounting',     label: 'Contabilidad',    icon: BookOpen,        group: 'Admin' },
  { href: '/settings',       label: 'Configuración',   icon: Settings,        group: 'Admin' },
];

// Navegación reducida — modo Caja (cajero)
const CAJA_NAV = [
  { href: '/sales',         label: 'Punto de Venta', icon: ShoppingCart,   group: null },
  { href: '/cash-register', label: 'Caja',           icon: DollarSign,     group: null },
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
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col transition-transform duration-300 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'linear-gradient(180deg, #1F2F98 0%, #1a2580 100%)' }}
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
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold',
          )}
          style={
            mode === 'caja'
              ? { background: 'rgba(74,222,222,0.15)', color: '#4ADEDE', border: '1px solid rgba(74,222,222,0.3)' }
              : { background: 'rgba(120,127,246,0.2)', color: '#a5b4fc', border: '1px solid rgba(120,127,246,0.3)' }
          }>
            {mode === 'caja'
              ? <ShoppingCart className="h-3.5 w-3.5" />
              : <ShieldCheck className="h-3.5 w-3.5" />
            }
            {mode === 'caja' ? 'Modo Caja' : 'Modo Administrador'}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {(() => {
            const groups: string[] = [];
            navItems.forEach(({ group }) => {
              if (group && !groups.includes(group)) groups.push(group);
            });
            const noGroup = navItems.filter(i => !i.group);
            const sections: { label: string | null; items: typeof navItems }[] = [
              { label: null, items: noGroup },
              ...groups.map(g => ({ label: g, items: navItems.filter(i => i.group === g) })),
            ];
            return sections.map(({ label, items }) => (
              <div key={label ?? '__top'}>
                {label && (
                  <p className="mt-3 mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {label}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {items.map(({ href, label: itemLabel, icon: Icon }) => {
                    const active = pathname === href || pathname.startsWith(href + '/');
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          onClick={onClose}
                          prefetch={true}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                          )}
                          style={active
                            ? { background: 'linear-gradient(90deg, #1CA7EC, #4ADEDE)', color: 'white', boxShadow: '0 2px 12px rgba(28,167,236,0.4)' }
                            : { color: 'rgba(255,255,255,0.6)' }
                          }
                          onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
                          onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; } }}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          {itemLabel}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ));
          })()}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={handleExit}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Cambiar modo
          </button>
          <p className="text-xs px-3 pt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>© 2024 Ferretería POS v1.0</p>
        </div>
      </aside>
    </>
  );
}

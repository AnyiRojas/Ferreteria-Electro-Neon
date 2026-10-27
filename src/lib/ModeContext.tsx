'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type AppMode = 'admin' | 'caja';

interface ModeContextType {
  mode: AppMode | null;
  setMode: (m: AppMode) => void;
  clearMode: () => void;
  /** Valida el PIN contra las variables de entorno. Devuelve true si es correcto. */
  validatePin: (m: AppMode, pin: string) => boolean;
}

const ModeContext = createContext<ModeContextType>({
  mode: null,
  setMode: () => {},
  clearMode: () => {},
  validatePin: () => false,
});

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppMode | null>(null);
  const [mounted, setMounted] = useState(false);

  // Leer del sessionStorage al montar — evita mismatch SSR/cliente
  useEffect(() => {
    const saved = sessionStorage.getItem('pos_mode') as AppMode | null;
    if (saved === 'admin' || saved === 'caja') setModeState(saved);
    setMounted(true);
  }, []);

  const setMode = (m: AppMode) => {
    sessionStorage.setItem('pos_mode', m);
    setModeState(m);
  };

  const clearMode = () => {
    sessionStorage.removeItem('pos_mode');
    setModeState(null);
  };

  /**
   * Compara el PIN ingresado con las variables de entorno.
   * NEXT_PUBLIC_PIN_ADMIN  — PIN del modo Administrador
   * NEXT_PUBLIC_PIN_CAJA   — PIN del modo Caja/Vendedor
   *
   * Si la variable NO está definida, cualquier PIN es aceptado
   * (permite usar la app sin configurar PINs).
   */
  const validatePin = (m: AppMode, pin: string): boolean => {
    const expected =
      m === 'admin'
        ? process.env.NEXT_PUBLIC_PIN_ADMIN
        : process.env.NEXT_PUBLIC_PIN_CAJA;

    // Si no hay PIN configurado, dejar pasar
    if (!expected) return true;
    return pin === expected;
  };

  const value = { mode: mounted ? mode : null, setMode, clearMode, validatePin };

  return (
    <ModeContext.Provider value={value}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}

'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type AppMode = 'admin' | 'caja';

interface ModeContextType {
  mode: AppMode | null;
  setMode: (m: AppMode) => void;
  clearMode: () => void;
}

const ModeContext = createContext<ModeContextType>({
  mode: null,
  setMode: () => {},
  clearMode: () => {},
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

  // Durante SSR y el primer render en cliente usamos null (sin restricciones)
  const value = { mode: mounted ? mode : null, setMode, clearMode };

  return (
    <ModeContext.Provider value={value}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}

'use client';

import {
  createContext, useContext, useCallback,
  useEffect, useState, useRef,
} from 'react';
import type { CartItem, Product } from '@/types';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface CartContextType {
  cart: CartItem[];
  discount: number;
  addToCart: (product: Product) => void;
  updateQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  setDiscount: (d: number) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
}

const CartContext = createContext<CartContextType>({
  cart: [],
  discount: 0,
  addToCart: () => {},
  updateQty: () => {},
  removeFromCart: () => {},
  setDiscount: () => {},
  clearCart: () => {},
  itemCount: 0,
  total: 0,
});

const STORAGE_KEY = 'pos_cart';
const DISCOUNT_KEY = 'pos_discount';

// ─── Provider ────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCartState] = useState<CartItem[]>([]);
  const [discount, setDiscountState] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  // ref para no persistir antes de hidratar
  const hydratedRef = useRef(false);

  // Hidratar desde sessionStorage una vez en cliente
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setCartState(JSON.parse(raw));
      const disc = sessionStorage.getItem(DISCOUNT_KEY);
      if (disc) setDiscountState(Number(disc));
    } catch { /* sessionStorage no disponible */ }
    hydratedRef.current = true;
    setHydrated(true);
  }, []);

  // Persistir cart cada vez que cambia (después de hidratar)
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch { /* ignorar */ }
  }, [cart]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      sessionStorage.setItem(DISCOUNT_KEY, String(discount));
    } catch { /* ignorar */ }
  }, [discount]);

  // ── Operaciones del carrito ─────────────────────────────────────────────
  const addToCart = useCallback((product: Product) => {
    setCartState(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_price }
            : i
        );
      }
      return [...prev, { product, quantity: 1, unit_price: product.price, subtotal: product.price }];
    });
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCartState(prev => prev.filter(i => i.product.id !== productId));
      return;
    }
    setCartState(prev =>
      prev.map(i =>
        i.product.id === productId
          ? { ...i, quantity: qty, subtotal: qty * i.unit_price }
          : i
      )
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCartState(prev => prev.filter(i => i.product.id !== productId));
  }, []);

  const setDiscount = useCallback((d: number) => {
    setDiscountState(d);
  }, []);

  const clearCart = useCallback(() => {
    setCartState([]);
    setDiscountState(0);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(DISCOUNT_KEY);
    } catch { /* ignorar */ }
  }, []);

  // ── Valores derivados ───────────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      cart,
      discount,
      addToCart,
      updateQty,
      removeFromCart,
      setDiscount,
      clearCart,
      itemCount,
      total,
    }}>
      {/* No renderizar hijos hasta hidratar para evitar mismatch SSR */}
      {hydrated ? children : null}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ModeProvider } from '@/lib/ModeContext';
import { CartProvider } from '@/lib/CartContext';
import FloatingCart from '@/components/sales/FloatingCart';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ferretería POS',
  description: 'Sistema de punto de venta para ferretería',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <ModeProvider>
          <CartProvider>
            {children}
            <FloatingCart />
          </CartProvider>
        </ModeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/components/CartContext';
import { ConditionalHeader } from '@/components/ConditionalHeader';
import { ConditionalFooter } from '@/components/ConditionalFooter';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Fastget - Building Materials Delivered in 30-60 Minutes',
  description: 'Urgent building materials delivered to your Mumbai site. Carpentry, plumbing, hardware supplies for contractors and workers in Andheri, Goregaon, and Malad.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <CartProvider>
          <ConditionalHeader />
          <main className="flex-grow">
            {children}
          </main>
          <ConditionalFooter />
        </CartProvider>
      </body>
    </html>
  );
}

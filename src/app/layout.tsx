import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/components/CartContext';
import { ToastProvider } from '@/components/ToastContext';
import { UserProvider } from '@/components/UserContext';
import { LocationSplashProvider } from '@/components/LocationSplashContext';
import { ConditionalHeader } from '@/components/ConditionalHeader';
import { ConditionalFooter } from '@/components/ConditionalFooter';
import { AnnouncementBar } from '@/components/AnnouncementBar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FastGet — Construction Materials Delivered Fast in Mumbai',
  description:
    'Urgent building materials delivered to your Mumbai site in 30–60 minutes. Carpentry, plumbing, hardware, electrical supplies for contractors in Andheri, Goregaon & Malad.',
  keywords: 'construction materials Mumbai, building materials delivery, carpentry plumbing hardware electrical, Andheri, Goregaon, Malad',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <UserProvider>
          <CartProvider>
            <ToastProvider>
              <LocationSplashProvider>
                <AnnouncementBar />
                <ConditionalHeader />
                <main className="flex-grow">
                  {children}
                </main>
                <ConditionalFooter />
              </LocationSplashProvider>
            </ToastProvider>
          </CartProvider>
        </UserProvider>
      </body>
    </html>
  );
}

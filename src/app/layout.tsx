import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/components/CartContext';
import { ToastProvider } from '@/components/ToastContext';
import { UserProvider } from '@/components/UserContext';
import { WishlistProvider } from '@/components/WishlistContext';
import { LocationSplashProvider } from '@/components/LocationSplashContext';
import { ConditionalHeader } from '@/components/ConditionalHeader';
import { ConditionalFooter } from '@/components/ConditionalFooter';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { AnnouncementBar } from '@/components/AnnouncementBar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://fastget.in'),
  title: 'FastGet',
  description:
    'Urgent building materials delivered to your Mumbai site in 60 minutes. Carpentry, plumbing, hardware, electrical supplies for contractors in Andheri, Goregaon & Malad.',
  keywords: 'construction materials Mumbai, building materials delivery, carpentry plumbing hardware electrical, Andheri, Goregaon, Malad',
  manifest: '/manifest.webmanifest',
  themeColor: '#f97316',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FastGet',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <UserProvider>
          <WishlistProvider>
          <CartProvider>
            <ToastProvider>
              <LocationSplashProvider>
                <AnnouncementBar />
                <ConditionalHeader />
                <main className="flex-grow flex flex-col" style={{ paddingBottom: 'var(--bottom-nav-space)' }}>
                  {children}
                </main>
                <div className="hidden md:block">
                  <ConditionalFooter />
                </div>
                <MobileBottomNav />
              </LocationSplashProvider>
            </ToastProvider>
          </CartProvider>
          </WishlistProvider>
        </UserProvider>
      </body>
    </html>
  );
}

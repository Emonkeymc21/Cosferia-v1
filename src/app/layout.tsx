import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Noto_Sans_JP } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ToastProvider } from '@/components/ui/Toast';
import { getCurrentUser } from '@/lib/auth';
import './globals.css';

// next/font autohostea las tipografias: sin request a Google en runtime
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
const jp = Noto_Sans_JP({ subsets: ['latin'], variable: '--font-jp', display: 'swap', weight: ['400', '700'] });

export const metadata: Metadata = {
  title: 'Cosferia — Marketplace de cosplay · Mendoza',
  description:
    'Compra y vende cosplay hecho a mano en Mendoza. Cosmakers, wigmakers, props y segunda mano.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Cosferia' },
  openGraph: { type: 'website', locale: 'es_AR', siteName: 'Cosferia' },
};

export const viewport: Viewport = {
  themeColor: '#0D0E12',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="es-AR" className={`${inter.variable} ${mono.variable} ${jp.variable}`}>
      <body className="font-sans min-h-screen">
        <ToastProvider>
          <Header user={user} />
          <main className="max-w-7xl mx-auto px-4 pb-safe">{children}</main>
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}

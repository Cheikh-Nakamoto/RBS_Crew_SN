import type { Metadata } from 'next';
import { Archivo_Black, Inter } from 'next/font/google';
import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { TokenGuard } from '@/components/auth/token-guard';

const archivoBlack = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-archivo',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { template: '%s | RBS Crew SN', default: 'RBS Crew SN — Graffiti & Art Urbain, Dakar' },
  description:
    'RBS Crew SN — Collectif de graffiti et d\'art urbain fondé en 2012 à Dakar, Sénégal. Sérigraphie, fresques murales, festival Last Wall Tour.',
  keywords: ['graffiti', 'art urbain', 'Dakar', 'Sénégal', 'RBS Crew', 'Last Wall Tour', 'sérigraphie'],
  openGraph: {
    type: 'website',
    locale: 'fr_SN',
    siteName: 'RBS Crew SN',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${archivoBlack.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground noise-overlay">
        <SessionProvider>
          <TokenGuard />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}

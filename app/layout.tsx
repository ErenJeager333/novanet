import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import ThemeProvider from '@/components/layout/ThemeProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://novanet.app'),
  title: {
    default: 'NovaNet – Connecte. Crée. Évolue.',
    template: '%s | NovaNet',
  },
  description: 'NovaNet est le réseau social éthique qui combine le meilleur des réseaux sociaux — sans toxicité, addiction ou surveillance.',
  keywords: ['réseau social', 'NovaNet', 'social éthique', 'connect'],
  authors: [{ name: 'NovaNet Team' }],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: '/',
    siteName: 'NovaNet',
    title: 'NovaNet – Connecte. Crée. Évolue.',
    description: 'Le réseau social éthique sans publicité ni toxicité.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'NovaNet' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NovaNet – Connecte. Crée. Évolue.',
    description: 'Le réseau social éthique pour de vraies connexions.',
    images: ['/og-image.png'],
  },
  icons: { icon: '/logo.png', apple: '/logo.png' },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#030712' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#1e1b4b',
                color: '#f0f4ff',
                borderRadius: '12px',
                fontSize: '14px',
              },
            }}
          />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
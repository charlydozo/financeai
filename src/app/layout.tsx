import type { Metadata } from 'next';
import { Inter, DM_Sans, Syne, Space_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/Providers';

// Keep Inter for backward compat with Tailwind font-sans classes
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Dozanta', template: '%s | Dozanta' },
  description: 'Plateforme de trading intelligente propulsée par IA',
  icons: { icon: '/logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <head>
        {/* Anti-FOUC: apply stored theme class before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('dozanta-theme');if(t==='light'){document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');}})();`,
          }}
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css"
        />
      </head>
      <body className={`${inter.variable} ${dmSans.variable} ${syne.variable} ${spaceMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

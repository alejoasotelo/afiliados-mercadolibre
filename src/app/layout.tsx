import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';

const inter = Inter({ subsets: ['latin'] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tienda.alejosotelo.com.ar';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Mejores Productos MercadoLibre';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Los mejores productos con reseñas reales`,
    template: `%s | ${SITE_NAME}`,
  },
  description: 'Encontrá los mejores productos en MercadoLibre con reseñas reales de compradores. Comparativas, análisis y recomendaciones para hacer la mejor compra.',
  keywords: ['mercadolibre', 'mejores productos', 'reseñas', 'comparativas', 'afiliados'],
  authors: [{ name: 'Alejo Sotelo', url: SITE_URL }],
  creator: 'Alejo Sotelo',
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Los mejores productos con reseñas reales`,
    description: 'Encontrá los mejores productos en MercadoLibre con reseñas reales.',
    images: [{ url: `${SITE_URL}/og-default.jpg`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: 'Los mejores productos de MercadoLibre con reseñas reales.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: { canonical: SITE_URL },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body className={inter.className}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <footer className="bg-gray-800 text-gray-400 py-10 mt-16">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm">
            <p className="mb-2">
              Este sitio participa del Programa de Afiliados de MercadoLibre.{' '}
              <br className="hidden sm:block" />
              Al hacer clic en los links podés ayudarnos a seguir generando contenido de calidad, sin costo adicional para vos.
            </p>
            <p className="text-gray-600">© {new Date().getFullYear()} {SITE_NAME}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

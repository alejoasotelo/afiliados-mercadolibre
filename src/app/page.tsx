import Link from 'next/link';
import { getProductos } from '@/lib/sheets';
import { enriquecerProducto, agruparPorCategoria } from '@/lib/mercadolibre';
import { ProductCard } from '@/components/ProductCard';
import { JsonLd } from '@/components/JsonLd';

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tienda.alejosotelo.com.ar';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Mejores Productos MercadoLibre';

export default async function HomePage() {
  const productosSheet = await getProductos();
  const productos = await Promise.all(productosSheet.map(enriquecerProducto));
  const categorias = agruparPorCategoria(productos);

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
  };

  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
  };

  return (
    <>
      <JsonLd data={websiteSchema} />
      <JsonLd data={orgSchema} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-ml-blue to-blue-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Los mejores productos de MercadoLibre
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Recomendaciones con reseñas reales de compradores verificados. Comprá con confianza.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {Array.from(categorias.entries()).slice(0, 8).map(([slug, { categoria }]) => (
              <Link
                key={slug}
                href={`/${slug}`}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
              >
                {categoria.nombre}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categorías */}
      {Array.from(categorias.entries()).map(([slug, { categoria, productos: prods }]) => (
        <section key={slug} className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-gray-900">{categoria.nombre}</h2>
            <Link href={`/${slug}`} className="text-sm text-ml-blue font-medium hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
            {prods.slice(0, 4).map((p) => (
              <ProductCard key={p.slug} producto={p} />
            ))}
          </div>
        </section>
      ))}

      {productos.length === 0 && (
        <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-400">
          <p className="text-4xl mb-4">🛒</p>
          <p>Todavía no hay productos publicados. Agregá uno en el Google Sheet.</p>
        </div>
      )}

      {/* Trust */}
      <section className="bg-blue-50 py-12 px-4 mt-8">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-8 text-center">
          {[
            { icon: '✅', title: 'Reseñas verificadas', desc: 'Opiniones reales de compradores en MercadoLibre' },
            { icon: '🔒', title: 'Compra segura', desc: 'Todos los productos se compran directamente en ML' },
            { icon: '🚀', title: 'Envío rápido', desc: 'Muchos productos con envío gratis y entrega rápida' },
          ].map((item) => (
            <div key={item.title}>
              <div className="text-4xl mb-3">{item.icon}</div>
              <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

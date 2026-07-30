export const runtime = 'edge';

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProductos } from '@/lib/sheets';
import { enriquecerProducto, agruparPorCategoria } from '@/lib/mercadolibre';
import { ProductCard } from '@/components/ProductCard';
import { JsonLd, buildBreadcrumbSchema, buildItemListSchema } from '@/components/JsonLd';

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tienda.alejosotelo.com.ar';

// ─── Rutas estáticas: una por cada categoría detectada en ML ─────────────────
export async function generateStaticParams() {
  try {
    const productosSheet = await getProductos();
    const todos = await Promise.all(productosSheet.map(enriquecerProducto));
    const categorias = agruparPorCategoria(todos);
    return Array.from(categorias.keys()).map((slug) => ({ categoria: slug }));
  } catch {
    return [];
  }
}

// ─── Meta tags ────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: { categoria: string } }): Promise<Metadata> {
  const productosSheet = await getProductos();
  const todos = await Promise.all(productosSheet.map(enriquecerProducto));
  const categorias = agruparPorCategoria(todos);
  const entry = categorias.get(params.categoria);
  if (!entry) return {};

  const { categoria } = entry;
  const url = `${SITE_URL}/${categoria.slug}`;
  return {
    title: categoria.nombre,
    description: `Los mejores ${categoria.nombre} en MercadoLibre. Comparativas, precios y reseñas reales de compradores verificados.`,
    alternates: { canonical: url },
    openGraph: { title: categoria.nombre, url, type: 'website' },
  };
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default async function CategoriaPage({ params }: { params: { categoria: string } }) {
  const productosSheet = await getProductos();
  const todos = await Promise.all(productosSheet.map(enriquecerProducto));
  const categorias = agruparPorCategoria(todos);
  const entry = categorias.get(params.categoria);

  if (!entry) notFound();

  const { categoria, productos } = entry;
  const url = `${SITE_URL}/${categoria.slug}`;

  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: SITE_URL },
    { name: categoria.nombre, url },
  ]);

  const itemList = buildItemListSchema(
    categoria.nombre,
    productos.map((p) => ({
      nombre: p.nombre,
      url: `${SITE_URL}/${p.categoria.slug}/${p.slug}`,
      imagen: p.imagenes[0],
    }))
  );

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={itemList} />

      <section className="bg-white border-b border-gray-100 py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <nav className="text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1">
              <li><a href="/" className="hover:text-ml-blue">Inicio</a></li>
              <li className="text-gray-300">/</li>
              <li className="font-medium text-gray-900">{categoria.nombre}</li>
            </ol>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{categoria.nombre}</h1>
          <p className="text-gray-600 max-w-2xl">
            {productos.length} productos seleccionados con reseñas reales de compradores verificados en MercadoLibre Argentina.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
          {productos.map((p) => (
            <ProductCard key={p.slug} producto={p} />
          ))}
        </div>
      </section>
    </>
  );
}

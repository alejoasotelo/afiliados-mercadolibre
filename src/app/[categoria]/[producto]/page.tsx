export const runtime = 'edge';

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getProductos, getProducto } from '@/lib/sheets';
import { enriquecerProducto, buildAffiliateLink } from '@/lib/mercadolibre';
import { JsonLd, buildProductSchema, buildBreadcrumbSchema } from '@/components/JsonLd';

export const revalidate = 1800;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tienda.alejosotelo.com.ar';

// ─── Rutas estáticas ──────────────────────────────────────────────────────────
export async function generateStaticParams() {
  try {
    const productosSheet = await getProductos();
    const todos = await Promise.all(productosSheet.map(enriquecerProducto));
    return todos.map((p) => ({ categoria: p.categoria.slug, producto: p.slug }));
  } catch {
    return [];
  }
}

// ─── Meta tags ────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: { categoria: string; producto: string } }): Promise<Metadata> {
  const sheet = await getProducto(params.producto);
  if (!sheet) return {};
  const prod = await enriquecerProducto(sheet);
  const url = `${SITE_URL}/${prod.categoria.slug}/${prod.slug}`;
  const imagen = prod.imagenes[0] ?? `${SITE_URL}/og-default.jpg`;

  return {
    title: prod.titulo,
    description: prod.descripcion.slice(0, 160),
    alternates: { canonical: url },
    openGraph: {
      title: prod.titulo,
      description: prod.descripcion.slice(0, 200),
      url,
      type: 'website',
      images: [{ url: imagen, width: 800, height: 800, alt: prod.titulo }],
    },
    other: {
      'product:condition':    'new',
      'product:availability': 'in stock',
      ...(prod.marca && { 'product:brand': prod.marca }),
    },
  };
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default async function ProductoPage({ params }: { params: { categoria: string; producto: string } }) {
  const sheet = await getProducto(params.producto);
  if (!sheet) notFound();

  const prod = await enriquecerProducto(sheet);
  if (prod.categoria.slug !== params.categoria) notFound();

  const url = `${SITE_URL}/${prod.categoria.slug}/${prod.slug}`;
  const imagen = prod.imagenes[0] ?? `${SITE_URL}/og-default.jpg`;

  const productSchema = buildProductSchema({
    nombre: prod.titulo,
    descripcion: prod.descripcion,
    imagen,
    precio: prod.precio,
    moneda: prod.moneda,
    condicion: prod.condicion,
    marca: prod.marca || undefined,
    sku: prod.slug,
    url,
  });

  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: SITE_URL },
    { name: prod.categoria.nombre, url: `${SITE_URL}/${prod.categoria.slug}` },
    { name: prod.titulo, url },
  ]);

  // Productos relacionados
  const todosLosProductos = prod.relacionados.length > 0 ? await getProductos() : [];
  const relacionados = todosLosProductos
    .filter((p) => prod.relacionados.includes(p.slug))
    .slice(0, 4);

  return (
    <>
      <JsonLd data={productSchema} />
      <JsonLd data={breadcrumb} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1 flex-wrap">
            <li><Link href="/" className="hover:text-ml-blue">Inicio</Link></li>
            <li className="text-gray-300">/</li>
            <li><Link href={`/${prod.categoria.slug}`} className="hover:text-ml-blue">{prod.categoria.nombre}</Link></li>
            <li className="text-gray-300">/</li>
            <li className="text-gray-900 font-medium truncate max-w-xs">{prod.titulo}</li>
          </ol>
        </nav>

        <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
          {/* Galería */}
          <div>
            <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-3">
              <Image
                src={imagen}
                alt={prod.titulo}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain p-6"
                priority
              />
            </div>
            {prod.imagenes.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {prod.imagenes.map((img, i) => (
                  <div key={i} className="relative w-16 h-16 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden border-2 border-gray-100 hover:border-ml-blue">
                    <Image src={img} alt={`${prod.titulo} ${i + 1}`} fill sizes="64px" className="object-contain p-1" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              {prod.marca && <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{prod.marca}</span>}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 leading-tight">
              {prod.titulo}
            </h1>

            <a
              href={buildAffiliateLink(prod.urlMl)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="btn-ml text-lg py-4 px-8 w-full justify-center mb-4"
            >
              🛒 Comprar en MercadoLibre
            </a>
            <p className="text-xs text-gray-400 text-center mb-8">
              Al hacer clic vas a MercadoLibre. Este sitio recibe una comisión de afiliado sin costo para vos.
            </p>

            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
              <h2 className="text-lg font-bold text-gray-900 mb-2">¿Por qué recomendamos este producto?</h2>
              <p className="whitespace-pre-line">{prod.descripcion}</p>
            </div>
          </div>
        </div>

        {/* Productos relacionados */}
        {relacionados.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Productos relacionados</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {relacionados.map((rel) => {
                const img = rel.imagenes[0];
                return (
                  <Link
                    key={rel.slug}
                    href={`/productos/${rel.slug}`}
                    className="group bg-white rounded-xl border border-gray-100 hover:border-ml-blue hover:shadow-md transition-all p-3"
                  >
                    {img && (
                      <div className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden mb-2">
                        <Image src={img} alt={rel.titulo} fill sizes="200px" className="object-contain p-2 group-hover:scale-105 transition-transform" />
                      </div>
                    )}
                    <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">{rel.titulo}</p>
                    {rel.marca && <p className="text-xs text-gray-400 mt-1">{rel.marca}</p>}
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

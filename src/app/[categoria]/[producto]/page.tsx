import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getProductos, getProducto } from '@/lib/sheets';
import { enriquecerProducto, agruparPorCategoria } from '@/lib/mercadolibre';
import { StarRating } from '@/components/StarRating';
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
    // Si la API no está disponible en build time, las páginas se generan on-demand
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
    title: prod.nombre,
    description: prod.descripcionSeo.slice(0, 160),
    alternates: { canonical: url },
    openGraph: {
      title: prod.nombre,
      description: prod.descripcionSeo.slice(0, 200),
      url,
      type: 'website',
      images: [{ url: imagen, width: 800, height: 800, alt: prod.nombre }],
    },
    other: {
      'product:price:amount':   prod.precio ? String(prod.precio) : '',
      'product:price:currency': prod.moneda ?? 'ARS',
      'product:condition':      prod.condicion === 'Nuevo' ? 'new' : 'used',
      'product:availability':   prod.stock ? 'in stock' : 'out of stock',
      ...(prod.marca && { 'product:brand': prod.marca }),
    },
  };
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default async function ProductoPage({ params }: { params: { categoria: string; producto: string } }) {
  const sheet = await getProducto(params.producto);
  if (!sheet) notFound();

  const prod = await enriquecerProducto(sheet);
  // Verificar que la categoría del producto coincide con la URL
  if (prod.categoria.slug !== params.categoria) notFound();

  const url = `${SITE_URL}/${prod.categoria.slug}/${prod.slug}`;
  const imagen = prod.imagenes[0] ?? `${SITE_URL}/og-default.jpg`;
  const precio = prod.precio
    ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(prod.precio)
    : null;

  const productSchema = buildProductSchema({
    nombre: prod.nombre,
    descripcion: prod.descripcionSeo,
    imagen,
    precio: prod.precio,
    moneda: prod.moneda,
    condicion: prod.condicion,
    marca: prod.marca,
    sku: prod.mlItemId,
    url,
    reviewPromedio: prod.reviews?.promedio,
    reviewTotal: prod.reviews?.total,
    reviews: prod.reviews?.items.map((r) => ({
      titulo: r.title ?? '',
      contenido: r.content ?? '',
      rating: r.rate,
      fecha: r.date_created?.split('T')[0] ?? '',
      autor: r.reviewer_name,
    })),
  });

  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: SITE_URL },
    { name: prod.categoria.nombre, url: `${SITE_URL}/${prod.categoria.slug}` },
    { name: prod.nombre, url },
  ]);

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
            <li className="text-gray-900 font-medium truncate max-w-xs">{prod.nombre}</li>
          </ol>
        </nav>

        <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
          {/* Galería */}
          <div>
            <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-3">
              <Image
                src={imagen}
                alt={prod.nombre}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain p-6"
                priority
              />
            </div>
            {prod.imagenes.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {prod.imagenes.slice(0, 6).map((img, i) => (
                  <div key={i} className="relative w-16 h-16 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden border-2 border-gray-100 hover:border-ml-blue">
                    <Image src={img} alt={`${prod.nombre} ${i + 1}`} fill sizes="64px" className="object-contain p-1" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs text-gray-400 uppercase tracking-wide">{prod.condicion}</span>
              {prod.marca && <span className="text-xs text-gray-400">· {prod.marca}</span>}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
              {prod.nombre}
            </h1>

            {prod.reviews && prod.reviews.total > 0 && (
              <div className="mb-4">
                <StarRating rating={prod.reviews.promedio} total={prod.reviews.total} />
              </div>
            )}

            {precio && (
              <div className="mb-6">
                <p className="text-4xl font-bold text-gray-900">{precio}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {prod.stock ? '✅ En stock' : '❌ Sin stock'} · Precio actualizado desde MercadoLibre
                </p>
              </div>
            )}

            <a
              href={prod.urlAfiliado}
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
              <p className="whitespace-pre-line">{prod.descripcionSeo}</p>
            </div>
          </div>
        </div>

        {/* Reviews */}
        {prod.reviews && prod.reviews.items.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Opiniones de compradores ({prod.reviews.total} reseñas)
            </h2>
            <div className="bg-gray-50 rounded-2xl p-6 mb-8 flex items-center gap-8 flex-wrap">
              <div className="text-center">
                <p className="text-6xl font-bold text-gray-900">{prod.reviews.promedio.toFixed(1)}</p>
                <StarRating rating={prod.reviews.promedio} />
                <p className="text-sm text-gray-500 mt-1">{prod.reviews.total} opiniones</p>
              </div>
              {prod.reviews.niveles.length > 0 && (
                <div className="flex-1 min-w-[160px]">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const nivel = prod.reviews!.niveles.find((n) => n.rating === stars);
                    const count = nivel?.amount ?? 0;
                    const pct = prod.reviews!.total > 0 ? (count / prod.reviews!.total) * 100 : 0;
                    return (
                      <div key={stars} className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500 w-4">{stars}★</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-6">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="space-y-4">
              {prod.reviews.items.map((review) => (
                <article key={review.id} className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <StarRating rating={review.rate} />
                    <time className="text-xs text-gray-400" dateTime={review.date_created}>
                      {new Date(review.date_created).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </time>
                  </div>
                  {review.title && <h3 className="font-semibold text-gray-800 mb-1">{review.title}</h3>}
                  {review.content && <p className="text-gray-600 text-sm leading-relaxed">{review.content}</p>}
                  {review.reviewer_name && <p className="text-xs text-gray-400 mt-2">— {review.reviewer_name}</p>}
                </article>
              ))}
            </div>
            <p className="text-sm text-gray-400 mt-4 text-center">Reseñas de MercadoLibre · Compradores verificados</p>
          </section>
        )}
      </div>
    </>
  );
}

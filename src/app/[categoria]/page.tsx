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
    const productos = await getProductos();
    return productos.map((p) => ({ categoria: p.slug }));
  } catch {
    return [];
  }
}

// ─── Meta tags ────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: { categoria: string } }): Promise<Metadata> {
  const sheet = await getProducto(params.categoria);
  if (!sheet) return {};
  const prod = await enriquecerProducto(sheet);
  const url = `${SITE_URL}/${prod.slug}`;
  const imagen = prod.imagenes[0] ?? `${SITE_URL}/og-default.jpg`;

  return {
    title: prod.titulo,
    description: prod.descripcion.slice(0, 160),
    alternates: { canonical: url },
    openGraph: {
      title: prod.titulo,
      description: prod.descripcion.slice(0, 200),
      url,
      type: 'article',
      images: [{ url: imagen, width: 800, height: 800, alt: prod.titulo }],
    },
    ...(prod.marca && { other: { 'product:brand': prod.marca } }),
  };
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default async function ArticuloPage({ params }: { params: { categoria: string } }) {
  const sheet = await getProducto(params.categoria); // params.categoria ES el slug
  if (!sheet) notFound();

  const prod = await enriquecerProducto(sheet);
  const url = `${SITE_URL}/${prod.slug}`;
  const imagen = prod.imagenes[0] ?? `${SITE_URL}/og-default.jpg`;

  const productSchema = buildProductSchema({
    nombre: prod.titulo,
    descripcion: prod.descripcion,
    imagen,
    precio: prod.precio,
    moneda: prod.moneda,
    condicion: 'Nuevo',
    marca: prod.marca || undefined,
    sku: prod.slug,
    url,
  });

  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Inicio', url: SITE_URL },
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

      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Breadcrumb */}
        <nav className="text-sm text-gray-400 mb-6">
          <Link href="/" className="hover:text-ml-blue">Inicio</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">{prod.titulo}</span>
        </nav>

        {/* ── Artículo ── */}
        <article>
          {prod.marca && (
            <p className="text-sm font-semibold text-ml-blue uppercase tracking-wide mb-2">{prod.marca}</p>
          )}

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-6">
            {prod.titulo}
          </h1>

          <div className="prose prose-gray max-w-none mb-10 text-gray-700 leading-relaxed text-lg">
            <p className="whitespace-pre-line">{prod.descripcion}</p>
          </div>
        </article>

        {/* ── Bloque del producto ── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-12">
          {/* Galería de imágenes */}
          {prod.imagenes.length > 0 && (
            <div className="bg-gray-50 p-6">
              <div className="relative aspect-square max-w-sm mx-auto rounded-xl overflow-hidden">
                <Image
                  src={imagen}
                  alt={prod.titulo}
                  fill
                  sizes="(max-width: 640px) 100vw, 400px"
                  className="object-contain"
                  priority
                />
              </div>
              {prod.imagenes.length > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  {prod.imagenes.map((img, i) => (
                    <div
                      key={i}
                      className="relative w-14 h-14 flex-shrink-0 bg-white rounded-lg overflow-hidden border-2 border-gray-200 hover:border-ml-blue cursor-pointer"
                    >
                      <Image src={img} alt={`${prod.titulo} ${i + 1}`} fill sizes="56px" className="object-contain p-1" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Acción de compra */}
          <div className="p-6">
            <a
              href={buildAffiliateLink(prod.urlMl)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="btn-ml text-lg py-4 px-8 w-full justify-center"
            >
              🛒 Comprar en MercadoLibre
            </a>
            <p className="text-xs text-gray-400 text-center mt-3">
              Al hacer clic vas a MercadoLibre. Este sitio recibe una comisión de afiliado sin costo para vos.
            </p>
          </div>
        </div>

        {/* ── Artículos relacionados ── */}
        {relacionados.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">También te puede interesar</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {relacionados.map((rel) => {
                const imgRel = rel.imagenes[0];
                return (
                  <Link
                    key={rel.slug}
                    href={`/${rel.slug}`}
                    className="group bg-white rounded-xl border border-gray-100 hover:border-ml-blue hover:shadow-md transition-all p-3"
                  >
                    {imgRel && (
                      <div className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden mb-2">
                        <Image
                          src={imgRel}
                          alt={rel.titulo}
                          fill
                          sizes="160px"
                          className="object-contain p-2 group-hover:scale-105 transition-transform"
                        />
                      </div>
                    )}
                    <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug">{rel.titulo}</p>
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

export const runtime = 'edge';

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { resolveRoute, getAllSlugs } from '@/lib/getArticleProps';
import { ArticlePage } from '@/components/ArticlePage';
import { CategoryPage } from '@/components/CategoryPage';

export const revalidate = 1800;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tienda.alejosotelo.com.ar';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Mejores Productos MercadoLibre';

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  // Slugs con 2+ "/" (3 o más segmentos)
  return slugs
    .filter((s) => s.split('/').length >= 3)
    .map((s) => ({ slug: s.split('/') }));
}

export async function generateMetadata({ params }: { params: { slug: string[] } }): Promise<Metadata> {
  const slug = params.slug.join('/');
  const data = await resolveRoute(slug);
  if (!data) return {};

  if (data.type === 'product') {
    const { prod } = data;
    const url = `${SITE_URL}/${prod.slug}`;
    const imagen = prod.imagenes[0] ?? `${SITE_URL}/og-default.jpg`;
    return {
      title: prod.titulo,
      description: prod.descripcion.slice(0, 160),
      alternates: { canonical: url },
      openGraph: { title: prod.titulo, description: prod.descripcion.slice(0, 200), url, type: 'article', images: [{ url: imagen, width: 800, height: 800, alt: prod.titulo }] },
    };
  }

  const url = `${SITE_URL}/${data.prefix}`;
  const titulo = data.categoria?.tituloSeo || `${data.prefix} | ${SITE_NAME}`;
  const descripcion = data.categoria?.descripcionSeo;
  return {
    title: titulo,
    ...(descripcion && { description: descripcion }),
    alternates: { canonical: url },
    openGraph: { title: titulo, ...(descripcion && { description: descripcion }), url },
  };
}

export default async function Page({ params }: { params: { slug: string[] } }) {
  const slug = params.slug.join('/');
  const data = await resolveRoute(slug);
  if (!data) notFound();

  if (data.type === 'product') {
    const { prod, relacionados, urlAfiliado } = data;
    return <ArticlePage prod={prod} relacionados={relacionados} urlAfiliado={urlAfiliado} />;
  }

  return <CategoryPage prefix={data.prefix} productos={data.productos} categoria={data.categoria} />;
}

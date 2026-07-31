export const runtime = 'edge';

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { resolveRoute, getAllSlugs, getCategoryPrefixes } from '@/lib/getArticleProps';
import { ArticlePage } from '@/components/ArticlePage';
import { CategoryPage } from '@/components/CategoryPage';

export const revalidate = 1800;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tienda.alejosotelo.com.ar';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Mejores Productos MercadoLibre';

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  // Slugs de 2 segmentos exactos + prefijos de subcategoría derivados de slugs más profundos
  const dosSegmentos = slugs.filter((s) => s.split('/').length === 2);
  const prefijos = await getCategoryPrefixes(2);
  return Array.from(new Set([...dosSegmentos, ...prefijos])).map((s) => {
    const [categoria, producto] = s.split('/');
    return { categoria, producto };
  });
}

export async function generateMetadata({ params }: { params: { categoria: string; producto: string } }): Promise<Metadata> {
  const slug = `${params.categoria}/${params.producto}`;
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
  return {
    title: `${data.prefix} | ${SITE_NAME}`,
    alternates: { canonical: url },
  };
}

export default async function Page({ params }: { params: { categoria: string; producto: string } }) {
  const slug = `${params.categoria}/${params.producto}`;
  const data = await resolveRoute(slug);
  if (!data) notFound();

  if (data.type === 'product') {
    const { prod, relacionados, urlAfiliado } = data;
    return <ArticlePage prod={prod} relacionados={relacionados} urlAfiliado={urlAfiliado} />;
  }

  return <CategoryPage prefix={data.prefix} productos={data.productos} />;
}

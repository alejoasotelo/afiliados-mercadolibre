export const runtime = 'edge';

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getArticleProps, getAllSlugs } from '@/lib/getArticleProps';
import { ArticlePage } from '@/components/ArticlePage';

export const revalidate = 1800;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tienda.alejosotelo.com.ar';

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  // Los slugs del Sheet son planos (sin "/"); la categoría en la URL es fija ("productos")
  return slugs
    .filter((s) => !s.includes('/'))
    .map((producto) => ({ categoria: 'productos', producto }));
}

export async function generateMetadata({ params }: { params: { categoria: string; producto: string } }): Promise<Metadata> {
  const data = await getArticleProps(params.producto);
  if (!data) return {};
  const { prod } = data;
  const url = `${SITE_URL}/productos/${prod.slug}`;
  const imagen = prod.imagenes[0] ?? `${SITE_URL}/og-default.jpg`;
  return {
    title: prod.titulo,
    description: prod.descripcion.slice(0, 160),
    alternates: { canonical: url },
    openGraph: { title: prod.titulo, description: prod.descripcion.slice(0, 200), url, type: 'article', images: [{ url: imagen, width: 800, height: 800, alt: prod.titulo }] },
  };
}

export default async function Page({ params }: { params: { categoria: string; producto: string } }) {
  const data = await getArticleProps(params.producto);
  if (!data) notFound();
  return <ArticlePage {...data} />;
}

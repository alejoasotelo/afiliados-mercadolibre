export const runtime = 'edge';

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getArticleProps, getAllSlugs } from '@/lib/getArticleProps';
import { ArticlePage } from '@/components/ArticlePage';

export const revalidate = 1800;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tienda.alejosotelo.com.ar';

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  // Slugs con 2+ "/" (3 o más segmentos)
  return slugs
    .filter((s) => s.split('/').length >= 3)
    .map((s) => ({ slug: s.split('/') }));
}

export async function generateMetadata({ params }: { params: { slug: string[] } }): Promise<Metadata> {
  const slug = params.slug.join('/');
  const data = await getArticleProps(slug);
  if (!data) return {};
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

export default async function Page({ params }: { params: { slug: string[] } }) {
  const slug = params.slug.join('/');
  const data = await getArticleProps(slug);
  if (!data) notFound();
  return <ArticlePage {...data} />;
}

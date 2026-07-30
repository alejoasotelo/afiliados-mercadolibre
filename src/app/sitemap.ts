import type { MetadataRoute } from 'next';
import { getProductos } from '@/lib/sheets';
import { enriquecerProducto, agruparPorCategoria } from '@/lib/mercadolibre';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tienda.alejosotelo.com.ar';
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let todos: Awaited<ReturnType<typeof enriquecerProducto>>[] = [];
  try {
    const productosSheet = await getProductos();
    todos = await Promise.all(productosSheet.map(enriquecerProducto));
  } catch {
    return [{ url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 }];
  }
  const categorias = agruparPorCategoria(todos);

  const home: MetadataRoute.Sitemap = [{
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1,
  }];

  const catUrls: MetadataRoute.Sitemap = Array.from(categorias.keys()).map((slug) => ({
    url: `${SITE_URL}/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const prodUrls: MetadataRoute.Sitemap = todos.map((prod) => ({
    url: `${SITE_URL}/${prod.categoria.slug}/${prod.slug}`,
    lastModified: new Date(),
    changeFrequency: 'hourly',
    priority: 0.9,
  }));

  return [...home, ...catUrls, ...prodUrls];
}

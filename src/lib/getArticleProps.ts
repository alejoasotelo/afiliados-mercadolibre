/**
 * Helper compartido para las rutas de artículos.
 * Usado por [categoria]/page.tsx, [categoria]/[producto]/page.tsx
 * y [...slug]/page.tsx para que cualquier profundidad de URL funcione.
 *
 * Un mismo segmento de URL puede resolver a un producto (match exacto de
 * slug) o, si no hay match exacto pero existen productos cuyo slug empieza
 * con "<segmento>/", a un listado tipo categoría/subcategoría.
 */

import { getProducto, getProductos } from './sheets';
import { enriquecerProducto, buildAffiliateLink } from './mercadolibre';
import { ProductoCompleto } from './types';

export async function getArticleProps(slug: string) {
  const sheet = await getProducto(slug);
  if (!sheet) return null;
  const prod = await enriquecerProducto(sheet);

  const relacionados = prod.relacionados.length > 0
    ? (await getProductos()).filter((p) => prod.relacionados.includes(p.slug)).slice(0, 4)
    : [];

  return { prod, relacionados, urlAfiliado: buildAffiliateLink(prod.urlMl) };
}

export async function getAllSlugs(): Promise<string[]> {
  try {
    const productos = await getProductos();
    return productos.map((p) => p.slug);
  } catch {
    return [];
  }
}

export interface CategoryProps {
  prefix: string;
  productos: ProductoCompleto[];
}

export async function getCategoryProps(prefix: string): Promise<CategoryProps | null> {
  const productosSheet = await getProductos();
  const prefijoConBarra = `${prefix}/`;
  const matches = productosSheet.filter((p) => p.slug.startsWith(prefijoConBarra));
  if (matches.length === 0) return null;

  const productos = await Promise.all(matches.map(enriquecerProducto));
  return { prefix, productos };
}

// Prefijos únicos de "depth" segmentos, derivados de slugs más profundos
// (ej: depth=1 sobre "zapatillas/chunky/vans-a1" → "zapatillas")
export async function getCategoryPrefixes(depth: number): Promise<string[]> {
  const slugs = await getAllSlugs();
  const prefijos = new Set<string>();
  for (const slug of slugs) {
    const partes = slug.split('/');
    if (partes.length > depth) prefijos.add(partes.slice(0, depth).join('/'));
  }
  return Array.from(prefijos);
}

export type RouteResolution =
  | ({ type: 'product' } & NonNullable<Awaited<ReturnType<typeof getArticleProps>>>)
  | ({ type: 'category' } & CategoryProps);

export async function resolveRoute(slug: string): Promise<RouteResolution | null> {
  const article = await getArticleProps(slug);
  if (article) return { type: 'product', ...article };

  const category = await getCategoryProps(slug);
  if (category) return { type: 'category', ...category };

  return null;
}

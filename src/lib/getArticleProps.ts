/**
 * Helper compartido para las rutas de artículos.
 * Usado por [categoria]/page.tsx, [categoria]/[producto]/page.tsx
 * y [...slug]/page.tsx para que cualquier profundidad de URL funcione.
 */

import { getProducto, getProductos } from './sheets';
import { enriquecerProducto, buildAffiliateLink } from './mercadolibre';
import { ProductoSheet } from './types';

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

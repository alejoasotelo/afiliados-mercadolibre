/**
 * MercadoLibre API — Items, Categorías, Imágenes, Reviews, Links de Afiliado
 * Todo lo que no viene del Sheet, viene de acá.
 */

import { MLItem, MLCategoria, MLReviewsResponse, ProductoCompleto, ProductoSheet } from './types';

const ML_API = 'https://api.mercadolibre.com';

// ─── Fetch genérico con cache ─────────────────────────────────────────────────

async function mlFetch<T>(path: string, revalidate = 3600): Promise<T | null> {
  try {
    const res = await fetch(`${ML_API}${path}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

// ─── Item ─────────────────────────────────────────────────────────────────────

export async function getMLItem(itemId: string): Promise<MLItem | null> {
  return mlFetch<MLItem>(`/items/${itemId}`, 1800); // 30 min (precios cambian)
}

// ─── Categoría desde ML ───────────────────────────────────────────────────────

interface MLCategoryRaw {
  id: string;
  name: string;
  path_from_root?: Array<{ id: string; name: string }>;
}

export async function getMLCategoria(categoryId: string): Promise<MLCategoria> {
  const data = await mlFetch<MLCategoryRaw>(`/categories/${categoryId}`, 86400); // 24 hs
  const nombre = data?.name ?? 'Productos';
  return {
    id: categoryId,
    nombre,
    slug: generarSlug(nombre),
  };
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export async function getMLReviews(itemId: string): Promise<MLReviewsResponse | null> {
  return mlFetch<MLReviewsResponse>(`/reviews/item/${itemId}`, 7200); // 2 hs
}

// ─── Link de afiliado ─────────────────────────────────────────────────────────

export function buildAffiliateLink(urlMl: string, permalink?: string): string {
  const affId = process.env.ML_AFFILIATE_ID ?? '';
  // Si ya tiene parámetros de afiliado, usarla directamente
  if (urlMl && (urlMl.includes('aff_id') || urlMl.includes('utm_source'))) return urlMl;
  // Construir desde permalink del item
  const base = permalink ?? urlMl;
  if (!base || base === '#') return '#';
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}aff_id=${affId}&aff_platform=web`;
}

// ─── Imágenes optimizadas ─────────────────────────────────────────────────────

export function getAllImages(item: MLItem): string[] {
  if (item.pictures?.length > 0) {
    return item.pictures
      .map((p) => (p.secure_url || p.url).replace(/-[A-Z]\.jpg$/, '-L.jpg'))
      .slice(0, 8);
  }
  return [item.thumbnail.replace(/-[A-Z]\.jpg$/, '-L.jpg')];
}

// ─── Condición en español ─────────────────────────────────────────────────────

export function condicionLabel(condition: string): string {
  const map: Record<string, string> = {
    new: 'Nuevo',
    used: 'Usado',
    not_specified: 'Sin especificar',
  };
  return map[condition] ?? 'Nuevo';
}

// ─── Atributo por ID ──────────────────────────────────────────────────────────

export function getAtributo(item: MLItem, id: string): string | null {
  return item.attributes?.find((a) => a.id === id)?.value_name ?? null;
}

// ─── Enriquecer producto (Sheet + ML API + Reviews + Categoría) ───────────────

export async function enriquecerProducto(producto: ProductoSheet): Promise<ProductoCompleto> {
  const [mlItem, mlReviews] = await Promise.all([
    getMLItem(producto.mlItemId),
    getMLReviews(producto.mlItemId),
  ]);

  // Categoría desde ML (usa category_id del item)
  const categoria = mlItem?.category_id
    ? await getMLCategoria(mlItem.category_id)
    : { id: '', nombre: 'Productos', slug: 'productos' };

  const imagenes = mlItem ? getAllImages(mlItem) : [];
  const stock = (mlItem?.available_quantity ?? 0) > 0;
  const condicion = condicionLabel(mlItem?.condition ?? 'new');
  const marca = getAtributo(mlItem!, 'BRAND') ?? undefined;

  const reviews = mlReviews
    ? {
        promedio: mlReviews.rating_average ?? 0,
        total: mlReviews.paging?.total ?? 0,
        items: (mlReviews.reviews ?? mlReviews.data ?? []).slice(0, 10),
        niveles: mlReviews.rating_levels ?? [],
      }
    : undefined;

  return {
    ...producto,
    nombre:      mlItem?.title ?? producto.slug,
    precio:      mlItem?.price,
    moneda:      mlItem?.currency_id ?? 'ARS',
    imagenes,
    stock,
    condicion,
    marca,
    permalink:   mlItem?.permalink ?? producto.urlMl,
    urlAfiliado: buildAffiliateLink(producto.urlMl, mlItem?.permalink),
    categoria,
    reviews,
  };
}

// ─── Agrupar productos por categoría ─────────────────────────────────────────

export function agruparPorCategoria(
  productos: ProductoCompleto[]
): Map<string, { categoria: MLCategoria; productos: ProductoCompleto[] }> {
  const map = new Map<string, { categoria: MLCategoria; productos: ProductoCompleto[] }>();
  for (const prod of productos) {
    const key = prod.categoria.slug;
    if (!map.has(key)) {
      map.set(key, { categoria: prod.categoria, productos: [] });
    }
    map.get(key)!.productos.push(prod);
  }
  return map;
}

// ─── Helper: generar slug desde texto ────────────────────────────────────────

function generarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

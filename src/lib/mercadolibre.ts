/**
 * MercadoLibre — Scraper de páginas públicas (reemplaza la API restringida)
 *
 * Extrae datos desde el JSON-LD que ML embebe en cada página de producto:
 *   - Product schema → título, precio, imágenes, marca, condición, stock, rating
 *   - BreadcrumbList schema → categoría
 */

import { MLCategoria, MLRatingLevel, MLReview, ProductoCompleto, ProductoSheet } from './types';

// ─── Tipos internos del scraper ───────────────────────────────────────────────

interface ScrapedData {
  nombre:    string;
  precio?:   number;
  moneda:    string;
  imagenes:  string[];
  stock:     boolean;
  condicion: string;
  marca?:    string;
  categoria: MLCategoria;
  reviews?:  {
    promedio: number;
    total:    number;
    items:    MLReview[];
    niveles:  MLRatingLevel[];
  };
}

// ─── Scraper principal ────────────────────────────────────────────────────────

async function scrapeMLPage(urlMl: string, revalidate = 1800): Promise<ScrapedData | null> {
  try {
    const res = await fetch(urlMl, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
      },
      next: { revalidate },
    });

    if (!res.ok) {
      console.warn(`[ML Scraper] ${res.status} para ${urlMl}`);
      return null;
    }

    const html = await res.text();

    // Extraer todos los bloques JSON-LD
    const jsonLdBlocks: Record<string, unknown>[] = [];
    const regex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(html)) !== null) {
      try { jsonLdBlocks.push(JSON.parse(m[1])); } catch { /* bloque inválido */ }
    }

    // Aplanar @graph si existe
    const allBlocks: Record<string, unknown>[] = [];
    for (const block of jsonLdBlocks) {
      if (Array.isArray(block['@graph'])) {
        allBlocks.push(...(block['@graph'] as Record<string, unknown>[]));
      } else {
        allBlocks.push(block);
      }
    }

    const product    = allBlocks.find((b) => b['@type'] === 'Product');
    const breadcrumb = allBlocks.find((b) => b['@type'] === 'BreadcrumbList');

    if (!product) {
      console.warn(`[ML Scraper] No se encontró JSON-LD Product en ${urlMl}`);
      return null;
    }

    // ── Categoría desde BreadcrumbList ────────────────────────────────────────
    let categoria: MLCategoria = { id: '', nombre: 'Productos', slug: 'productos' };
    const items = (breadcrumb?.itemListElement as { name?: string; item?: { name?: string }; position?: number }[]) ?? [];
    // El breadcrumb suele ser: Inicio > CatN-1 > Cat > Producto
    // Tomamos el penúltimo elemento (antes del producto)
    // ML puede poner el nombre en la raíz (name) o anidado (item.name)
    if (items.length >= 2) {
      const catItem = items[items.length - 2];
      const nombre  = catItem?.item?.name ?? catItem?.name ?? 'Productos';
      categoria = { id: '', nombre, slug: generarSlug(nombre) };
    }

    // ── Imágenes ──────────────────────────────────────────────────────────────
    const rawImages = product['image'];
    let imagenes: string[] = [];
    if (Array.isArray(rawImages)) {
      imagenes = rawImages.map((img) =>
        typeof img === 'string' ? img : (img as { url?: string; contentUrl?: string }).url ?? (img as { contentUrl?: string }).contentUrl ?? ''
      ).filter(Boolean);
    } else if (typeof rawImages === 'string') {
      imagenes = [rawImages];
    }

    // ── Oferta (precio, moneda, stock) ────────────────────────────────────────
    const rawOffers = product['offers'];
    const offer = Array.isArray(rawOffers) ? (rawOffers as Record<string, unknown>[])[0] : rawOffers as Record<string, unknown> | undefined;
    const precio  = offer?.price  ? parseFloat(String(offer.price))  : undefined;
    const moneda  = String(offer?.priceCurrency ?? 'ARS');
    const stock   = String(offer?.availability ?? '').includes('InStock');

    // ── Condición ─────────────────────────────────────────────────────────────
    const condStr = String(product['itemCondition'] ?? '');
    const condicion = condStr.includes('NewCondition')  ? 'Nuevo'
      : condStr.includes('UsedCondition') ? 'Usado'
      : 'Nuevo';

    // ── Marca ─────────────────────────────────────────────────────────────────
    // ML puede enviar "brand" como string ("Volkswagen") o como objeto ({name: "VW"})
    const brandRaw = product['brand'];
    const marca = typeof brandRaw === 'string'
      ? brandRaw
      : (brandRaw as { name?: string } | undefined)?.name ?? undefined;

    // ── Rating agregado ───────────────────────────────────────────────────────
    const aggRating = product['aggregateRating'] as { ratingValue?: unknown; reviewCount?: unknown; ratingCount?: unknown } | undefined;
    const reviews = aggRating
      ? {
          promedio: parseFloat(String(aggRating.ratingValue ?? 0)) || 0,
          total:    parseInt(String(aggRating.reviewCount ?? aggRating.ratingCount ?? 0)) || 0,
          items:    [] as MLReview[],
          niveles:  [] as MLRatingLevel[],
        }
      : undefined;

    return {
      nombre: String(product['name'] ?? ''),
      precio,
      moneda,
      imagenes,
      stock,
      condicion,
      marca,
      categoria,
      reviews,
    };
  } catch (e) {
    console.error('[ML Scraper] Error inesperado:', e);
    return null;
  }
}

// ─── Link de afiliado ─────────────────────────────────────────────────────────

export function buildAffiliateLink(urlMl: string): string {
  const affId = process.env.ML_AFFILIATE_ID ?? '';
  if (!urlMl || urlMl === '#') return '#';
  if (urlMl.includes('aff_id') || urlMl.includes('utm_source')) return urlMl;
  const sep = urlMl.includes('?') ? '&' : '?';
  return `${urlMl}${sep}aff_id=${affId}&aff_platform=web`;
}

// ─── Enriquecer producto (Sheet + Scraper) ────────────────────────────────────

export async function enriquecerProducto(producto: ProductoSheet): Promise<ProductoCompleto> {
  return {
    ...producto,
    nombre:      producto.titulo || producto.slug,
    precio:      undefined,
    moneda:      'ARS',
    imagenes:    producto.imagenes,
    stock:       true,
    condicion:   'Nuevo',
    marca:       producto.marca || undefined,
    permalink:   producto.urlMl,
    urlAfiliado: buildAffiliateLink(producto.urlMl),
    categoria:   { id: '', nombre: 'Productos', slug: 'productos' },
    reviews:     undefined,
  };
}

// ─── Agrupar productos por categoría ─────────────────────────────────────────

export function agruparPorCategoria(
  productos: ProductoCompleto[]
): Map<string, { categoria: MLCategoria; productos: ProductoCompleto[] }> {
  const map = new Map<string, { categoria: MLCategoria; productos: ProductoCompleto[] }>();
  for (const prod of productos) {
    const key = prod.categoria.slug;
    if (!map.has(key)) map.set(key, { categoria: prod.categoria, productos: [] });
    map.get(key)!.productos.push(prod);
  }
  return map;
}

// ─── Helper: generar slug desde texto ────────────────────────────────────────

export function generarSlug(texto: string): string {
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

/**
 * /api/scrape
 * Scrapea una página de MercadoLibre y devuelve los datos estructurados.
 * Usado por Google Apps Script para auto-completar filas del Sheet.
 *
 * GET /api/scrape?url=https://www.mercadolibre.com.ar/...
 *
 * Respuesta:
 * {
 *   mlItemId:        "MLAU3701954116",
 *   titulo:          "Boton De Arranque...",
 *   slug:            "boton-de-arranque-star-stop-vw",
 *   categoriaSlug:   "cerraduras-y-llaves",
 *   categoriaNombre: "Cerraduras y Llaves",
 *   imagenes:        ["https://..."],
 *   precio:          132000,
 *   moneda:          "ARS",
 *   marca:           "Volkswagen",
 *   condicion:       "Nuevo",
 *   stock:           true
 * }
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function extraerItemId(url: string): string | null {
  // Formatos comunes:
  //   /up/MLAU3701954116
  //   /MLA3569269732
  //   ?item_id=MLA3569269732
  const m =
    url.match(/\/(?:up\/|p\/)?(MLA[A-Z]*\d+)(?:[?#/]|$)/i) ??
    url.match(/item_id=(MLA[A-Z]*\d+)/i);
  return m ? m[1].toUpperCase() : null;
}

// ─── Scraper ──────────────────────────────────────────────────────────────────

async function scrapear(urlMl: string) {
  const res = await fetch(urlMl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} al cargar la página de ML`);

  const html = await res.text();

  // Extraer todos los bloques JSON-LD
  const bloques: Record<string, unknown>[] = [];
  const regex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    try { bloques.push(JSON.parse(m[1])); } catch { /* ignorar */ }
  }

  // Aplanar @graph
  const todos: Record<string, unknown>[] = [];
  for (const b of bloques) {
    if (Array.isArray(b['@graph'])) {
      todos.push(...(b['@graph'] as Record<string, unknown>[]));
    } else {
      todos.push(b);
    }
  }

  const product    = todos.find((b) => b['@type'] === 'Product');
  const breadcrumb = todos.find((b) => b['@type'] === 'BreadcrumbList');

  if (!product) throw new Error('No se encontró JSON-LD Product en la página');

  // Título y slug
  const titulo = String(product['name'] ?? '');
  const slug   = generarSlug(titulo).substring(0, 60);

  // Imágenes
  const rawImg = product['image'];
  let imagenes: string[] = [];
  if (Array.isArray(rawImg)) {
    imagenes = (rawImg as unknown[]).map((img) =>
      typeof img === 'string' ? img : (img as { url?: string }).url ?? ''
    ).filter(Boolean);
  } else if (typeof rawImg === 'string') {
    imagenes = [rawImg];
  }

  // Oferta
  const rawOffer = product['offers'];
  const offer = Array.isArray(rawOffer)
    ? (rawOffer as Record<string, unknown>[])[0]
    : rawOffer as Record<string, unknown> | undefined;
  const precio = offer?.price ? parseFloat(String(offer.price)) : undefined;
  const moneda = String(offer?.priceCurrency ?? 'ARS');
  const stock  = String(offer?.availability ?? '').includes('InStock');

  // Condición
  const condStr   = String(product['itemCondition'] ?? '');
  const condicion = condStr.includes('NewCondition') ? 'Nuevo' : condStr.includes('UsedCondition') ? 'Usado' : 'Nuevo';

  // Marca
  const brandRaw = product['brand'];
  const marca = typeof brandRaw === 'string'
    ? brandRaw
    : (brandRaw as { name?: string } | undefined)?.name ?? undefined;

  // Categoría desde BreadcrumbList
  let categoriaNombre = '';
  let categoriaSlug   = '';
  const items = (breadcrumb?.itemListElement as { name?: string; item?: { name?: string }; position?: number }[]) ?? [];
  if (items.length >= 2) {
    const catItem = items[items.length - 2];
    categoriaNombre = catItem?.item?.name ?? catItem?.name ?? '';
    categoriaSlug   = generarSlug(categoriaNombre);
  }

  return { titulo, slug, imagenes, precio, moneda, stock, condicion, marca, categoriaNombre, categoriaSlug };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Falta parámetro ?url=' }, { status: 400 });
  }
  if (!url.includes('mercadolibre')) {
    return NextResponse.json({ error: 'La URL no parece ser de MercadoLibre' }, { status: 400 });
  }

  // Extraer item ID desde la URL
  const mlItemId = extraerItemId(url);

  try {
    const datos = await scrapear(url);
    return NextResponse.json(
      { mlItemId, ...datos },
      { headers: { 'Cache-Control': 'public, max-age=1800', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/scrape]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

/**
 * Google Sheets API v4 — lectura del spreadsheet (solo lectura pública con API Key)
 *
 * Estructura del tab "productos":
 *   A: url_ml       B: ml_item_id    C: slug    D: descripcion_seo    E: activo    F: categoria_slug
 *
 * El usuario solo completa A (url) y D (descripcion_seo).
 * B, C, F se auto-completan vía Apps Script llamando a /api/scrape.
 * E se pone "si" cuando quiere publicarlo.
 */

import { ProductoSheet } from './types';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

async function fetchSheet(range: string): Promise<string[][]> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY!;
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);
  const json = await res.json();
  return (json.values as string[][]) ?? [];
}

// ─── Leer todos los productos activos desde el Sheet ─────────────────────────

export async function getProductos(): Promise<ProductoSheet[]> {
  const rows = await fetchSheet('productos!A:F');
  if (rows.length < 2) return [];
  const [, ...data] = rows; // saltear encabezados
  return data
    .filter((row) => {
      const activo = (row[4] ?? '').trim().toLowerCase();
      const itemId = (row[1] ?? '').trim();
      const slug   = (row[2] ?? '').trim();
      return (activo === 'si' || activo === 'true') && itemId && slug;
    })
    .map((row) => ({
      urlMl:          (row[0] ?? '').trim(),
      mlItemId:       (row[1] ?? '').trim(),
      slug:           (row[2] ?? '').trim(),
      descripcionSeo: (row[3] ?? '').trim(),
      categoriaSlug:  (row[5] ?? '').trim() || undefined,
    }));
}

export async function getProducto(slug: string): Promise<ProductoSheet | null> {
  const all = await getProductos();
  return all.find((p) => p.slug === slug) ?? null;
}

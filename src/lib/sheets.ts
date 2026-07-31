/**
 * Google Sheets API v4 — lectura del spreadsheet (solo lectura pública con API Key)
 *
 * Estructura del tab "productos" (carga manual):
 *   A: url_ml | B: slug | C: titulo | D: descripcion |
 *   E: imagen_1 | F: imagen_2 | G: imagen_3 | H: marca | I: activo | J: relacionados
 *
 * "relacionados" = slugs separados por coma (ej: "producto-a,producto-b")
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
  const rows = await fetchSheet('productos!A:J');
  if (rows.length < 2) return [];
  const [, ...data] = rows;
  return data
    .filter((row) => {
      const activo = (row[8] ?? '').trim().toLowerCase(); // col I
      const slug   = (row[1] ?? '').trim();               // col B
      return (activo === 'si' || activo === 'true') && slug;
    })
    .map((row) => ({
      urlMl:       (row[0] ?? '').trim(),
      slug:        (row[1] ?? '').trim(),
      titulo:      (row[2] ?? '').trim(),
      descripcion: (row[3] ?? '').trim(),
      imagenes:    [row[4], row[5], row[6]].map((v) => (v ?? '').trim()).filter(Boolean),
      marca:       (row[7] ?? '').trim(),
      relacionados: (row[9] ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    }));
}

export async function getProducto(slug: string): Promise<ProductoSheet | null> {
  const all = await getProductos();
  return all.find((p) => p.slug === slug) ?? null;
}

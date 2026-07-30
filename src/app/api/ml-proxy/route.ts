/**
 * Proxy para la API de MercadoLibre.
 * Google Apps Script no puede llamar directamente a api.mercadolibre.com
 * por restricciones de PolicyAgent. Este endpoint actúa como intermediario.
 *
 * Recursos soportados:
 *   items    → /items/{id}
 *   products → /products/{id}
 *   search   → /sites/MLA/search?catalog_product_id={id}&limit=5
 *              Devuelve array de results[].id directamente
 *
 * Env vars opcionales (aumentan rate limit):
 *   ML_CLIENT_ID, ML_CLIENT_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const ALLOWED_RESOURCES = ['items', 'products', 'search'] as const;
type Resource = (typeof ALLOWED_RESOURCES)[number];

async function getMLToken(): Promise<string | null> {
  const clientId     = (process.env.ML_CLIENT_ID     ?? '').trim();
  const clientSecret = (process.env.ML_CLIENT_SECRET ?? '').trim();
  if (!clientId || !clientSecret) return null;
  try {
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
    });
    if (!res.ok) { console.error('[ml-proxy] Token error', res.status); return null; }
    const data = await res.json() as { access_token?: string };
    return data.access_token ?? null;
  } catch (e) {
    console.error('[ml-proxy] Token threw:', e);
    return null;
  }
}

async function mlFetch(url: string, token: string | null) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  console.log(`[ml-proxy] ${url} → ${res.status}`);
  return res;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const resource = searchParams.get('resource') as Resource | null;
  const id = searchParams.get('id');

  if (!resource || !ALLOWED_RESOURCES.includes(resource)) {
    return NextResponse.json({ error: 'resource inválido. Valores: items, products, search' }, { status: 400 });
  }
  if (!id || !/^MLA\d+$/i.test(id)) {
    return NextResponse.json({ error: 'id inválido. Formato: MLA + dígitos' }, { status: 400 });
  }

  const idUpper = id.toUpperCase();

  try {
    const token = await getMLToken();

    // Para search: busca items listados bajo un catalog_product_id
    if (resource === 'search') {
      const url = `https://api.mercadolibre.com/sites/MLA/search?catalog_product_id=${idUpper}&limit=5`;
      const res = await mlFetch(url, token);
      if (!res.ok) {
        const data = await res.json();
        return NextResponse.json({ error: `ML search devolvió ${res.status}`, detail: data }, { status: res.status });
      }
      const data = await res.json() as { results?: Array<{ id: string }> };
      // Devolver solo los IDs para que Apps Script los use
      const ids = (data.results ?? []).map((r) => r.id);
      return NextResponse.json({ ids }, { headers: { 'Cache-Control': 'public, max-age=300' } });
    }

    // Para items y products: llamada directa
    const url = `https://api.mercadolibre.com/${resource}/${idUpper}`;
    const res = await mlFetch(url, token);
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: `ML API devolvió ${res.status}`, detail: data }, { status: res.status });
    }
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=300' } });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ml-proxy] threw:', msg);
    return NextResponse.json({ error: 'Error al conectar con ML.', detail: msg }, { status: 502 });
  }
}

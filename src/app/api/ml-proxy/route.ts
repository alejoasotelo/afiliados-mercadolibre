/**
 * Proxy para la API de MercadoLibre.
 *
 * Google Apps Script no puede llamar directamente a api.mercadolibre.com
 * por restricciones de PolicyAgent. Este endpoint actúa como intermediario.
 *
 * Requiere las siguientes env vars en Cloudflare Pages:
 *   ML_CLIENT_ID     → App ID de tu app en developers.mercadolibre.com
 *   ML_CLIENT_SECRET → Secret de tu app
 *
 * Uso:
 *   GET /api/ml-proxy?resource=items&id=MLA123456
 *   GET /api/ml-proxy?resource=products&id=MLA24774075
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const ALLOWED_RESOURCES = ['items', 'products'] as const;
type Resource = (typeof ALLOWED_RESOURCES)[number];

// Obtiene un access_token via Client Credentials.
// Cloudflare Edge cachea la respuesta automáticamente 5 hs.
async function getMLToken(): Promise<string | null> {
  const clientId     = (process.env.ML_CLIENT_ID     ?? '').trim();
  const clientSecret = (process.env.ML_CLIENT_SECRET ?? '').trim();

  // Si no hay credenciales configuradas, retornamos null (llamada sin token)
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) {
      console.error('[ml-proxy] Token error HTTP', res.status, await res.text());
      return null;
    }
    const data = await res.json() as { access_token?: string };
    return data.access_token ?? null;
  } catch (e) {
    console.error('[ml-proxy] Token fetch threw:', e);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const resource = searchParams.get('resource') as Resource | null;
  const id = searchParams.get('id');

  if (!resource || !ALLOWED_RESOURCES.includes(resource)) {
    return NextResponse.json(
      { error: 'Parámetro "resource" inválido. Debe ser "items" o "products".' },
      { status: 400 }
    );
  }

  if (!id || !/^MLA\d+$/i.test(id)) {
    return NextResponse.json(
      { error: 'Parámetro "id" inválido. Formato esperado: MLA seguido de números.' },
      { status: 400 }
    );
  }

  const mlUrl = `https://api.mercadolibre.com/${resource}/${id.toUpperCase()}`;

  try {
    const token = await getMLToken();

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(mlUrl, { headers });

    // Loggear siempre para diagnóstico en Cloudflare Logs
    console.log(`[ml-proxy] ${mlUrl} → ${res.status} (token: ${token ? 'yes' : 'no'})`);

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: `ML API devolvió ${res.status}`, detail: data },
        { status: res.status }
      );
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ml-proxy] fetch threw:', msg);
    return NextResponse.json(
      { error: 'Error al conectar con la API de MercadoLibre.', detail: msg },
      { status: 502 }
    );
  }
}

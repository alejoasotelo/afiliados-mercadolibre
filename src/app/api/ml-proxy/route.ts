/**
 * Proxy para la API de MercadoLibre.
 *
 * Google Apps Script no puede llamar directamente a api.mercadolibre.com
 * por restricciones de PolicyAgent. Este endpoint actúa como intermediario.
 *
 * Uso:
 *   GET /api/ml-proxy?resource=items&id=MLA123456
 *   GET /api/ml-proxy?resource=products&id=MLA24774075
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const ALLOWED_RESOURCES = ['items', 'products'] as const;
type Resource = (typeof ALLOWED_RESOURCES)[number];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const resource = searchParams.get('resource') as Resource | null;
  const id = searchParams.get('id');

  // Validar resource
  if (!resource || !ALLOWED_RESOURCES.includes(resource)) {
    return NextResponse.json(
      { error: 'Parámetro "resource" inválido. Debe ser "items" o "products".' },
      { status: 400 }
    );
  }

  // Validar ID: solo MLA seguido de dígitos
  if (!id || !/^MLA\d+$/i.test(id)) {
    return NextResponse.json(
      { error: 'Parámetro "id" inválido. Formato esperado: MLA seguido de números.' },
      { status: 400 }
    );
  }

  const mlUrl = `https://api.mercadolibre.com/${resource}/${id.toUpperCase()}`;

  try {
    const res = await fetch(mlUrl, {
      headers: { Accept: 'application/json' },
      // No cachear en edge para siempre obtener datos frescos desde Apps Script
      cache: 'no-store',
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // Cachear 5 minutos en browser/CDN para llamadas desde el frontend
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Error al conectar con la API de MercadoLibre.' },
      { status: 502 }
    );
  }
}

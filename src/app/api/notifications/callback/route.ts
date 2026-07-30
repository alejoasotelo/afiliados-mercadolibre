/**
 * Callback de notificaciones de MercadoLibre.
 * ML envía POST a esta URL cuando hay cambios en items, órdenes, etc.
 * Por ahora solo confirmamos recepción con HTTP 200.
 * Docs: https://developers.mercadolibre.com/es_ar/notificaciones-mercado-libre
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[notifications] Recibido:', JSON.stringify(body));
  } catch {
    // body vacío o no-JSON, igual respondemos 200
  }
  // ML requiere HTTP 200 para considerar la notificación entregada
  return new NextResponse(null, { status: 200 });
}

// ML también hace GET para verificar el endpoint al configurarlo
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}

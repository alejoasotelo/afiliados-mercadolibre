export const runtime = 'edge';

import type { Metadata } from 'next';
import { getProductos } from '@/lib/sheets';
import { enriquecerProducto } from '@/lib/mercadolibre';
import { ProductCard } from '@/components/ProductCard';

export const revalidate = 3600;

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Mejores Productos MercadoLibre';

export const metadata: Metadata = {
  title: `Todos los productos | ${SITE_NAME}`,
  description: 'Todos los productos recomendados con reseñas reales de compradores verificados.',
};

export default async function ProductosPage() {
  let productos: Awaited<ReturnType<typeof enriquecerProducto>>[] = [];
  try {
    const productosSheet = await getProductos();
    productos = await Promise.all(productosSheet.map(enriquecerProducto));
  } catch {
    productos = [];
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Todos los productos</h1>

      {productos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
          {productos.map((p) => (
            <ProductCard key={p.slug} producto={p} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-gray-400">
          <p className="text-4xl mb-4">🛒</p>
          <p>Todavía no hay productos publicados. Agregá uno en el Google Sheet.</p>
        </div>
      )}
    </div>
  );
}

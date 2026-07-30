import Link from 'next/link';
import { getProductos } from '@/lib/sheets';
import { enriquecerProducto, agruparPorCategoria } from '@/lib/mercadolibre';

export async function Header() {
  const productosSheet = await getProductos();
  const todos = await Promise.all(productosSheet.map(enriquecerProducto));
  const categorias = agruparPorCategoria(todos);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-6 h-16">
        <Link href="/" className="font-bold text-xl text-ml-blue flex-shrink-0">
          🛒 Mejores Productos
        </Link>
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto flex-1" aria-label="Categorías">
          {Array.from(categorias.entries()).map(([slug, { categoria }]) => (
            <Link
              key={slug}
              href={`/${slug}`}
              className="text-sm text-gray-600 hover:text-ml-blue px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap font-medium"
            >
              {categoria.nombre}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

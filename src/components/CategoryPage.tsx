import Link from 'next/link';
import { ProductoCompleto } from '@/lib/types';
import { ProductCard } from './ProductCard';

interface CategoryPageProps {
  prefix: string;
  productos: ProductoCompleto[];
}

function formatSegmento(segmento: string): string {
  return segmento.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CategoryPage({ prefix, productos }: CategoryPageProps) {
  const segmentos = prefix.split('/');
  const titulo = formatSegmento(segmentos[segmentos.length - 1]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-ml-blue">Inicio</Link>
        {segmentos.map((seg, i) => {
          const href = `/${segmentos.slice(0, i + 1).join('/')}`;
          const esUltimo = i === segmentos.length - 1;
          return (
            <span key={href}>
              <span className="mx-2">/</span>
              {esUltimo ? (
                <span className="text-gray-700">{formatSegmento(seg)}</span>
              ) : (
                <Link href={href} className="hover:text-ml-blue">{formatSegmento(seg)}</Link>
              )}
            </span>
          );
        })}
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">{titulo}</h1>

      {productos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
          {productos.map((p) => (
            <ProductCard key={p.slug} producto={p} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-gray-400">
          <p className="text-4xl mb-4">🛒</p>
          <p>Todavía no hay productos en esta categoría.</p>
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';
import Image from 'next/image';
import { ProductoCompleto } from '@/lib/types';
import { StarRating } from './StarRating';

interface ProductCardProps {
  producto: ProductoCompleto;
}

export function ProductCard({ producto }: ProductCardProps) {
  const href = `/${producto.slug}`;
  const imagen = producto.imagenes[0] ?? '/placeholder.jpg';
  const precio = producto.precio
    ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(producto.precio)
    : null;

  return (
    <article className="card-producto group">
      <Link href={href} className="block">
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          <Image
            src={imagen}
            alt={producto.titulo || producto.nombre}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
          />
          {!producto.stock && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <span className="text-sm font-semibold text-gray-500 bg-white px-3 py-1 rounded-full border">Sin stock</span>
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {producto.condicion}
            </span>
          </div>
        </div>
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2 group-hover:text-ml-blue transition-colors">
            {producto.titulo || producto.nombre}
          </h3>
          {producto.reviews && producto.reviews.total > 0 && (
            <div className="mb-2">
              <StarRating rating={producto.reviews.promedio} total={producto.reviews.total} />
            </div>
          )}
          {precio && (
            <p className="text-xl font-bold text-gray-900 mb-3">{precio}</p>
          )}
          <span className="btn-ml text-sm py-2 w-full justify-center">
            Ver en MercadoLibre →
          </span>
        </div>
      </Link>
    </article>
  );
}

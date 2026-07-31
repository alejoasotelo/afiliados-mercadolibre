'use client';

import { useMemo, useState } from 'react';
import { ProductoCompleto } from '@/lib/types';
import { ProductCard } from './ProductCard';

interface CategoryProductGridProps {
  productos: ProductoCompleto[];
}

const OPCIONES_POR_PAGINA = [10, 20, 30, 50];

function formatPrecio(precio: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(precio);
}

export function CategoryProductGrid({ productos }: CategoryProductGridProps) {
  const marcas = useMemo(
    () => Array.from(new Set(productos.map((p) => p.marca).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [productos]
  );

  const precios = productos.map((p) => p.precio).filter((p): p is number => typeof p === 'number');
  const precioMinDisponible = precios.length ? Math.min(...precios) : 0;
  const precioMaxDisponible = precios.length ? Math.max(...precios) : 0;

  const [marcasSeleccionadas, setMarcasSeleccionadas] = useState<string[]>([]);
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [porPagina, setPorPagina] = useState(10);
  const [pagina, setPagina] = useState(1);

  const toggleMarca = (marca: string) => {
    setMarcasSeleccionadas((prev) =>
      prev.includes(marca) ? prev.filter((m) => m !== marca) : [...prev, marca]
    );
    setPagina(1);
  };

  const limpiarFiltros = () => {
    setMarcasSeleccionadas([]);
    setPrecioMin('');
    setPrecioMax('');
    setPagina(1);
  };

  const productosFiltrados = useMemo(() => {
    const min = precioMin !== '' ? Number(precioMin) : null;
    const max = precioMax !== '' ? Number(precioMax) : null;

    return productos.filter((p) => {
      if (marcasSeleccionadas.length > 0 && !marcasSeleccionadas.includes(p.marca)) return false;
      if (min !== null && (p.precio ?? 0) < min) return false;
      if (max !== null && (p.precio ?? 0) > max) return false;
      return true;
    });
  }, [productos, marcasSeleccionadas, precioMin, precioMax]);

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * porPagina;
  const productosPagina = productosFiltrados.slice(inicio, inicio + porPagina);

  const hayFiltrosActivos = marcasSeleccionadas.length > 0 || precioMin !== '' || precioMax !== '';

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Filtros */}
      <aside className="md:w-56 shrink-0">
        <div className="md:sticky md:top-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Filtros</h2>
            {hayFiltrosActivos && (
              <button onClick={limpiarFiltros} className="text-xs text-ml-blue hover:underline">
                Limpiar
              </button>
            )}
          </div>

          {marcas.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Marca</h3>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {marcas.map((marca) => (
                  <label key={marca} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marcasSeleccionadas.includes(marca)}
                      onChange={() => toggleMarca(marca)}
                      className="rounded border-gray-300 text-ml-blue focus:ring-ml-blue"
                    />
                    {marca}
                  </label>
                ))}
              </div>
            </div>
          )}

          {precios.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Precio</h3>
              <p className="text-xs text-gray-400 mb-2">
                {formatPrecio(precioMinDisponible)} – {formatPrecio(precioMaxDisponible)}
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="Mín."
                  value={precioMin}
                  onChange={(e) => { setPrecioMin(e.target.value); setPagina(1); }}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ml-blue"
                />
                <span className="text-gray-300">–</span>
                <input
                  type="number"
                  min={0}
                  placeholder="Máx."
                  value={precioMax}
                  onChange={(e) => { setPrecioMax(e.target.value); setPagina(1); }}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ml-blue"
                />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Resultados */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <p className="text-sm text-gray-400">
            {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''}
          </p>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            Por página
            <select
              value={porPagina}
              onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(1); }}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ml-blue"
            >
              {OPCIONES_POR_PAGINA.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>

        {productosPagina.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
              {productosPagina.map((p) => (
                <ProductCard key={p.slug} producto={p} />
              ))}
            </div>

            {totalPaginas > 1 && (
              <nav className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-ml-blue hover:text-ml-blue transition-colors"
                >
                  Anterior
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPagina(n)}
                    className={`w-9 h-9 rounded-lg text-sm border transition-colors ${
                      n === paginaActual
                        ? 'bg-ml-blue text-white border-ml-blue'
                        : 'border-gray-200 text-gray-600 hover:border-ml-blue hover:text-ml-blue'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-ml-blue hover:text-ml-blue transition-colors"
                >
                  Siguiente
                </button>
              </nav>
            )}
          </>
        ) : (
          <div className="py-20 text-center text-gray-400">
            <p className="text-4xl mb-4">🔍</p>
            <p>Ningún producto coincide con los filtros seleccionados.</p>
          </div>
        )}
      </div>
    </div>
  );
}

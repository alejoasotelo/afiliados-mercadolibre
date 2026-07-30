/**
 * Componente genérico para inyectar JSON-LD en el <head>
 * Uso: <JsonLd data={schemaObject} />
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data, null, 0) }}
    />
  );
}

// ─── Helpers para armar los schemas ──────────────────────────────────────────

export function buildProductSchema({
  nombre,
  descripcion,
  imagen,
  precio,
  moneda = 'ARS',
  condicion,
  marca,
  sku,
  url,
  reviewPromedio,
  reviewTotal,
  reviews,
}: {
  nombre: string;
  descripcion: string;
  imagen: string;
  precio?: number;
  moneda?: string;
  condicion: string;
  marca?: string;
  sku: string;
  url: string;
  reviewPromedio?: number;
  reviewTotal?: number;
  reviews?: Array<{ titulo: string; contenido: string; rating: number; fecha: string; autor?: string }>;
}) {
  const conditionMap: Record<string, string> = {
    Nuevo: 'https://schema.org/NewCondition',
    Usado: 'https://schema.org/UsedCondition',
  };

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: nombre,
    description: descripcion,
    image: imagen,
    sku,
    url,
    ...(marca && { brand: { '@type': 'Brand', name: marca } }),
    itemCondition: conditionMap[condicion] ?? 'https://schema.org/NewCondition',
  };

  if (precio) {
    schema.offers = {
      '@type': 'Offer',
      url,
      priceCurrency: moneda,
      price: precio.toString(),
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'tienda.alejosotelo.com.ar' },
    };
  }

  if (reviewPromedio && reviewTotal) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: reviewPromedio.toFixed(1),
      bestRating: '5',
      worstRating: '1',
      reviewCount: reviewTotal,
    };
  }

  if (reviews && reviews.length > 0) {
    schema.review = reviews.slice(0, 5).map((r) => ({
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
      name: r.titulo,
      reviewBody: r.contenido,
      datePublished: r.fecha,
      author: { '@type': 'Person', name: r.autor ?? 'Comprador verificado' },
    }));
  }

  return schema;
}

export function buildBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildItemListSchema(
  nombre: string,
  items: Array<{ nombre: string; url: string; imagen?: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: nombre,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.nombre,
      url: item.url,
      ...(item.imagen && { image: item.imagen }),
    })),
  };
}

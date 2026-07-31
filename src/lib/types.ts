// ─── Producto leído desde Google Sheets (carga manual) ───────────────────────
// Columnas: A:url_ml | B:slug | C:titulo | D:descripcion |
//           E:imagen_1 | F:imagen_2 | G:imagen_3 | H:marca | I:activo | J:relacionados | K:precio
export interface ProductoSheet {
  urlMl:       string;    // col A — URL del producto en MercadoLibre
  slug:        string;    // col B — slug para la URL del sitio
  titulo:      string;    // col C — título del producto
  descripcion: string;    // col D — descripción / texto SEO
  imagenes:    string[];  // cols E, F, G — hasta 3 URLs de imágenes
  marca:       string;    // col H — marca del producto
  // col I — activo (filtrado en sheets.ts, no se expone aquí)
  relacionados: string[]; // col J — slugs de productos relacionados (separados por coma)
  precio?:     number;    // col K — precio del producto
}

// ─── Categoría obtenida desde ML API ─────────────────────────────────────────
export interface MLCategoria {
  id: string;
  nombre: string;
  slug: string; // generado desde nombre
}

// ─── Categoría leída desde Google Sheets (tab "categorias", carga manual) ────
// Columnas: A:slug | B:titulo | C:descripcion | D:titulo_seo | E:descripcion_seo
export interface CategoriaSheet {
  slug:           string; // col A — ej: "zapatillas" o "zapatillas/chunky" (sin barra inicial)
  titulo:         string; // col B — título mostrado en la página de categoría
  descripcion:    string; // col C — descripción mostrada en la página de categoría
  tituloSeo:      string; // col D — <title> / og:title
  descripcionSeo: string; // col E — meta description / og:description
}

// ─── Datos del item desde ML API ─────────────────────────────────────────────
export interface MLItem {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  condition: 'new' | 'used' | 'not_specified';
  thumbnail: string;
  pictures: MLPicture[];
  permalink: string;
  category_id: string;
  attributes: MLAttribute[];
  seller_id: number;
}

export interface MLPicture {
  id: string;
  url: string;
  secure_url: string;
  size: string;
  max_size: string;
}

export interface MLAttribute {
  id: string;
  name: string;
  value_name: string | null;
}

// ─── Reviews de MercadoLibre ─────────────────────────────────────────────────
export interface MLRatingLevel {
  rating: number;
  amount: number;
}

export interface MLReview {
  id: string;
  title: string;
  content: string;
  rate: number;
  date_created: string;
  status: string;
  reviewer_name?: string;
}

export interface MLReviewsResponse {
  paging: { total: number; limit: number; offset: number };
  data: MLReview[];
  rating_average: number;
  reviews: MLReview[];
  rating_levels: MLRatingLevel[];
}

// ─── Producto completo (datos del Sheet enriquecidos) ────────────────────────
export interface ProductoCompleto {
  slug:        string;
  titulo:      string;
  descripcion: string;
  urlMl:       string;
  urlAfiliado: string;
  imagenes:    string[];
  marca:       string;
  relacionados: string[]; // slugs de productos relacionados
  // Campos adicionales para la página
  nombre:    string;      // alias de titulo
  precio?:   number;
  moneda:    string;
  stock:     boolean;
  condicion: string;
  permalink: string;
  categoria: MLCategoria;
  reviews?:  {
    promedio: number;
    total:    number;
    items:    MLReview[];
    niveles:  MLRatingLevel[];
  };
}

// ─── Producto leído desde Google Sheets (solo lo que carga el usuario) ────────
export interface ProductoSheet {
  mlItemId: string;       // col B — extraído automáticamente por Apps Script
  slug: string;           // col C — generado automáticamente por Apps Script
  descripcionSeo: string; // col D — texto SEO que escribe el usuario
  urlMl: string;          // col A — URL original pegada por el usuario
}

// ─── Categoría obtenida desde ML API ─────────────────────────────────────────
export interface MLCategoria {
  id: string;
  nombre: string;
  slug: string; // generado desde nombre
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

// ─── Producto completo (Sheet + ML API) ──────────────────────────────────────
export interface ProductoCompleto {
  // Del Sheet
  mlItemId: string;
  slug: string;
  descripcionSeo: string;
  urlMl: string;
  // De ML API
  nombre: string;
  precio?: number;
  moneda?: string;
  imagenes: string[];
  stock: boolean;
  condicion: string;
  marca?: string;
  urlAfiliado: string;
  permalink: string;
  categoria: MLCategoria;
  reviews?: {
    promedio: number;
    total: number;
    items: MLReview[];
    niveles: MLRatingLevel[];
  };
}

/**
 * AutoCompletar.gs
 * ─────────────────────────────────────────────────────────────────────────────
 * Trigger: onEdit instalable
 *
 * Cuando el usuario pega una URL de MercadoLibre en la columna A (url_ml)
 * del tab "productos", este script scrapea la página DIRECTAMENTE desde
 * Google Apps Script (IPs de Google, no bloqueadas por ML) y rellena:
 *   B → ml_item_id
 *   C → slug
 *   D → descripcion_seo (sugerida, editable)
 *   F → categoria_slug
 *
 * Columnas del sheet:
 *   A: url_ml | B: ml_item_id | C: slug | D: descripcion_seo | E: activo | F: categoria_slug
 *
 * ─── Instalación ─────────────────────────────────────────────────────────────
 * 1. En el Sheet: Extensiones → Apps Script
 * 2. Reemplazá todo el código con este archivo
 * 3. Guardá (Ctrl+S)
 * 4. Ejecutá instalarTrigger() UNA VEZ para registrar el trigger
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SHEET_NAME = 'productos';

// Columnas (base 1)
const COL_URL_ML    = 1; // A
const COL_ITEM_ID   = 2; // B
const COL_SLUG      = 3; // C
const COL_DESC_SEO  = 4; // D
// COL_ACTIVO = 5          // E — no se toca
const COL_CATEGORIA = 6; // F

// ─── Trigger principal ────────────────────────────────────────────────────────

function onEditInstalable(e) {
  try {
    const sheet = e.source.getActiveSheet();
    if (sheet.getName() !== SHEET_NAME) return;

    const col = e.range.getColumn();
    const row = e.range.getRow();

    // Solo actuar cuando se edita la columna A y no es el encabezado
    if (col !== COL_URL_ML || row <= 1) return;

    const urlMl = (e.value || '').trim();
    if (!urlMl || !urlMl.includes('mercadolibre')) return;

    // Si B ya tiene valor, no sobreescribir
    const existingId = sheet.getRange(row, COL_ITEM_ID).getValue();
    if (existingId) return;

    // Scrapear directamente desde Apps Script
    const datos = scrapearML(urlMl);

    if (!datos) {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        'No se pudo obtener datos. Completá manualmente.',
        '⚠️ AutoCompletar', 5
      );
      return;
    }

    // Rellenar columnas
    if (datos.mlItemId)      sheet.getRange(row, COL_ITEM_ID).setValue(datos.mlItemId);
    if (datos.slug)          sheet.getRange(row, COL_SLUG).setValue(datos.slug);
    if (datos.categoriaSlug) sheet.getRange(row, COL_CATEGORIA).setValue(datos.categoriaSlug);

    // Descripción SEO solo si D está vacío
    const descActual = sheet.getRange(row, COL_DESC_SEO).getValue();
    if (!descActual && datos.titulo) {
      sheet.getRange(row, COL_DESC_SEO).setValue(generarDescSeo(datos));
    }

    SpreadsheetApp.getActiveSpreadsheet().toast(
      '✅ ' + (datos.titulo || datos.slug),
      'AutoCompletar', 4
    );

  } catch (err) {
    console.error('AutoCompletar error:', err);
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Error: ' + err.message,
      '⚠️ AutoCompletar', 6
    );
  }
}

// ─── Scraper (corre en servidores de Google, no bloqueados por ML) ────────────

function scrapearML(rawUrl) {
  // 1. Limpiar URL: quitar fragment (#...) y query params superfluos
  const sinFragment = rawUrl.split('#')[0];
  let urlLimpia = sinFragment;
  let itemIdOverride = null;

  try {
    // Extraer item_id de pdp_filters si existe
    // Formato: pdp_filters=item_id%3AMLA806605522  o  item_id:MLA806605522
    const qIndex = sinFragment.indexOf('?');
    if (qIndex !== -1) {
      const qs = sinFragment.substring(qIndex + 1);
      const pdpMatch = qs.match(/pdp_filters=([^&]+)/);
      if (pdpMatch) {
        const decoded = decodeURIComponent(pdpMatch[1]);
        const idMatch = decoded.match(/item_id[:%](MLA[A-Z]*\d+)/i);
        if (idMatch) itemIdOverride = idMatch[1].toUpperCase();
      }
      urlLimpia = sinFragment.substring(0, qIndex);
    }
  } catch (e) {
    // Si falla el parseo, usamos la URL tal cual
  }

  // 2. Extraer item ID desde el pathname si no vino de pdp_filters
  const mlItemId = itemIdOverride || extraerItemId(urlLimpia);

  // 3. Fetch a la página de ML
  let html;
  try {
    const resp = UrlFetchApp.fetch(urlLimpia, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
      }
    });

    const status = resp.getResponseCode();
    if (status !== 200) {
      console.warn('ML respondió ' + status + ' para ' + urlLimpia);
      return null;
    }
    html = resp.getContentText();
  } catch (e) {
    console.error('Error al fetch ML:', e);
    return null;
  }

  // 4. Extraer bloques JSON-LD
  const bloques = [];
  const regex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = regex.exec(html)) !== null) {
    try { bloques.push(JSON.parse(m[1])); } catch (e) { /* ignorar */ }
  }

  // Aplanar @graph
  const todos = [];
  bloques.forEach(function(b) {
    if (b['@graph'] && Array.isArray(b['@graph'])) {
      b['@graph'].forEach(function(item) { todos.push(item); });
    } else {
      todos.push(b);
    }
  });

  const product    = todos.find(function(b) { return b['@type'] === 'Product'; });
  const breadcrumb = todos.find(function(b) { return b['@type'] === 'BreadcrumbList'; });

  if (!product) {
    console.warn('No se encontró JSON-LD Product en: ' + urlLimpia);
    return null;
  }

  // 5. Extraer datos del producto
  const titulo = String(product['name'] || '');
  const slug   = generarSlug(titulo).substring(0, 60);

  // Imágenes
  const rawImg = product['image'];
  let imagenes = [];
  if (Array.isArray(rawImg)) {
    imagenes = rawImg.map(function(img) {
      return typeof img === 'string' ? img : (img.url || img.contentUrl || '');
    }).filter(Boolean);
  } else if (typeof rawImg === 'string') {
    imagenes = [rawImg];
  }

  // Precio
  const rawOffer = product['offers'];
  const offer = Array.isArray(rawOffer) ? rawOffer[0] : rawOffer;
  const precio  = offer && offer.price ? parseFloat(String(offer.price)) : null;
  const moneda  = (offer && offer.priceCurrency) ? String(offer.priceCurrency) : 'ARS';
  const stock   = offer ? String(offer.availability || '').indexOf('InStock') !== -1 : false;

  // Condición
  const condStr = String(product['itemCondition'] || '');
  const condicion = condStr.indexOf('NewCondition') !== -1 ? 'Nuevo'
    : condStr.indexOf('UsedCondition') !== -1 ? 'Usado' : 'Nuevo';

  // Marca
  const brandRaw = product['brand'];
  const marca = typeof brandRaw === 'string'
    ? brandRaw
    : (brandRaw && brandRaw.name ? brandRaw.name : '');

  // Categoría desde BreadcrumbList
  let categoriaNombre = '';
  let categoriaSlug   = '';
  const items = (breadcrumb && Array.isArray(breadcrumb.itemListElement))
    ? breadcrumb.itemListElement : [];
  if (items.length >= 2) {
    const catItem = items[items.length - 2];
    categoriaNombre = (catItem.item && catItem.item.name)
      ? catItem.item.name
      : (catItem.name || '');
    categoriaSlug = generarSlug(categoriaNombre);
  }

  return {
    mlItemId: mlItemId,
    titulo: titulo,
    slug: slug,
    imagenes: imagenes,
    precio: precio,
    moneda: moneda,
    stock: stock,
    condicion: condicion,
    marca: marca,
    categoriaNombre: categoriaNombre,
    categoriaSlug: categoriaSlug,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extraerItemId(url) {
  var m = url.match(/\/(?:up\/|p\/)?(MLA[A-Z]*\d+)(?:[?#\/]|$)/i)
         || url.match(/item_id=(MLA[A-Z]*\d+)/i);
  return m ? m[1].toUpperCase() : null;
}

function generarSlug(texto) {
  return texto
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

function generarDescSeo(datos) {
  var partes = [];
  if (datos.titulo)          partes.push(datos.titulo + '.');
  if (datos.marca)           partes.push('Marca: ' + datos.marca + '.');
  if (datos.condicion)       partes.push(datos.condicion + '.');
  if (datos.stock)           partes.push('En stock.');
  if (datos.categoriaNombre) partes.push('Categoría: ' + datos.categoriaNombre + '.');
  partes.push('Compralo en MercadoLibre con envío a todo el país.');
  return partes.join(' ');
}

// ─── Instalador del trigger ───────────────────────────────────────────────────
// Ejecutar SOLO UNA VEZ desde el editor de Apps Script

function instalarTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'onEditInstalable') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('onEditInstalable')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Trigger instalado correctamente.',
    '✅ AutoCompletar', 3
  );
}

// ─── Test manual (ejecutar desde el editor para probar) ───────────────────────

function testScraping() {
  var url = 'https://www.mercadolibre.com.ar/boton-de-arranque-star-stop-vw-polo-virtus-nivus-original/up/MLAU3701954116';
  var datos = scrapearML(url);
  console.log(JSON.stringify(datos, null, 2));
}

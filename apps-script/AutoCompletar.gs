/**
 * AutoCompletar.gs
 * ─────────────────────────────────────────────────────────────────────────────
 * Trigger: onEdit simple (instalable)
 *
 * Cuando el usuario pega una URL de MercadoLibre en la columna A (url_ml)
 * del tab "productos", este script llama a /api/scrape y rellena
 * automáticamente:
 *   B → ml_item_id
 *   C → slug
 *   F → categoria_slug
 *
 * El usuario solo tiene que completar D (descripcion_seo) y poner "si" en E.
 *
 * Columnas del sheet:
 *   A: url_ml | B: ml_item_id | C: slug | D: descripcion_seo | E: activo | F: categoria_slug
 *
 * ─── Instalación ─────────────────────────────────────────────────────────────
 * 1. En el Sheet: Extensiones → Apps Script
 * 2. Pegar este código
 * 3. Cambiar SITE_URL por la URL de tu sitio en Cloudflare Pages
 * 4. Guardar
 * 5. Ejecutar instalarTrigger() UNA VEZ para registrar el trigger
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SITE_URL   = 'https://afiliados-mercadolibre.pages.dev'; // ← cambiá esto
const SHEET_NAME = 'productos';

// Columnas (base 1)
const COL_URL_ML     = 1; // A
const COL_ITEM_ID    = 2; // B
const COL_SLUG       = 3; // C
const COL_DESC_SEO   = 4; // D
// COL_ACTIVO = 5           // E — no se toca
const COL_CATEGORIA  = 6; // F

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

    // Si B ya tiene valor, no sobreescribir (el usuario lo limpió a propósito)
    const existingId = sheet.getRange(row, COL_ITEM_ID).getValue();
    if (existingId) return;

    // Llamar a la API de scraping
    const apiUrl  = SITE_URL + '/api/scrape?url=' + encodeURIComponent(urlMl);
    const resp    = UrlFetchApp.fetch(apiUrl, { muteHttpExceptions: true });
    const status  = resp.getResponseCode();

    if (status !== 200) {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        'Error ' + status + ' al scrapear ML. Completá manualmente.',
        '⚠️ AutoCompletar',
        5
      );
      return;
    }

    const datos = JSON.parse(resp.getContentText());

    // Rellenar columnas
    if (datos.mlItemId)      sheet.getRange(row, COL_ITEM_ID).setValue(datos.mlItemId);
    if (datos.slug)          sheet.getRange(row, COL_SLUG).setValue(datos.slug);
    if (datos.categoriaSlug) sheet.getRange(row, COL_CATEGORIA).setValue(datos.categoriaSlug);

    // Sugerir descripción SEO solo si D está vacío
    const descActual = sheet.getRange(row, COL_DESC_SEO).getValue();
    if (!descActual && datos.titulo) {
      const descSugerida = generarDescSeo(datos);
      sheet.getRange(row, COL_DESC_SEO).setValue(descSugerida);
    }

    SpreadsheetApp.getActiveSpreadsheet().toast(
      '✅ ' + (datos.titulo || datos.slug),
      'AutoCompletar',
      4
    );

  } catch (err) {
    console.error('AutoCompletar error:', err);
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Error inesperado: ' + err.message,
      '⚠️ AutoCompletar',
      5
    );
  }
}

// ─── Descripción SEO sugerida ─────────────────────────────────────────────────

function generarDescSeo(datos) {
  const partes = [];
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
  // Eliminar triggers anteriores con el mismo nombre para evitar duplicados
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
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
    '✅ AutoCompletar',
    3
  );
}

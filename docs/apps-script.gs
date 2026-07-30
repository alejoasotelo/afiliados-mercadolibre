/**
 * ============================================================
 * GOOGLE APPS SCRIPT — Automatización del Sheet de Productos
 * ============================================================
 *
 * INSTALACIÓN:
 * 1. Abrí tu Google Sheet
 * 2. Extensiones → Apps Script
 * 3. Pegá todo este código en el editor
 * 4. Completá las constantes de configuración abajo
 * 5. Guardá (Ctrl+S)
 * 6. Ejecutá "instalarTriggers" UNA SOLA VEZ (menú Ejecutar → instalarTriggers)
 * 7. Aceptá los permisos que pide Google
 *
 * ESTRUCTURA ESPERADA DEL SHEET "productos":
 * A: url_ml        → Pegás la URL del producto de ML (ej: https://articulo.mercadolibre.com.ar/MLA-...)
 * B: ml_item_id    → Se completa AUTOMÁTICAMENTE
 * C: slug          → Se completa AUTOMÁTICAMENTE (desde el título del item en ML)
 * D: descripcion_seo → Lo escribís vos (texto SEO del producto)
 * E: activo        → Escribís "si" cuando querés publicarlo → dispara el deploy
 *
 * FILA 1 = ENCABEZADOS (no se procesa)
 */

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────

var CONFIG = {
  // Webhook de Cloudflare Pages Deploy Hook
  // Lo obtenés en: CF Dashboard → Pages → tu proyecto → Settings → Builds & deployments → Deploy Hooks
  // Hacé clic en "Add deploy hook", dale un nombre (ej: "sheet-trigger"), copiá la URL
  CLOUDFLARE_DEPLOY_HOOK: 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/c231ad47-5a97-4c0b-a033-51bed41c8378',

  // Nombre del tab de productos en el Sheet
  SHEET_PRODUCTOS: 'productos',

  // Columnas (índice base 1)
  COL_URL_ML:        1,  // A
  COL_ML_ITEM_ID:    2,  // B
  COL_SLUG:          3,  // C
  COL_DESC_SEO:      4,  // D
  COL_ACTIVO:        5,  // E

  // API de MercadoLibre (no requiere autenticación para datos públicos)
  ML_API_BASE: 'https://api.mercadolibre.com',
};

// ─── TRIGGER PRINCIPAL ───────────────────────────────────────────────────────

/**
 * Se ejecuta automáticamente cuando el usuario edita una celda.
 * No lo ejecutes manualmente — lo instala instalarTriggers().
 */
function onEdit(e) {
  if (!e) return;
  var sheet = e.range.getSheet();
  if (sheet.getName() !== CONFIG.SHEET_PRODUCTOS) return;

  var row = e.range.getRow();
  var col = e.range.getColumn();
  if (row === 1) return; // encabezados

  // Caso 1: el usuario pegó una URL en la columna A
  if (col === CONFIG.COL_URL_ML) {
    var url = e.value ? e.value.toString().trim() : '';
    if (url.startsWith('http')) {
      procesarUrlML(sheet, row, url);
    }
  }

  // Caso 2: el usuario escribió "si" en la columna activo (E)
  if (col === CONFIG.COL_ACTIVO) {
    var valor = e.value ? e.value.toString().toLowerCase().trim() : '';
    if (valor === 'si') {
      // Verificar que tenga item ID (si no tiene, esperar a que se complete)
      var itemId = sheet.getRange(row, CONFIG.COL_ML_ITEM_ID).getValue();
      if (itemId) {
        triggerDeploy('Producto activado: ' + itemId);
      } else {
        // Guardar que hay un deploy pendiente para cuando se complete el item ID
        PropertiesService.getScriptProperties().setProperty('DEPLOY_PENDING_ROW_' + row, 'si');
      }
    }
  }
}

// ─── PROCESAR URL DE MERCADOLIBRE ─────────────────────────────────────────────

function procesarUrlML(sheet, row, url) {
  try {
    // 1. Extraer el item ID de la URL
    var itemId = extraerItemId(url);
    if (!itemId) {
      mostrarError(sheet, row, 'URL inválida: no se encontró el ID del item de ML');
      return;
    }

    // 2. Marcar como procesando
    sheet.getRange(row, CONFIG.COL_ML_ITEM_ID).setValue('Cargando...');
    SpreadsheetApp.flush();

    // 3. Obtener datos del item desde ML API
    var itemData = fetchMLItem(itemId);
    if (!itemData) {
      mostrarError(sheet, row, 'No se pudo obtener el item de ML. Verificá la URL.');
      return;
    }

    // 4. Guardar el item ID real (ML puede redirigir a otro ID)
    var realItemId = itemData.id || itemId;
    sheet.getRange(row, CONFIG.COL_ML_ITEM_ID).setValue(realItemId);

    // 5. Generar slug único desde el título
    var titulo = itemData.title || '';
    var slug = generarSlugUnico(sheet, titulo, row);
    sheet.getRange(row, CONFIG.COL_SLUG).setValue(slug);

    // 6. Colorear la fila para indicar que fue procesada correctamente
    sheet.getRange(row, CONFIG.COL_URL_ML, 1, CONFIG.COL_ACTIVO)
      .setBackground('#e8f5e9'); // verde clarito

    // 7. Si había un deploy pendiente para esta fila, dispararlo ahora
    var deployPending = PropertiesService.getScriptProperties()
      .getProperty('DEPLOY_PENDING_ROW_' + row);
    if (deployPending) {
      PropertiesService.getScriptProperties().deleteProperty('DEPLOY_PENDING_ROW_' + row);
      triggerDeploy('Producto activado (pending): ' + realItemId);
    }

    SpreadsheetApp.flush();
    SpreadsheetApp.getActiveSpreadsheet().toast(
      '✅ Producto cargado: ' + titulo.substring(0, 60) + '...',
      'MercadoLibre',
      5
    );

  } catch (err) {
    mostrarError(sheet, row, 'Error: ' + err.message);
  }
}

// ─── EXTRAER ITEM ID DESDE URL ────────────────────────────────────────────────

function extraerItemId(url) {
  // Formatos soportados:
  // https://articulo.mercadolibre.com.ar/MLA-1234567890-titulo-del-producto
  // https://www.mercadolibre.com.ar/.../p/MLA1234567890
  // https://mercadolibre.com.ar/MLA1234567890
  // https://articulo.mercadolibre.com.ar/MLA1234567890

  // Buscar patrón MLA seguido de guión opcional y dígitos
  var match = url.match(/MLA[-]?(\d+)/i);
  if (match) {
    return 'MLA' + match[1]; // normalizar sin guión
  }
  return null;
}

// ─── FETCH ML API ─────────────────────────────────────────────────────────────

function fetchMLItem(itemId) {
  try {
    var response = UrlFetchApp.fetch(
      CONFIG.ML_API_BASE + '/items/' + itemId,
      { muteHttpExceptions: true }
    );
    if (response.getResponseCode() !== 200) return null;
    return JSON.parse(response.getContentText());
  } catch (e) {
    return null;
  }
}

// ─── GENERAR SLUG ÚNICO ───────────────────────────────────────────────────────

function generarSlugUnico(sheet, titulo, rowActual) {
  var slug = generarSlug(titulo);

  // Verificar que no exista ya en otra fila
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return slug;

  var slugsExistentes = sheet.getRange(2, CONFIG.COL_SLUG, lastRow - 1, 1)
    .getValues()
    .map(function(r) { return r[0].toString(); });

  var slugFinal = slug;
  var contador = 2;

  while (slugsExistentes.some(function(s, i) {
    // ignorar la fila actual
    return s === slugFinal && (i + 2) !== rowActual;
  })) {
    slugFinal = slug + '-' + contador;
    contador++;
  }

  return slugFinal;
}

function generarSlug(texto) {
  return texto
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // eliminar acentos
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')     // solo letras, números, espacios, guiones
    .trim()
    .replace(/\s+/g, '-')             // espacios → guiones
    .replace(/-+/g, '-')              // múltiples guiones → uno
    .substring(0, 80);                // máximo 80 chars
}

// ─── TRIGGER CLOUDFLARE DEPLOY ────────────────────────────────────────────────

function triggerDeploy(motivo) {
  try {
    var hookUrl = CONFIG.CLOUDFLARE_DEPLOY_HOOK;
    if (!hookUrl || hookUrl.includes('TU_HOOK_ID_AQUI')) {
      Logger.log('⚠️ Deploy Hook no configurado. Configurá CLOUDFLARE_DEPLOY_HOOK en CONFIG.');
      return;
    }

    var response = UrlFetchApp.fetch(hookUrl, {
      method: 'POST',
      muteHttpExceptions: true,
      payload: JSON.stringify({ motivo: motivo }),
      contentType: 'application/json',
    });

    var code = response.getResponseCode();
    if (code === 200 || code === 201) {
      Logger.log('✅ Deploy disparado: ' + motivo);
      SpreadsheetApp.getActiveSpreadsheet().toast(
        '🚀 Cloudflare está actualizando el sitio (aprox. 30 segundos)',
        'Deploy iniciado',
        8
      );
    } else {
      Logger.log('❌ Error al disparar deploy: HTTP ' + code + ' — ' + response.getContentText());
    }
  } catch (err) {
    Logger.log('❌ Error en triggerDeploy: ' + err.message);
  }
}

// ─── TRIGGER MANUAL: deploy ahora ────────────────────────────────────────────

/**
 * Podés ejecutar esta función manualmente desde el menú Apps Script
 * si querés forzar un rebuild sin editar el Sheet.
 */
function deployManual() {
  triggerDeploy('Deploy manual desde Apps Script');
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function mostrarError(sheet, row, mensaje) {
  sheet.getRange(row, CONFIG.COL_ML_ITEM_ID).setValue('❌ ' + mensaje);
  sheet.getRange(row, CONFIG.COL_URL_ML, 1, CONFIG.COL_ACTIVO)
    .setBackground('#ffebee'); // rojo clarito
  SpreadsheetApp.flush();
}

// ─── SETUP: crear encabezados + instalar triggers ─────────────────────────────

/**
 * Ejecutar UNA SOLA VEZ después de pegar el código.
 * Crea los encabezados en el Sheet y registra el trigger onEdit.
 */
function instalarTriggers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Crear tab "productos" si no existe
  var sheet = ss.getSheetByName(CONFIG.SHEET_PRODUCTOS);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_PRODUCTOS);
  }

  // Escribir encabezados si la fila 1 está vacía
  var primeraCelda = sheet.getRange('A1').getValue();
  if (!primeraCelda) {
    sheet.getRange('A1:E1').setValues([[
      'url_ml', 'ml_item_id', 'slug', 'descripcion_seo', 'activo'
    ]]);
    sheet.getRange('A1:E1')
      .setFontWeight('bold')
      .setBackground('#1a73e8')
      .setFontColor('#ffffff');
    sheet.setColumnWidth(1, 400); // url_ml
    sheet.setColumnWidth(2, 160); // ml_item_id
    sheet.setColumnWidth(3, 180); // slug
    sheet.setColumnWidth(4, 400); // descripcion_seo
    sheet.setColumnWidth(5, 80);  // activo
  }

  // Eliminar triggers existentes para no duplicar
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'onEdit') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Instalar trigger onEdit instalable (necesario para UrlFetchApp)
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  SpreadsheetApp.getActiveSpreadsheet().toast(
    '✅ Todo listo. Pegá URLs de MercadoLibre en la columna A.',
    'Configuración completa',
    10
  );
  Logger.log('Triggers instalados correctamente.');
}

// ─── UTILIDAD: re-procesar una fila manualmente ───────────────────────────────

/**
 * Si una fila falló, seleccioná cualquier celda de esa fila y ejecutá esta función.
 */
function reprocesarFilaSeleccionada() {
  var sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== CONFIG.SHEET_PRODUCTOS) {
    SpreadsheetApp.getUi().alert('Seleccioná una celda en el tab "' + CONFIG.SHEET_PRODUCTOS + '"');
    return;
  }
  var row = sheet.getActiveRange().getRow();
  if (row <= 1) return;

  var url = sheet.getRange(row, CONFIG.COL_URL_ML).getValue().toString().trim();
  if (!url) {
    SpreadsheetApp.getUi().alert('La celda A' + row + ' está vacía.');
    return;
  }
  // Limpiar el item_id y slug para que se regeneren
  sheet.getRange(row, CONFIG.COL_ML_ITEM_ID).setValue('');
  sheet.getRange(row, CONFIG.COL_SLUG).setValue('');
  procesarUrlML(sheet, row, url);
}

// ─── MENU PERSONALIZADO ───────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🛒 Afiliados ML')
    .addItem('🚀 Deploy manual a Cloudflare', 'deployManual')
    .addItem('🔄 Reprocesar fila seleccionada', 'reprocesarFilaSeleccionada')
    .addSeparator()
    .addItem('⚙️ Reinstalar triggers', 'instalarTriggers')
    .addToUi();
}

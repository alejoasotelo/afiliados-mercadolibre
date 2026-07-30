# Estructura del Google Spreadsheet

## Lo que completás vos (solo 2 columnas)

| Columna | Lo que hacés |
|---|---|
| A `url_ml` | **Pegás** la URL del producto de MercadoLibre |
| D `descripcion_seo` | **Escribís** por qué recomendás el producto (texto SEO) |
| E `activo` | Escribís **`si`** cuando querés publicarlo |

**Eso es todo.** El resto lo hace el Apps Script automáticamente:

| Columna | Lo que hace Apps Script |
|---|---|
| B `ml_item_id` | Extrae el ID del item desde la URL (ej: `MLA1234567890`) |
| C `slug` | Genera la URL amigable desde el título del producto en ML (ej: `sony-wh-1000xm5`) |

**Y el sitio web obtiene automáticamente desde ML API:**
- Título, precio, imágenes, stock, condición, marca
- Categoría (usada para agrupar en la home y en la URL)
- Reviews y calificaciones de compradores

---

## Flujo completo

```
1. Pegás URL de ML en columna A
        ↓
2. Apps Script fetchea el item de ML
        ↓
3. Extrae item ID → columna B
   Genera slug único → columna C
        ↓
4. Escribís tu descripción SEO en columna D
        ↓
5. Escribís "si" en columna E (activo)
        ↓
6. Apps Script llama al Deploy Hook de Cloudflare
        ↓
7. Cloudflare rebuilds el sitio (~30 segundos)
        ↓
8. El producto aparece en la web ✅
```

---

## URLs de ML soportadas

Cualquier formato funciona:
```
https://articulo.mercadolibre.com.ar/MLA-1234567890-titulo-del-producto
https://www.mercadolibre.com.ar/.../p/MLA1234567890
https://mercadolibre.com.ar/...MLA1234567890...
```

---

## Setup inicial

### 1. Crear el Google Sheet
1. Crear un nuevo spreadsheet en Google Sheets
2. Ir a Extensiones → Apps Script
3. Pegar el contenido de `docs/apps-script.gs`
4. Completar `CLOUDFLARE_DEPLOY_HOOK` en la sección `CONFIG` del script
5. Guardar (Ctrl+S)
6. Ejecutar → `instalarTriggers` (solo una vez)
7. Aceptar los permisos

### 2. Permisos del Sheet
El sheet debe ser **público de solo lectura**:
- Compartir → Cualquier persona con el link puede **ver**

### 3. Variables de entorno
Completar `.env.local` con:
- `GOOGLE_SHEETS_API_KEY` — API Key de Google Cloud Console
- `GOOGLE_SPREADSHEET_ID` — ID del spreadsheet (de la URL)
- `ML_AFFILIATE_ID` — tu ID de afiliado de ML Partners

### 4. Obtener el Deploy Hook de Cloudflare
1. Ir al dashboard de Cloudflare Pages → tu proyecto
2. Settings → Builds & deployments → Deploy Hooks
3. "Add deploy hook" → nombre: `sheet-trigger`
4. Copiar la URL del hook
5. Pegarla en `CLOUDFLARE_DEPLOY_HOOK` dentro del Apps Script

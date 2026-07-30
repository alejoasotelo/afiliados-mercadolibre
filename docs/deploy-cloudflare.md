# Deploy en Cloudflare Pages

## 1. Preparar el repo

```bash
git init
git add .
git commit -m "feat: initial commit"
# Subir a GitHub / GitLab
```

## 2. Instalar dependencias

```bash
npm install
```

## 3. Build para Cloudflare Pages

```bash
npm run pages:build
# Genera .vercel/output/static con el build adaptado
```

## 4. Crear proyecto en Cloudflare Pages

1. Entrá a https://dash.cloudflare.com → Pages
2. "Create a project" → "Connect to Git"
3. Seleccioná tu repo
4. Configurá:
   - **Framework preset**: Next.js
   - **Build command**: `npx @cloudflare/next-on-pages`
   - **Build output directory**: `.vercel/output/static`
   - **Node.js version**: 20

## 5. Variables de entorno en Cloudflare

En Settings → Environment variables agregá:
- `GOOGLE_SHEETS_API_KEY`
- `GOOGLE_SPREADSHEET_ID`
- `ML_AFFILIATE_ID`
- `NEXT_PUBLIC_SITE_URL` = `https://tienda.alejosotelo.com.ar`
- `NEXT_PUBLIC_SITE_NAME`

## 6. Dominio personalizado

En Cloudflare Pages → Custom domains:
- Agregá `tienda.alejosotelo.com.ar`
- Cloudflare configura automáticamente el DNS si tu dominio ya está en Cloudflare
- Si no, agregá el CNAME que te da CF en tu DNS actual

## 7. Compatibilidad con Edge Runtime

El archivo `wrangler.toml` ya tiene `nodejs_compat` habilitado.
Si algún módulo de Node no funciona en el edge, el error te lo va a indicar en el build.

> ⚠️ El paquete `googleapis` usa APIs de Node que pueden no funcionar en el edge.
> La implementación actual usa fetch directo a la Sheets API REST (sin el SDK),
> por lo que es compatible con Cloudflare Workers.

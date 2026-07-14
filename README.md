# thegrey.berlin – Website

Handcrafted custom rugs from Berlin. Bilingual static website (DE primary, EN secondary). Hosted via Cloudflare Pages with auto-deploy from GitHub.

## File structure

### German (default at canonical URLs)
- `index.html` – Homepage
- `impressum.html` – Imprint (§5 TMG)
- `datenschutz.html` – Privacy Policy (GDPR)

### English
- `index-en.html` – Homepage
- `imprint.html` – Imprint (English translation)
- `privacy.html` – Privacy Policy (English translation)

### Wanna Do Collection (PRÓPRIO N°4 — einzige Kollektion)
Eine einzelne, ruhige Kollektionsseite: ein Hero-Bild (frei austauschbar über `hero_id`),
darunter ein editorialer Stream der übrigen 7 Entwürfe. Kein Kapitel-Umschalter, keine
Filterzeile, keine zweite Bildwelt — bewusst reduziert gegenüber den Vorgängerversionen
(Campo/Trama, siehe Git-Historie). Klick auf eine Karte öffnet ein Overlay per History-API.
Jeder der 8 Entwürfe hat zusätzlich einen eigenen Permalink, der dieselbe Seite mit bereits
geöffnetem Overlay **und vollem Text im rohen HTML** rendert (SEO/Teilen, kein JS nötig für
den Inhalt) — inklusive dem Hero-Entwurf selbst (klickbares Hero-Bild).

- `wanna-do-collection/` – Hero + Stream (`index.html`) + 8 Permalink-Ordner (`<id>/index.html`,
  z. B. `proprio-03-giro/`)
- `data/designs.json` – **maßgebliche Datenquelle**: `kollektion` (`hero_id`, `reihenfolge[]`,
  `prozess[]`, Claim) + `entwuerfe[]` (8, Feld heißt `grund` statt `fond`, eine Bildwelt `bilder`)
- `images/` – 8 Entwürfe, WebP 400/800/1500 + JPEG-Fallback
- `downloads/` – 1 Konzept-PDF (PRÓPRIO)
- `scripts/build-proprio.mjs` – Generator: baut Hero/Stream + alle 8 Permalinks, injiziert den
  Teaser in `index.html`/`index-en.html` (Marker `WANNA-DO-TEASER:START/END`) und schreibt die
  `sitemap.xml` neu. **Nichts in `wanna-do-collection/` von Hand editieren** — stattdessen
  `data/designs.json` oder das Script ändern und `node scripts/build-proprio.mjs` ausführen.
- `_redirects` – 301-Redirects alter Galerie-/Kollektions-Pfade auf `/wanna-do-collection/`
  (Root-Pfad bleibt bestehen, zeigt jetzt PRÓPRIO statt der früheren Kollektionen)

### Legacy redirects
0-second redirects to preserve old bookmarks:
- `index-de.html` → `index.html`
- `impressum-de.html` → `impressum.html`
- `datenschutz-de.html` → `datenschutz.html`

## Tech

- Pure HTML/CSS/JS, no build step
- Fonts: Archivo (headings) + Inter (body) via Google Fonts
- Images: hot-linked from a Wix CDN (placeholder, replace with own assets when ready)
- Fully responsive, mobile burger menu
- SEO: hreflang + canonical tags on all main pages, German set as `x-default`

## Before going live (or before next deploy)

1. **Hosting provider**: Open `datenschutz.html` and `privacy.html` and fill in the highlighted yellow placeholder for the hosting provider (DSGVO/GDPR requirement). For Cloudflare Pages, you can use: `Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, USA`.
2. **Contact form**: The form currently triggers only a JavaScript alert. To actually receive submissions, wire it up to Formspree, Cloudflare Workers, or another endpoint.
3. **Images**: Hero/logo images are hot-linked from a Wix CDN. Replace with your own images and update the `src` attributes in `index.html` and `index-en.html`. (Die CAMPO-Kollektionsbilder liegen bereits lokal unter `images/campo/`.)

## License

© 2026 thegrey.berlin – All rights reserved.

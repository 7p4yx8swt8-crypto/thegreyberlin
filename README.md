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

### Wanna Do Collection (Campo N°1 + Trama N°2)
Editorialer Edition-Stream (kein Seiten-Hopping): ein Stream mit Kapitel-Umschalter
„Campo N°1 / Trama N°2 / Alles", Filterzeile (Suche, Stimmung, Farbe, Typ, Format, Special),
Klick auf eine Karte öffnet ein Overlay per History-API. Jeder der 39 Entwürfe hat zusätzlich
einen eigenen Permalink, der denselben Stream mit bereits geöffnetem Overlay **und vollem
Text im rohen HTML** rendert (SEO/Teilen, kein JS nötig für den Inhalt).

- `wanna-do-collection/` – der Stream (`index.html`) + 39 Permalink-Ordner (`<id>/index.html`,
  z. B. `campo-01-horizonte/`, `trama-07-ponto/`)
- `data/designs.json` – **maßgebliche Datenquelle**: `kollektionen[]` (Campo/Trama, je mit
  `edition_stream[]`), `serien[]` (5 Campo-Serien + 2 Trama-Reihen), `entwuerfe[]` (39, inkl.
  `stimmungen`, `farbwelten`, `special`, zwei Bildwelten `bilder`/`bilder_real`)
- `images-real/` – **primäre Bildwelt** (Woll-Renderings) · `images/` – cleane Plan-Draufsichten
  (Spezifikations-Ansicht im Overlay, per Toggle)
- `downloads/` – 6 Serien-/Reihen-Konzept-PDFs + Farbkarte
- `scripts/build-wanna-do-v2.mjs` – Generator: baut Stream + alle 39 Permalinks, injiziert den
  Teaser in `index.html`/`index-en.html` (Marker `WANNA-DO-TEASER:START/END`) und schreibt die
  `sitemap.xml` neu. **Nichts in `wanna-do-collection/` von Hand editieren** — stattdessen
  `data/designs.json` oder das Script ändern und `node scripts/build-wanna-do-v2.mjs` ausführen.
- `_redirects` – 301-Redirects alter Galerie-Pfade; die 4 v1-Serienseiten leiten auf
  `/wanna-do-collection/?serie=<key>`, die 22 v1-Detailseiten-Pfade dienen unverändert als
  Permalinks der neuen Struktur (kein Redirect nötig)

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

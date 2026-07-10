#!/usr/bin/env node
/**
 * Build-Script: Wanna Do Collection (CAMPO) für thegrey.berlin
 *
 * Erzeugt aus data/designs.json:
 *   wanna-do-collection/index.html                Landing der Kollektion
 *   wanna-do-collection/<serie_key>/index.html    4 Serien-Galerien
 *   wanna-do-collection/<id>/index.html           22 Detailseiten
 *   sitemap.xml                                   komplette Sitemap
 * und injiziert den Kollektions-Teaser in index.html / index-en.html
 * zwischen den Markern <!-- WANNA-DO-TEASER:START/END -->.
 *
 * Aufruf: node scripts/build-wanna-do.mjs   (vom Repo-Root)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = JSON.parse(readFileSync(join(ROOT, 'data/designs.json'), 'utf8'));
const ORIGIN = 'https://www.thegrey.berlin';
const BASE = '/wanna-do-collection';

const SERIEN_PDF = {
  'serie-1-fond': 'thegrey-wannado-campo-konzept.pdf',
  'serie-2-cheio': 'thegrey-wannado-campo-cheio-konzept.pdf',
  'serie-3-amanha': 'thegrey-wannado-campo-amanha-konzept.pdf',
  'serie-4-elo': 'thegrey-wannado-campo-elo-konzept.pdf',
};
const FARBKARTE_PDF = 'thegrey-wannado-campo-farbkarte.pdf';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nn = (n) => String(n).padStart(2, '0');
const img = (kitPath) => '/images/campo/' + kitPath.split('/').pop();

/* Bildmaße aus format_cm ableiten (Renderings folgen exakt dem Seitenverhältnis, Breite 1500/800/400) */
function dims(e, w) {
  const m = e.format_cm.match(/(\d+)\s*×\s*(\d+)/);
  const ratio = m ? Number(m[2]) / Number(m[1]) : 1.5;
  return { w, h: Math.round(w * ratio) };
}

function picture(e, { sizes, eager = false, fetchpriority = false, maxWidth = 800 }) {
  const b = e.bilder;
  const d = dims(e, 800);
  const srcset = [400, 800, 1500].filter((x) => x <= Math.max(maxWidth, 800))
    .map((x) => `${img(b['webp_' + x] || b.webp_1500)} ${x}w`).join(', ');
  return `<picture>
  <source type="image/webp" srcset="${srcset}" sizes="${sizes}">
  <img src="${img(b.jpeg_1500)}" alt="${esc(e.alt_text)}" width="${d.w}" height="${d.h}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${fetchpriority ? ' fetchpriority="high"' : ''}>
</picture>`;
}

const betreff = (e) => encodeURIComponent(`Wanna do: CAMPO ${nn(e.nummer)} ${e.name}`);
const kontaktUrl = (e) => e ? `/index.html?betreff=${betreff(e)}#contact` : `/index.html?betreff=${encodeURIComponent('Wanna do: CAMPO')}#contact`;

/* ---------------------------------------------------------------- CSS */

const CSS = `
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --wd-bg: #FAF9F6; --wd-ink: #2E2B26; --wd-muted: #6E6A61; --wd-accent: #E7DECB;
  --wd-line: #E4E0D6;
  --font-heading: 'Archivo', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --max-width: 1320px;
  --pad-x: clamp(1.25rem, 5vw, 4rem);
  --transition: 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
html { scroll-behavior: smooth; scroll-padding-top: 90px; }
body { font-family: var(--font-body); font-weight: 300; color: var(--wd-ink); background-color: var(--wd-bg); line-height: 1.6; -webkit-font-smoothing: antialiased; }
img { max-width: 100%; height: auto; display: block; }
a { color: inherit; text-decoration: none; transition: opacity var(--transition); }
a:hover { opacity: 0.65; }
a:focus-visible, button:focus-visible { outline: 2px solid var(--wd-ink); outline-offset: 3px; }

.header { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; padding: 1.25rem var(--pad-x); background-color: rgba(250,249,246,0.92); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); transition: padding var(--transition), box-shadow var(--transition); }
.header.scrolled { padding: 0.85rem var(--pad-x); background-color: rgba(250,249,246,0.98); box-shadow: 0 1px 0 rgba(46,43,38,0.08); }
.nav { display: flex; justify-content: space-between; align-items: center; max-width: var(--max-width); margin: 0 auto; }
.nav__logo img { height: 56px; width: auto; transition: height var(--transition); }
.header.scrolled .nav__logo img { height: 46px; }
.nav__menu { display: flex; gap: 2.5rem; list-style: none; align-items: center; }
.nav__link { font-size: 0.85rem; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: var(--wd-ink); position: relative; padding: 0.5rem 0; }
.nav__link::after { content: ''; position: absolute; bottom: 0; left: 0; width: 0; height: 1px; background-color: var(--wd-ink); transition: width var(--transition); }
.nav__link:hover { opacity: 1; }
.nav__link:hover::after, .nav__link[aria-current]::after { width: 100%; }
.nav__cta { border: 1px solid var(--wd-ink); padding: 0.6rem 1.4rem; border-radius: 999px; transition: background-color var(--transition), color var(--transition); }
.nav__cta:hover { background-color: var(--wd-ink); color: var(--wd-bg); opacity: 1; }
.nav__cta::after { display: none; }
.burger { display: none; background: none; border: none; cursor: pointer; width: 32px; height: 32px; padding: 0; position: relative; z-index: 1100; }
.burger span { display: block; width: 24px; height: 1.5px; background-color: var(--wd-ink); margin: 5px auto; transition: transform var(--transition), opacity var(--transition); }
.burger.active span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
.burger.active span:nth-child(2) { opacity: 0; }
.burger.active span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }

.wd-main { padding-top: 96px; }
.wd-section { padding: clamp(3rem, 7vw, 6rem) var(--pad-x); }
.wd-container { max-width: var(--max-width); margin: 0 auto; }
.wd-kicker { font-size: 0.78rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--wd-muted); font-weight: 500; display: inline-flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; }
.wd-kicker::before { content: ''; width: 32px; height: 1px; background-color: var(--wd-muted); }
h1.wd-title { font-family: var(--font-heading); font-weight: 600; font-size: clamp(3rem, 9vw, 6.5rem); line-height: 0.95; letter-spacing: -0.03em; color: var(--wd-ink); }
.wd-lead { margin-top: 1.75rem; font-size: 1.1rem; line-height: 1.75; color: var(--wd-ink); max-width: 640px; }
.wd-note { margin-top: 1rem; font-size: 0.9rem; color: var(--wd-muted); max-width: 640px; }

.wd-breadcrumb { padding: 1.25rem var(--pad-x) 0; max-width: calc(var(--max-width) + 2 * var(--pad-x)); margin: 0 auto; font-size: 0.78rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--wd-muted); }
.wd-breadcrumb ol { list-style: none; display: flex; flex-wrap: wrap; gap: 0.5rem; }
.wd-breadcrumb li + li::before { content: '/'; margin-right: 0.5rem; color: var(--wd-line); }
.wd-breadcrumb a:hover { color: var(--wd-ink); opacity: 1; }

.serien-grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(1.5rem, 4vw, 3rem); margin-top: clamp(2.5rem, 6vw, 4rem); }
.serie-card { display: block; }
.serie-card figure { background-color: #fff; border: 1px solid var(--wd-line); padding: clamp(1.25rem, 3vw, 2.5rem); transition: border-color var(--transition); }
.serie-card:hover { opacity: 1; }
.serie-card:hover figure { border-color: var(--wd-muted); }
.serie-card img { margin: 0 auto; max-height: min(72vh, 640px); width: auto; }
.serie-card__meta { padding: 1.25rem 0.25rem 0; }
.serie-card__name { font-family: var(--font-heading); font-weight: 600; font-size: 1.35rem; letter-spacing: -0.01em; color: var(--wd-ink); }
.serie-card__claim { margin-top: 0.4rem; font-size: 0.95rem; color: var(--wd-muted); line-height: 1.6; max-width: 46ch; }
.serie-card__count { margin-top: 0.6rem; font-size: 0.75rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--wd-muted); }

.companions { background-color: var(--wd-accent); }
.companions .wd-kicker { color: var(--wd-ink); }
.companions .wd-kicker::before { background-color: var(--wd-ink); }
.companions__grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(1.5rem, 4vw, 3rem); margin-top: clamp(2rem, 5vw, 3rem); }
.companions h2 { font-family: var(--font-heading); font-weight: 600; font-size: clamp(1.8rem, 4vw, 2.6rem); letter-spacing: -0.02em; }
.companions .serie-card__claim, .companions .serie-card__count { color: var(--wd-ink); }
.companion-card figure { background-color: var(--wd-bg); padding: clamp(1.25rem, 3vw, 2.5rem); display: flex; justify-content: center; }
.companion-card img { max-height: 460px; width: auto; }
.companion-card:hover { opacity: 1; }
.companion-card:hover img { opacity: 0.85; }

.gallery { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(2rem, 5vw, 4rem); margin-top: clamp(2.5rem, 6vw, 4rem); }
.gallery-card { display: block; position: relative; }
.gallery-card figure { position: relative; background-color: #fff; border: 1px solid var(--wd-line); padding: clamp(1.5rem, 4vw, 3rem); display: flex; justify-content: center; transition: border-color var(--transition); }
.gallery-card:hover { opacity: 1; }
.gallery-card:hover figure, .gallery-card:focus-visible figure { border-color: var(--wd-muted); }
.gallery-card img { max-height: min(75vh, 720px); width: auto; }
.gallery-card figcaption { position: absolute; inset: auto 0 0 0; padding: 0.85rem 1.25rem; background-color: rgba(250,249,246,0.94); font-size: 0.8rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--wd-ink); opacity: 0; transform: translateY(4px); transition: opacity var(--transition), transform var(--transition); display: flex; justify-content: space-between; gap: 1rem; }
.gallery-card:hover figcaption, .gallery-card:focus-visible figcaption { opacity: 1; transform: translateY(0); }
.gallery-card figcaption .fmt { color: var(--wd-muted); letter-spacing: 0.08em; text-transform: none; }
@media (hover: none) {
  .gallery-card figcaption { position: static; opacity: 1; transform: none; background: none; padding: 0.85rem 0.25rem 0; }
}

.detail { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: clamp(2.5rem, 6vw, 5rem); align-items: start; }
.detail__visual { position: sticky; top: 110px; display: flex; justify-content: center; }
.detail__visual img { max-height: min(80vh, 760px); width: auto; }
.detail__nummer { font-size: 0.78rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--wd-muted); font-weight: 500; margin-bottom: 1rem; }
.detail h1 { font-family: var(--font-heading); font-weight: 600; font-size: clamp(2.6rem, 6vw, 4.2rem); line-height: 1; letter-spacing: -0.03em; }
.detail__bedeutung { margin-top: 0.6rem; font-size: 1rem; color: var(--wd-muted); }
.detail__format { margin-top: 1.5rem; font-size: 0.85rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--wd-ink); }
.detail__text { margin-top: 1.75rem; font-size: 1.02rem; line-height: 1.8; }
.detail h2 { font-size: 0.78rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--wd-muted); font-weight: 500; margin: 2.75rem 0 1rem; }
.palette { list-style: none; display: grid; gap: 0.6rem; }
.palette li { display: flex; align-items: center; gap: 0.9rem; font-size: 0.9rem; }
.palette .chip { flex: none; width: 44px; height: 44px; border-radius: 2px; border: 1px solid rgba(46,43,38,0.12); }
.palette .chip-name { color: var(--wd-ink); }
.palette .chip-ref { color: var(--wd-muted); font-size: 0.82rem; }
.pantone-hinweis { margin-top: 1rem; font-size: 0.8rem; color: var(--wd-muted); line-height: 1.6; max-width: 52ch; }
.spec { display: grid; grid-template-columns: max-content 1fr; gap: 0.55rem 1.5rem; font-size: 0.92rem; }
.spec dt { color: var(--wd-muted); }
.spec dd { color: var(--wd-ink); }
.downloads { list-style: none; display: grid; gap: 0.6rem; }
.downloads a { display: inline-flex; align-items: center; gap: 0.6rem; font-size: 0.92rem; border-bottom: 1px solid var(--wd-line); padding-bottom: 0.35rem; transition: border-color var(--transition); }
.downloads a:hover { border-color: var(--wd-ink); opacity: 1; }
.downloads a::before { content: '↓'; color: var(--wd-muted); }

.wannado { background-color: var(--wd-accent); }
.wannado h2, .wannado .wannado__title { font-family: var(--font-heading); font-weight: 600; font-size: clamp(2rem, 5vw, 3.2rem); letter-spacing: -0.025em; color: var(--wd-ink); margin: 0 0 0.75rem; text-transform: none; }
.wannado .wd-kicker { color: var(--wd-ink); }
.wannado .wd-kicker::before { background-color: var(--wd-ink); }
.wannado__standard { font-size: 0.95rem; color: var(--wd-ink); max-width: 560px; }
.prozess { list-style: none; counter-reset: schritt; display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; margin-top: 2.5rem; }
.prozess li { counter-increment: schritt; border-top: 1px solid rgba(46,43,38,0.25); padding-top: 1.25rem; font-size: 0.95rem; line-height: 1.65; }
.prozess li::before { content: '0' counter(schritt); display: block; font-family: var(--font-heading); font-size: 0.85rem; letter-spacing: 0.18em; color: var(--wd-muted); margin-bottom: 0.75rem; }
.prozess strong { display: block; font-family: var(--font-heading); font-weight: 600; font-size: 1.1rem; margin-bottom: 0.35rem; }
.wannado__cta { margin-top: 2.75rem; display: flex; flex-wrap: wrap; gap: 1.25rem; align-items: center; }
.btn { display: inline-flex; align-items: center; gap: 0.75rem; padding: 1rem 2.25rem; background-color: var(--wd-ink); color: var(--wd-bg); font-size: 0.85rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 500; border-radius: 999px; border: 1px solid var(--wd-ink); cursor: pointer; transition: background-color var(--transition), color var(--transition), transform var(--transition); }
.btn:hover { background-color: transparent; color: var(--wd-ink); opacity: 1; transform: translateY(-2px); }
.btn--ghost { background-color: transparent; color: var(--wd-ink); }
.btn--ghost:hover { background-color: var(--wd-ink); color: var(--wd-bg); }

.pager { display: flex; justify-content: space-between; gap: 1rem; border-top: 1px solid var(--wd-line); padding-top: 1.75rem; margin-top: clamp(2.5rem, 6vw, 4rem); font-size: 0.85rem; letter-spacing: 0.12em; text-transform: uppercase; }
.pager a { color: var(--wd-ink); }
.pager span.off { color: var(--wd-muted); }
.pager .dir { color: var(--wd-muted); margin: 0 0.4rem; }

.footer { background-color: var(--wd-ink); color: var(--wd-accent); padding: 3.5rem var(--pad-x) 2rem; margin-top: clamp(3rem, 7vw, 5rem); }
.footer__container { max-width: var(--max-width); margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1.5rem; font-size: 0.85rem; }
.footer a { border-bottom: 1px solid transparent; }
.footer a:hover { border-color: currentColor; opacity: 1; }
.footer nav { display: flex; flex-wrap: wrap; gap: 1.5rem; }

@media (max-width: 960px) {
  .serien-grid, .companions__grid, .gallery, .detail { grid-template-columns: 1fr; }
  .detail__visual { position: static; }
  .prozess { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 720px) {
  .header { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; background-color: rgba(250,249,246,0.98); }
  .nav__menu { position: fixed; top: 0; right: 0; height: 100vh; height: 100dvh; width: min(320px, 85vw); background-color: var(--wd-bg); flex-direction: column; justify-content: flex-start; align-items: stretch; gap: 0.25rem; padding: 6rem 2rem 2.5rem; transform: translateX(100%); transition: transform var(--transition); box-shadow: -8px 0 32px rgba(0,0,0,0.12); overflow-y: auto; -webkit-overflow-scrolling: touch; }
  .nav__menu.active { transform: translateX(0); }
  .nav__menu li { padding: 0.65rem 0; }
  .nav__link { font-size: 1rem; display: block; }
  .nav__cta { display: inline-flex !important; align-self: flex-start; white-space: nowrap; margin-top: 0.75rem; padding: 0.75rem 1.5rem; }
  .burger { display: block; }
  .prozess { grid-template-columns: 1fr; }
}
`;

/* ------------------------------------------------------------- Layout */

const LOGO = 'https://static.wixstatic.com/media/bdc123_37188656e7a04cebb530fc75bc1a552b~mv2.png/v1/fill/w_201,h_70,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GREY-logo-383838-freigestellt.png';

function page({ path, title, description, ogImage, body, breadcrumb, jsonld }) {
  const url = ORIGIN + path;
  return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${esc(description)}">
    <title>${esc(title)}</title>

    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="canonical" href="${url}">

    <meta property="og:type" content="website">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${ORIGIN + ogImage}">
    <meta property="og:locale" content="de_DE">
    <meta name="twitter:card" content="summary_large_image">
${jsonld ? `    <script type="application/ld+json">\n    ${JSON.stringify(jsonld)}\n    </script>\n` : ''}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap">
    <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <noscript><link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"></noscript>

    <style>${CSS}</style>
</head>
<body>

    <header class="header" id="header">
        <nav class="nav">
            <a href="/" class="nav__logo" aria-label="thegrey – Startseite">
                <img src="${LOGO}" alt="thegrey Logo – Handgefertigte Teppiche aus Berlin" width="201" height="70">
            </a>
            <ul class="nav__menu" id="navMenu">
                <li><a href="/#designs" class="nav__link">Designs</a></li>
                <li><a href="${BASE}/" class="nav__link" aria-current="true">Wanna Do</a></li>
                <li><a href="/#process" class="nav__link">Prozess</a></li>
                <li><a href="/#about" class="nav__link">Über uns</a></li>
                <li><a href="/#contact" class="nav__link nav__cta">Jetzt entwerfen</a></li>
            </ul>
            <button class="burger" id="burger" aria-label="Menü öffnen" aria-expanded="false">
                <span></span><span></span><span></span>
            </button>
        </nav>
    </header>

${breadcrumb || ''}
    <main class="wd-main">
${body}
    </main>

    <footer class="footer">
        <div class="footer__container">
            <div>© 2026 thegrey.berlin · Alle Rechte vorbehalten</div>
            <nav aria-label="Footer">
                <a href="${BASE}/">Wanna Do Collection</a>
                <a href="/#contact">Kontakt</a>
                <a href="/impressum.html">Impressum</a>
                <a href="/datenschutz.html">Datenschutz</a>
            </nav>
        </div>
    </footer>

    <script>
        const header = document.getElementById('header');
        window.addEventListener('scroll', () => { if (window.scrollY > 30) header.classList.add('scrolled'); else header.classList.remove('scrolled'); });
        const burger = document.getElementById('burger');
        const navMenu = document.getElementById('navMenu');
        burger.addEventListener('click', () => { const isActive = navMenu.classList.toggle('active'); burger.classList.toggle('active'); burger.setAttribute('aria-expanded', isActive); });
    </script>
</body>
</html>
`;
}

function breadcrumbNav(items) {
  const lis = items.map(([label, href]) =>
    href ? `<li><a href="${href}">${esc(label)}</a></li>` : `<li aria-current="page">${esc(label)}</li>`).join('');
  return `    <nav class="wd-breadcrumb" aria-label="Pfad" style="padding-top:96px;margin-bottom:-72px;">
        <ol>${lis}</ol>
    </nav>`;
}

function wannadoBlock(k, e) {
  const steps = k.prozess.map((p) => {
    const [t, ...rest] = p.split(' — ');
    return `<li><strong>${esc(t)}</strong>${esc(rest.join(' — '))}</li>`;
  }).join('\n                ');
  const mailSubject = e ? `Wanna do: CAMPO ${nn(e.nummer)} ${e.name}` : 'Wanna do: CAMPO';
  return `        <section class="wd-section wannado" aria-labelledby="wannado-title">
            <div class="wd-container">
                <span class="wd-kicker">Der Weg zum eigenen Stück</span>
                <h2 class="wannado__title" id="wannado-title">Wanna do?</h2>
                <p class="wannado__standard">${esc(k.standard)}</p>
                <ol class="prozess">
                ${steps}
                </ol>
                <div class="wannado__cta">
                    <a class="btn" href="${kontaktUrl(e)}">Entwurf anpassen lassen <span aria-hidden="true">→</span></a>
                    <a class="btn btn--ghost" href="mailto:hallo@thegrey.berlin?subject=${encodeURIComponent(mailSubject)}">Direkt per E-Mail</a>
                </div>
            </div>
        </section>`;
}

/* ------------------------------------------------------------ Landing */

function buildLanding() {
  const k = DATA.kollektion;
  const bySerie = (key) => DATA.entwuerfe.filter((e) => e.serie_key === key);
  const heroOf = (s) => DATA.entwuerfe.find((e) => e.nummer === s.hero);

  const tiles = DATA.serien.map((s, i) => {
    const hero = heroOf(s);
    const count = bySerie(s.key).length;
    return `                <a class="serie-card" href="${BASE}/${s.key}/">
                    <figure>
                        ${picture(hero, { sizes: '(min-width: 960px) 44vw, 92vw', eager: true, fetchpriority: i === 0 })}
                    </figure>
                    <div class="serie-card__meta">
                        <div class="serie-card__name">${esc(s.name)}</div>
                        <p class="serie-card__claim">${esc(s.claim)}</p>
                        <div class="serie-card__count">${count} Entwürfe</div>
                    </div>
                </a>`;
  }).join('\n');

  const companions = DATA.entwuerfe.filter((e) => e.auswahl_empfehlung === 'companion-laeufer');
  const compCards = companions.map((e) => `                <a class="companion-card" href="${BASE}/${e.id}/">
                    <figure>
                        ${picture(e, { sizes: '(min-width: 960px) 30vw, 70vw' })}
                    </figure>
                    <div class="serie-card__meta">
                        <div class="serie-card__name">${nn(e.nummer)} — ${esc(e.name)}</div>
                        <p class="serie-card__claim">${esc(e.text_kurz)}</p>
                        <div class="serie-card__count">${esc(e.typ)} · ${esc(e.format_cm)} cm</div>
                    </div>
                </a>`).join('\n');

  const body = `        <section class="wd-section" aria-labelledby="campo-title">
            <div class="wd-container">
                <span class="wd-kicker">THE GREY — Wanna Do Collection N°1</span>
                <h1 class="wd-title" id="campo-title">CAMPO</h1>
                <p class="wd-lead">${esc(k.kurzbeschreibung)}</p>
                <p class="wd-note">${esc(k.standard)}</p>
                <div class="serien-grid">
${tiles}
                </div>
            </div>
        </section>

        <section class="wd-section companions" aria-labelledby="companions-title">
            <div class="wd-container">
                <span class="wd-kicker">Companions</span>
                <h2 id="companions-title">Die Läufer der Kollektion</h2>
                <div class="companions__grid">
${compCards}
                </div>
            </div>
        </section>

${wannadoBlock(k, null)}`;

  const hero1 = heroOf(DATA.serien[0]);
  writePage(`${BASE}/index.html`, page({
    path: `${BASE}/`,
    title: 'CAMPO — Wanna Do Collection N°1 — THE GREY',
    description: k.kurzbeschreibung,
    ogImage: img(hero1.bilder.jpeg_1500),
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: k.name,
      description: k.kurzbeschreibung,
      url: ORIGIN + BASE + '/',
      isPartOf: { '@type': 'WebSite', name: 'thegrey', url: ORIGIN + '/' },
    },
    body,
  }));
}

/* -------------------------------------------------------- Serien-Seiten */

function buildSerien() {
  const k = DATA.kollektion;
  for (const s of DATA.serien) {
    const entwuerfe = DATA.entwuerfe.filter((e) => e.serie_key === s.key).sort((a, b) => a.nummer - b.nummer);
    const cards = entwuerfe.map((e) => `                <a class="gallery-card" href="${BASE}/${e.id}/">
                    <figure>
                        ${picture(e, { sizes: '(min-width: 960px) 44vw, 92vw' })}
                        <figcaption><span>${nn(e.nummer)} — ${esc(e.name)}</span><span class="fmt">${esc(e.format_cm)} cm</span></figcaption>
                    </figure>
                </a>`).join('\n');

    const body = `        <section class="wd-section" aria-labelledby="serie-title">
            <div class="wd-container">
                <span class="wd-kicker">THE GREY — Wanna Do Collection N°1 — CAMPO</span>
                <h1 class="wd-title" id="serie-title" style="font-size:clamp(2.4rem,6vw,4.5rem);">${esc(s.name)}</h1>
                <p class="wd-lead">${esc(s.claim)}</p>
                <div class="gallery">
${cards}
                </div>
            </div>
        </section>

${wannadoBlock(k, null)}`;

    const hero = DATA.entwuerfe.find((e) => e.nummer === s.hero);
    writePage(`${BASE}/${s.key}/index.html`, page({
      path: `${BASE}/${s.key}/`,
      title: `${s.name} — CAMPO — THE GREY Wanna Do Collection`,
      description: `${s.claim} ${entwuerfe.length} Teppichentwürfe der Kollektion CAMPO.`,
      ogImage: img(hero.bilder.jpeg_1500),
      breadcrumb: breadcrumbNav([['Wanna Do Collection', BASE + '/'], [s.name, null]]),
      body,
    }));
  }
}

/* -------------------------------------------------------- Detailseiten */

function buildDetails() {
  const k = DATA.kollektion;
  for (const e of DATA.entwuerfe) {
    const serie = DATA.serien.find((s) => s.key === e.serie_key);
    const inSerie = DATA.entwuerfe.filter((x) => x.serie_key === e.serie_key).sort((a, b) => a.nummer - b.nummer);
    const idx = inSerie.findIndex((x) => x.id === e.id);
    const prev = inSerie[idx - 1];
    const next = inSerie[idx + 1];

    const chips = e.farben.map((f) => `                    <li>
                        <span class="chip" style="background-color:${f.hex};" title="${esc(f.name)} — ${esc(f.pantone_fhi)}" aria-hidden="true"></span>
                        <span><span class="chip-name">${esc(f.name)}</span> · ${esc(f.hex)}<br><span class="chip-ref">${esc(f.pantone_fhi)}</span></span>
                    </li>`).join('\n');

    const body = `        <section class="wd-section">
            <div class="wd-container detail">
                <div class="detail__visual">
                    ${picture(e, { sizes: '(min-width: 960px) 52vw, 92vw', eager: true, fetchpriority: true, maxWidth: 1500 })}
                </div>
                <div>
                    <p class="detail__nummer">CAMPO ${nn(e.nummer)} — ${esc(e.serie)}</p>
                    <h1>${esc(e.name)}</h1>
                    <p class="detail__bedeutung">${esc(e.name_bedeutung)}</p>
                    <p class="detail__format">${esc(e.format_cm)} cm — ${esc(e.format_hinweis)}</p>
                    <p class="detail__text">${esc(e.text_lang)}</p>

                    <h2>Farbpalette</h2>
                    <ul class="palette">
${chips}
                    </ul>
                    <p class="pantone-hinweis">${esc(k.pantone_hinweis)}</p>

                    <h2>Spezifikation</h2>
                    <dl class="spec">
                        <dt>Typ</dt><dd>${esc(e.typ)}</dd>
                        <dt>Format</dt><dd>${esc(e.format_cm)} cm, ${esc(e.format_hinweis)}</dd>
                        <dt>Material</dt><dd>${esc(e.material)}</dd>
                        <dt>Herstellung</dt><dd>${esc(e.herstellung)}</dd>
                        <dt>Eignung</dt><dd>${esc(e.eignung)}</dd>
                    </dl>

                    <h2>Downloads</h2>
                    <ul class="downloads">
                        <li><a href="/downloads/${SERIEN_PDF[e.serie_key]}">Konzept-PDF ${esc(serie.name)}</a></li>
                        <li><a href="/downloads/${FARBKARTE_PDF}">Farbkarte CAMPO (PDF)</a></li>
                    </ul>
                </div>
            </div>
        </section>

${wannadoBlock(k, e)}

        <div class="wd-container" style="padding: 0 var(--pad-x);">
            <nav class="pager" aria-label="Entwürfe der Serie">
                ${prev ? `<a href="${BASE}/${prev.id}/"><span class="dir">←</span>${nn(prev.nummer)} — ${esc(prev.name)}</a>` : '<span class="off">Anfang der Serie</span>'}
                <a href="${BASE}/${e.serie_key}/">${esc(serie.name)}</a>
                ${next ? `<a href="${BASE}/${next.id}/">${nn(next.nummer)} — ${esc(next.name)}<span class="dir">→</span></a>` : '<span class="off">Ende der Serie</span>'}
            </nav>
        </div>`;

    writePage(`${BASE}/${e.id}/index.html`, page({
      path: `${BASE}/${e.id}/`,
      title: `CAMPO ${nn(e.nummer)} ${e.name} — Teppichentwurf — THE GREY Wanna Do Collection`,
      description: e.text_kurz,
      ogImage: img(e.bilder.jpeg_1500),
      breadcrumb: breadcrumbNav([['Wanna Do Collection', BASE + '/'], [serie.name, `${BASE}/${e.serie_key}/`], [`${nn(e.nummer)} ${e.name}`, null]]),
      jsonld: {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: `CAMPO ${nn(e.nummer)} ${e.name}`,
        alternateName: e.name_bedeutung,
        description: e.text_kurz,
        image: ORIGIN + img(e.bilder.jpeg_1500),
        url: `${ORIGIN}${BASE}/${e.id}/`,
        creator: { '@type': 'Organization', name: 'THE GREY', url: ORIGIN + '/' },
        isPartOf: { '@type': 'CollectionPage', name: k.name, url: ORIGIN + BASE + '/' },
        material: e.material,
      },
      body,
    }));
  }
}

/* ------------------------------------------------- Teaser (Startseiten) */

function injectTeaser(file, lang) {
  const p = join(ROOT, file);
  let html = readFileSync(p, 'utf8');
  const start = '<!-- WANNA-DO-TEASER:START -->';
  const end = '<!-- WANNA-DO-TEASER:END -->';
  if (!html.includes(start) || !html.includes(end)) {
    console.warn(`⚠ Teaser-Marker fehlen in ${file} — übersprungen.`);
    return;
  }
  const k = DATA.kollektion;
  const de = lang === 'de';
  const tiles = DATA.serien.map((s) => {
    const hero = DATA.entwuerfe.find((e) => e.nummer === s.hero);
    const d = dims(hero, 400);
    return `                <a class="wd-teaser__tile" href="wanna-do-collection/${s.key}/">
                    <img src="${img(hero.bilder.webp_400)}" alt="${esc(hero.alt_text)}" width="${d.w}" height="${d.h}" loading="lazy" decoding="async">
                    <span>${esc(s.name)}</span>
                </a>`;
  }).join('\n');

  const teaser = `${start}
        <section class="section wd-teaser" id="wanna-do">
            <div class="section__container">
                <div class="section__header reveal">
                    <span class="section__eyebrow">${de ? 'Wanna Do Collection N°1' : 'Wanna Do Collection N°1'}</span>
                    <h2 class="section__title">CAMPO</h2>
                    <p class="section__intro">${de ? esc(k.kurzbeschreibung) : 'Curated rug designs as inspiration for planners and interior architects: hard-edged geometric colour fields, conceived as starting points for individually crafted rugs. 22 designs in 4 series — in German.'}</p>
                </div>
                <div class="wd-teaser__grid reveal">
${tiles}
                </div>
                <div class="reveal" style="margin-top: 2.5rem;">
                    <a href="wanna-do-collection/" class="btn">${de ? 'Zur Kollektion' : 'View the collection'} <span class="btn__arrow">→</span></a>
                </div>
            </div>
        </section>
        ${end}`;

  html = html.slice(0, html.indexOf(start)) + teaser + html.slice(html.indexOf(end) + end.length);
  writeFileSync(p, html);
  console.log(`✓ Teaser aktualisiert: ${file}`);
}

/* ------------------------------------------------------------- Sitemap */

function buildSitemap() {
  const urls = [];
  urls.push(`  <url>
    <loc>${ORIGIN}/</loc>
    <xhtml:link rel="alternate" hreflang="de" href="${ORIGIN}/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${ORIGIN}/index-en.html"/>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>`);
  urls.push(`  <url>
    <loc>${ORIGIN}/index-en.html</loc>
    <xhtml:link rel="alternate" hreflang="de" href="${ORIGIN}/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${ORIGIN}/index-en.html"/>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`);
  urls.push(`  <url>
    <loc>${ORIGIN}${BASE}/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`);
  for (const s of DATA.serien) {
    urls.push(`  <url>
    <loc>${ORIGIN}${BASE}/${s.key}/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }
  for (const e of DATA.entwuerfe) {
    urls.push(`  <url>
    <loc>${ORIGIN}${BASE}/${e.id}/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

${urls.join('\n\n')}

</urlset>
`;
  writeFileSync(join(ROOT, 'sitemap.xml'), xml);
  console.log('✓ sitemap.xml geschrieben');
}

/* ---------------------------------------------------------------- Run */

function writePage(relPath, html) {
  const p = join(ROOT, relPath);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, html);
  console.log('✓', relPath);
}

buildLanding();
buildSerien();
buildDetails();
injectTeaser('index.html', 'de');
if (existsSync(join(ROOT, 'index-en.html'))) injectTeaser('index-en.html', 'en');
buildSitemap();
console.log('\nFertig: Landing + 4 Serien + 22 Detailseiten generiert.');

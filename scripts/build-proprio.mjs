#!/usr/bin/env node
/**
 * Build-Script: PRÓPRIO — die einzige Wanna Do Collection auf thegrey.berlin
 *
 * Ersetzt scripts/build-wanna-do-v2.mjs (Campo+Trama, Kapitel, Filter) durch eine
 * einzelne, ruhige Kollektionsseite: ein Hero-Bild, darunter ein editorialer Stream
 * der übrigen 7 Entwürfe. Kein Kapitel-Umschalter, keine Filterzeile, keine zweite
 * Bildwelt — siehe proprio-web-kit/CLAUDE-CODE-TASK.md.
 *
 * Erzeugt aus data/designs.json:
 *   wanna-do-collection/index.html              Hero + Stream (7 Entwürfe)
 *   wanna-do-collection/<id>/index.html   × 8    Permalink = Hero/Stream + offenes Overlay
 * und ersetzt den Kollektions-Teaser in index.html / index-en.html.
 *
 * Aufruf: node scripts/build-proprio.mjs   (vom Repo-Root)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = JSON.parse(readFileSync(join(ROOT, 'data/designs.json'), 'utf8'));
const K = DATA.kollektion;
const ORIGIN = 'https://www.thegrey.berlin';
const BASE = '/wanna-do-collection';
const LOGO = 'https://static.wixstatic.com/media/bdc123_37188656e7a04cebb530fc75bc1a552b~mv2.png/v1/fill/w_201,h_70,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GREY-logo-383838-freigestellt.png';
const PDF = 'thegrey-wannado-proprio-konzept.pdf';

/* ---------------------------------------------------------------- Utils */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const entwuerfeById = new Map(DATA.entwuerfe.map((e) => [e.id, e]));
const streamIds = K.reihenfolge.filter((id) => id !== K.hero_id);

const dimCache = new Map();
function imgDims(relPath) {
  if (dimCache.has(relPath)) return dimCache.get(relPath);
  const abs = join(ROOT, relPath);
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', abs], { encoding: 'utf8' });
  const w = Number(out.match(/pixelWidth:\s*(\d+)/)[1]);
  const h = Number(out.match(/pixelHeight:\s*(\d+)/)[1]);
  const dims = { w, h };
  dimCache.set(relPath, dims);
  return dims;
}

function picture(e, { sizes, eager = false, fetchpriority = false }) {
  const b = e.bilder;
  const d = imgDims(b.jpeg_1500);
  const srcset = [400, 800, 1500].map((w) => `/${b['webp_' + w]} ${w}w`).join(', ');
  return `<picture>
      <source type="image/webp" srcset="${srcset}" sizes="${sizes}">
      <img src="/${b.jpeg_1500}" alt="${esc(e.alt_text)}" width="${d.w}" height="${d.h}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${fetchpriority ? ' fetchpriority="high"' : ''}>
    </picture>`;
}

const betreff = (e) => `Wanna do: ${e.code} ${e.name}`;
const kontaktUrl = (e) => `/index.html?betreff=${encodeURIComponent(betreff(e))}#contact`;
const mailtoUrl = (e) => `mailto:hallo@thegrey.berlin?subject=${encodeURIComponent(betreff(e))}`;

/* ---------------------------------------------------------------- CSS */

const CSS = `
*, *::before, *::after { box-sizing: border-box; }
:root {
  --wd-paper: #F6F4EF; --wd-ink: #1F1D1A; --wd-grey: #6E6858; --wd-hair: #DED8CB; --wd-ovbg: #EBE7DE;
  --wd-serif: Georgia, 'Times New Roman', ui-serif, serif;
  --wd-sans: var(--font-body, 'Inter', -apple-system, BlinkMacSystemFont, sans-serif);
  --wd-transition: .35s cubic-bezier(.25,.46,.45,.94);
}
.wd-body { background: var(--wd-paper); color: var(--wd-ink); font-family: var(--wd-sans); }
.wd-body img { max-width: 100%; height: auto; display: block; }
.wd-body a { color: inherit; }
.wd-wrap { max-width: 1280px; margin: 0 auto; padding: 0 clamp(1.25rem, 5vw, 3.5rem); }

/* Header/Nav — 1:1 aus index.html übernommen, identisch auf jeder Unterseite der Website. */
.header { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; padding: 1.25rem clamp(1.25rem, 5vw, 4rem); background-color: rgba(255,255,255,0.9); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); transition: background-color .4s cubic-bezier(0.25, 0.46, 0.45, 0.94), padding .4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow .4s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
.header.scrolled { padding: 0.85rem clamp(1.25rem, 5vw, 4rem); background-color: rgba(255,255,255,0.98); box-shadow: 0 1px 0 rgba(56,56,56,0.06); }
.nav { display: flex; justify-content: space-between; align-items: center; max-width: 1320px; margin: 0 auto; }
.nav__logo img { height: 64px; width: auto; transition: height .4s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
.header.scrolled .nav__logo img { height: 52px; }
.nav__menu { display: flex; gap: 2.5rem; list-style: none; align-items: center; }
.nav__link { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 0.85rem; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: #383838; position: relative; padding: 0.5rem 0; text-decoration: none; }
.nav__link::after { content: ''; position: absolute; bottom: 0; left: 0; width: 0; height: 1px; background-color: #383838; transition: width .4s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
.nav__link:hover { opacity: 1; }
.nav__link:hover::after { width: 100%; }
.nav__lang { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; }
.nav__lang a { color: #8a8a8a; padding: 0.5rem 0.15rem; text-decoration: none; transition: color .4s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
.nav__lang a.active { color: #383838; }
.nav__lang a:hover { color: #383838; opacity: 1; }
.nav__lang span { color: #e5e3df; font-weight: 300; }
.nav__cta { border: 1px solid #383838; padding: 0.6rem 1.4rem; border-radius: 999px; transition: background-color .4s cubic-bezier(0.25, 0.46, 0.45, 0.94), color .4s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
.nav__cta:hover { background-color: #383838; color: #fff; opacity: 1; }
.nav__cta::after { display: none; }
.burger { display: none; background: none; border: none; cursor: pointer; width: 32px; height: 32px; padding: 0; position: relative; z-index: 1100; }
.burger span { display: block; width: 24px; height: 1.5px; background-color: #383838; margin: 5px auto; transition: transform .4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity .4s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
.burger.active span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
.burger.active span:nth-child(2) { opacity: 0; }
.burger.active span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }

.micro { font-family: var(--wd-sans); font-size: 10px; letter-spacing: .24em; text-transform: uppercase; color: var(--wd-grey); }

/* Hero — ein einziges Bild, viel Weißraum, ~1 Viewport, keine zweite Navigation. */
.hero { min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: clamp(5.5rem, 9vh, 7.5rem) clamp(1.25rem, 6vw, 4rem) clamp(1.5rem, 3.5vh, 2.5rem); text-align: center; }
.hero__frame { width: min(100%, 46vh, 520px); aspect-ratio: 1/1; background: var(--wd-ovbg); display: flex; align-items: center; justify-content: center; padding: clamp(1rem, 3vw, 2.25rem); margin-bottom: clamp(1.25rem, 3vh, 2rem); cursor: pointer; text-decoration: none; }
.hero__frame img { transition: transform .5s ease; }
.hero__frame:hover img, .hero__frame:focus-visible img { transform: scale(1.015); }
.hero__frame img { width: 100%; height: 100%; object-fit: contain; }
.hero .micro { margin-bottom: .9rem; }
.hero h1 { font-family: var(--wd-serif); font-weight: normal; font-size: clamp(2.25rem, 6vw, 4rem); line-height: 1; letter-spacing: .01em; margin: 0 0 .7rem; }
.hero .claim { font-family: var(--wd-serif); font-style: italic; font-size: 1.02rem; color: #3d392f; max-width: 46ch; margin: 0; }
.hero__scroll { margin-top: clamp(1.25rem, 3vh, 2rem); font-size: 9.5px; letter-spacing: .22em; text-transform: uppercase; color: var(--wd-grey); display: flex; flex-direction: column; align-items: center; gap: .5rem; }
.hero__scroll::after { content: ''; width: 1px; height: 22px; background: var(--wd-grey); opacity: .4; animation: wd-scroll-cue 2.2s ease-in-out infinite; }
@keyframes wd-scroll-cue { 0%, 100% { transform: scaleY(1); opacity: .4; } 50% { transform: scaleY(.5); opacity: .9; } }
@media (prefers-reduced-motion: reduce) { .hero__scroll::after { animation: none; } }

/* Stream */
.stream { padding: 1rem 0 clamp(4rem, 8vw, 6rem); }
.tile { margin: 0 0 clamp(4.5rem, 9vw, 7rem); }
.work { cursor: pointer; text-decoration: none; display: block; color: inherit; }
.feat { display: grid; grid-template-columns: 7fr 5fr; gap: clamp(2rem, 5vw, 4rem); align-items: center; }
.feat.flip { direction: rtl; }
.feat.flip > * { direction: ltr; }
.feat .fimg { background: var(--wd-ovbg); overflow: hidden; }
.feat .fimg img { transition: transform .5s ease; }
.work:hover .fimg img, .work:focus-visible .fimg img { transform: scale(1.015); }
.feat .ftxt { max-width: 440px; }
.feat h2 { font-family: var(--wd-serif); font-weight: normal; font-size: clamp(1.9rem, 3.6vw, 2.75rem); letter-spacing: .006em; margin: 1rem 0 .3rem; }
.feat .bed { font-family: var(--wd-serif); font-style: italic; font-size: 1.05rem; color: var(--wd-grey); margin-bottom: 1.25rem; }
.feat .story { font-family: var(--wd-serif); font-size: 1.03rem; line-height: 1.75; color: #37342D; margin-bottom: 1.5rem; }
@media (max-width: 900px) { .feat, .feat.flip { grid-template-columns: 1fr; direction: ltr; gap: 1.5rem; } .feat h2 { font-size: 2.1rem; } }

.foot { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.chips { display: flex; gap: 0; }
.chip { width: 15px; height: 15px; display: inline-block; }
.wd-body a.read { font-family: var(--wd-sans); font-size: 9.5px; letter-spacing: .22em; text-transform: uppercase; color: var(--wd-ink); border-bottom: 1px solid var(--wd-ink); padding-bottom: 2px; white-space: nowrap; }

.rv { opacity: 0; transform: translateY(20px); transition: opacity .7s ease, transform .7s ease; }
.rv.in { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) { .rv { opacity: 1; transform: none; transition: none; } .feat .fimg img { transition: none; } }

/* Overlay */
.ov { position: fixed; inset: 0; background: rgba(31,29,26,.5); z-index: 2000; display: none; align-items: stretch; justify-content: flex-end; }
.ov.open { display: flex; }
.ovbox { background: var(--wd-paper); width: min(1020px, 100%); overflow: auto; display: grid; grid-template-columns: minmax(0,45%) 1fr; }
@media (max-width: 820px) { .ovbox { grid-template-columns: 1fr; } }
.ovimg { background: var(--wd-ovbg); display: flex; align-items: center; padding: clamp(1.5rem, 4vw, 2.75rem); }
.ovimg img { width: 100%; height: auto; }
.ovtxt { padding: clamp(2.5rem, 6vw, 4.75rem) clamp(1.5rem, 4vw, 4rem) 4.25rem; }
.ovtxt h2 { font-family: var(--wd-serif); font-weight: normal; font-size: clamp(1.9rem, 3.6vw, 2.9rem); margin: 1.1rem 0 .25rem; }
.ovtxt .bed { font-family: var(--wd-serif); font-style: italic; font-size: 1.1rem; color: var(--wd-grey); margin-bottom: 1.6rem; }
.ovtxt .story { font-family: var(--wd-serif); font-size: 1.05rem; line-height: 1.8; color: #37342D; margin-bottom: 1.6rem; }
.ovtxt .chips { margin-bottom: 1.5rem; flex-wrap: wrap; row-gap: .5rem; }
.ovtxt .chip { width: 26px; height: 26px; }
.palette-list { list-style: none; margin: 0 0 1.5rem; padding: 0; display: grid; gap: .4rem; }
.palette-list li { display: flex; align-items: center; gap: .7rem; font-size: .82rem; color: var(--wd-grey); }
.palette-list .chip-sm { width: 15px; height: 15px; flex: none; border: 1px solid rgba(31,29,26,.12); }
.spec { font-size: 11px; letter-spacing: .06em; line-height: 2; color: var(--wd-grey); border-top: 1px solid var(--wd-hair); padding-top: 1.1rem; margin-bottom: 1.9rem; text-transform: uppercase; }
.ovcta { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; }
.wd-body a.cta { display: inline-block; font-family: var(--wd-sans); font-size: 11px; letter-spacing: .26em; text-transform: uppercase; color: var(--wd-paper); background: var(--wd-ink); padding: 1rem 1.6rem; text-decoration: none; }
.wd-body a.cta--ghost { color: var(--wd-ink); background: none; border: 1px solid var(--wd-ink); }
.ovclose { position: fixed; top: 1.35rem; right: clamp(1.25rem, 4vw, 1.9rem); z-index: 2010; font-size: 2.1rem; font-family: var(--wd-serif); color: #fff; background: rgba(31,29,26,.35); border: none; cursor: pointer; line-height: 1; width: 46px; height: 46px; border-radius: 50%; }
.ovclose:hover { background: rgba(31,29,26,.55); }

.wd-downloads { border-top: 1px solid var(--wd-hair); padding: 3rem 0; }
.wd-downloads h2 { font-family: var(--wd-serif); font-weight: normal; font-size: 1.6rem; margin: 0 0 .35rem; }
.wd-downloads p.std { font-size: .85rem; color: var(--wd-grey); margin-bottom: 1.5rem; max-width: 60ch; }
.wd-downloads a { display: inline-flex; align-items: center; gap: .5rem; font-size: .85rem; border-bottom: 1px solid var(--wd-hair); padding-bottom: .3rem; text-decoration: none; }
.wd-downloads a:hover { border-color: var(--wd-ink); }
.wd-downloads a::before { content: '↓'; color: var(--wd-grey); }

.wd-footer { border-top: 1px solid var(--wd-hair); padding: 2.25rem 0 3.5rem; }
.wd-footer .wd-wrap { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--wd-grey); line-height: 2.1; }

/* Header/Nav mobil — 1:1 aus index.html übernommen. */
@media (max-width: 720px) {
  .header { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; background-color: rgba(255,255,255,0.98); }
  .nav__menu { position: fixed; top: 0; right: 0; height: 100vh; height: 100dvh; width: min(320px, 85vw); background-color: #fff; flex-direction: column; justify-content: flex-start; align-items: stretch; gap: 0.25rem; padding: 6rem 2rem 2.5rem; transform: translateX(100%); transition: transform .4s cubic-bezier(0.25, 0.46, 0.45, 0.94); box-shadow: -8px 0 32px rgba(0,0,0,0.12); overflow-y: auto; -webkit-overflow-scrolling: touch; }
  .nav__menu.active { transform: translateX(0); }
  .nav__menu li { padding: 0.65rem 0; }
  .nav__link { font-size: 1rem; display: block; }
  .nav__lang { padding: 1.25rem 0 0.5rem !important; margin-top: 0.75rem; border-top: 1px solid #e5e3df; justify-content: flex-start; }
  .nav__cta { display: inline-flex !important; align-self: flex-start; white-space: nowrap; margin-top: 0.75rem; padding: 0.75rem 1.5rem; }
  .nav__cta::after { display: none; }
  .burger { display: block; position: relative; z-index: 1101; }
}
@media (max-width: 760px) {
  .hero { padding-top: 6rem; }
  .ovtxt { padding-top: 3rem; }
}
`;

/* -------------------------------------------------------------- Karten */

function microLine(e) {
  return `${esc(e.code)} &nbsp;·&nbsp; ${esc(e.format_cm)} &nbsp;·&nbsp; ${esc(e.typ)}`;
}

function chips(e, size = '') {
  return e.farben.map((f) => `<span class="chip${size}" style="background:${f.hex}"></span>`).join('');
}

function streamCard(e, index) {
  const flip = index % 2 === 1;
  return `<article class="tile work rv feat${flip ? ' flip' : ''}" data-id="${e.id}">
  <a class="fimg" href="${BASE}/${e.id}/">${picture(e, { sizes: '(min-width: 900px) 58vw, 92vw' })}</a>
  <div class="ftxt">
    <div class="micro">${microLine(e)}</div>
    <a href="${BASE}/${e.id}/" style="text-decoration:none;color:inherit;">
      <h2>${esc(e.name)}</h2>
      <div class="bed">${esc(e.name_bedeutung.replace(/^[^:]+:\s*/, ''))}</div>
    </a>
    <p class="story">${esc(e.text_kurz)}</p>
    <div class="foot"><div class="chips">${chips(e)}</div><a class="read" href="${BASE}/${e.id}/">Geschichte lesen</a></div>
  </div>
</article>`;
}

/* --------------------------------------------------------- Overlay-Body */

function overlayContent(e) {
  const paletteList = e.farben.map((f) => `<li><span class="chip-sm" style="background:${f.hex}"></span><span>${esc(f.name)} — ${esc(f.hex)} · ${esc(f.pantone_fhi)}</span></li>`).join('');
  return `
    <div class="ovimg">${picture(e, { sizes: '46vw', eager: true })}</div>
    <div class="ovtxt">
      <div class="micro">${microLine(e)}</div>
      <h2>${esc(e.name)}</h2>
      <div class="bed">— ${esc(e.name_bedeutung.replace(/^[^:]+:\s*/, ''))}</div>
      <p class="story">${esc(e.text_lang)}</p>
      <div class="chips ovtxt-chips" style="display:flex;">${chips(e)}</div>
      <ul class="palette-list">${paletteList}</ul>
      <div class="spec">${esc(e.format_cm)}, ${esc(e.format_hinweis)} · Grund: ${esc(e.grund)}<br>${esc(e.material)}<br>Herstellung: ${esc(e.herstellung)}<br>Eignung: ${esc(e.eignung)}<br>Download: <a href="/downloads/${PDF}">Konzept-PDF PRÓPRIO</a></div>
      <div class="ovcta">
        <a class="cta" href="${kontaktUrl(e)}">Wanna do? — Anfragen</a>
        <a class="cta cta--ghost" href="${mailtoUrl(e)}">Direkt per E-Mail</a>
      </div>
    </div>`;
}

/* ------------------------------------------------------------- Seiten */

function pageShell({ path, title, description, ogImage, openId, jsonld }) {
  const url = ORIGIN + path;
  const openScript = `<script>window.__WD_OPEN_ID = ${JSON.stringify(openId)};</script>`;
  const jsonldTag = jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : '';
  const hero = entwuerfeById.get(K.hero_id);

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
    <meta property="og:image" content="${ORIGIN}/${ogImage}">
    <meta property="og:locale" content="de_DE">
    <meta name="twitter:card" content="summary_large_image">
    ${jsonldTag}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=optional" rel="stylesheet" media="print" onload="this.media='all'">
    <style>${CSS}</style>
</head>
<body class="wd-body">
${openScript}
    <header class="header" id="header">
        <nav class="nav">
            <a href="/index.html" class="nav__logo" aria-label="thegrey - Startseite"><img src="${LOGO}" alt="thegrey Logo"></a>
            <ul class="nav__menu" id="navMenu">
                <li><a href="/index.html#designs" class="nav__link">Design &amp; Prozess</a></li>
                <li><a href="${BASE}/" class="nav__link">Wanna Do</a></li>
                <li><a href="/index.html#about" class="nav__link">Über uns</a></li>
                <li class="nav__lang"><a href="${BASE}/" class="active">DE</a><span>/</span><a href="/index-en.html">EN</a></li>
                <li><a href="/index.html#contact" class="nav__link nav__cta">Jetzt entwerfen</a></li>
            </ul>
            <button class="burger" id="burger" aria-label="Menü öffnen" aria-expanded="false"><span></span><span></span><span></span></button>
        </nav>
    </header>

    <header class="hero" id="hero">
        <div class="micro">The Grey — Wanna Do Collection N° ${esc(K.code.replace('N°', '').trim())}</div>
        <a class="hero__frame work" href="${BASE}/${hero.id}/" data-id="${hero.id}" aria-label="${esc(hero.name)} — Geschichte lesen">${picture(hero, { sizes: '620px', eager: true, fetchpriority: true })}</a>
        <h1>${esc(K.name)}</h1>
        <p class="claim">${esc(K.claim)}</p>
        <div class="hero__scroll">Entdecken</div>
    </header>

    <main class="stream"><div class="wd-wrap" id="stream">
${streamIds.map((id, i) => streamCard(entwuerfeById.get(id), i)).join('\n')}
    </div></main>

    <section class="wd-downloads">
        <div class="wd-wrap">
            <h2>Downloads</h2>
            <p class="std">${esc(K.standard)}</p>
            <a href="/downloads/${PDF}">Konzept-PDF PRÓPRIO</a>
        </div>
    </section>

    <footer class="wd-footer"><div class="wd-wrap">Handgetuftet · 100 % Neuseelandwolle, matt · Formate frei skalierbar<br>${esc(K.pantone_hinweis)}</div></footer>

    <div class="ov${openId ? ' open' : ''}" id="ov" role="dialog" aria-modal="true" aria-label="Entwurf-Details">
        <button class="ovclose" id="ovclose" aria-label="Schließen">×</button>
        <div class="ovbox" id="ovbox">${openId ? overlayContent(entwuerfeById.get(openId)) : ''}</div>
    </div>

    <script>window.__WD_DATA = ${JSON.stringify(buildClientData())};</script>
    <script src="${BASE}/stream.js" defer></script>
</body>
</html>
`;
}

function buildClientData() {
  const overlays = {};
  DATA.entwuerfe.forEach((e) => { overlays[e.id] = overlayContent(e); });
  return { overlays, base: BASE };
}

/* --------------------------------------------------------------- JS */

const CLIENT_JS = `
(function () {
  var WD = window.__WD_DATA;
  var BASE = WD.base;

  var header = document.getElementById('header');
  var burger = document.getElementById('burger');
  var navMenu = document.getElementById('navMenu');
  burger.addEventListener('click', function () {
    var isActive = navMenu.classList.toggle('active');
    burger.classList.toggle('active', isActive);
    burger.setAttribute('aria-expanded', isActive);
  });
  navMenu.querySelectorAll('.nav__link').forEach(function (l) {
    l.addEventListener('click', function () { navMenu.classList.remove('active'); burger.classList.remove('active'); burger.setAttribute('aria-expanded', false); });
  });
  window.addEventListener('scroll', function () {
    header.classList.toggle('scrolled', window.scrollY > 30);
  });

  var works = [].slice.call(document.querySelectorAll('.work'));
  var ov = document.getElementById('ov'), ovbox = document.getElementById('ovbox');
  var lastFocus = null;

  function openOverlay(id, push, alreadyRendered) {
    if (!alreadyRendered) {
      var html = WD.overlays[id];
      if (!html) return;
      ovbox.innerHTML = html;
    }
    ov.classList.add('open');
    document.body.style.overflow = 'hidden';
    lastFocus = document.activeElement;
    document.getElementById('ovclose').focus();
    if (push !== false) history.pushState({ wd: id }, '', BASE + '/' + id + '/');
  }
  function closeOverlay(pop) {
    ov.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
    if (!pop) history.pushState({}, '', BASE + '/');
  }

  works.forEach(function (c) {
    c.addEventListener('click', function (ev) {
      ev.preventDefault();
      openOverlay(c.dataset.id, true);
    });
  });
  document.getElementById('ovclose').addEventListener('click', function () { closeOverlay(false); });
  ov.addEventListener('click', function (e) { if (e.target === ov) closeOverlay(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ov.classList.contains('open')) closeOverlay(false);
    if (e.key === 'Tab' && ov.classList.contains('open')) {
      var focusables = ovbox.querySelectorAll('a[href], button');
      var list = [document.getElementById('ovclose')].concat([].slice.call(focusables));
      var first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('popstate', function () {
    var m = window.location.pathname.match(/wanna-do-collection\\/([a-z0-9-]+)\\/?$/);
    if (m && WD.overlays[m[1]]) openOverlay(m[1], false);
    else closeOverlay(true);
  });

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .12 });
    document.querySelectorAll('.rv').forEach(function (t) { io.observe(t); });
  } else {
    document.querySelectorAll('.rv').forEach(function (t) { t.classList.add('in'); });
  }

  if (window.__WD_OPEN_ID) openOverlay(window.__WD_OPEN_ID, false, true);
})();
`;

/* --------------------------------------------------------------- Run */

function writeFile(relPath, content) {
  const p = join(ROOT, relPath);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
  console.log('✓', relPath);
}

function cleanupObsoletePermalinks() {
  const dir = join(ROOT, BASE.slice(1));
  if (!existsSync(dir)) return;
  const keep = new Set(DATA.entwuerfe.map((e) => e.id));
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !keep.has(entry.name)) {
      rmSync(join(dir, entry.name), { recursive: true });
      console.log('✗ entfernt', `${BASE}/${entry.name}/`);
    }
  }
}

function buildRoot() {
  const hero = entwuerfeById.get(K.hero_id);
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${K.name} — THE GREY Wanna Do Collection`,
    description: K.kurzbeschreibung,
    url: `${ORIGIN}${BASE}/`,
  };
  writeFile(`${BASE}/index.html`, pageShell({
    path: `${BASE}/`,
    title: `${K.name} — THE GREY Wanna Do Collection`,
    description: K.kurzbeschreibung,
    ogImage: hero.bilder.jpeg_1500,
    openId: null,
    jsonld,
  }));
}

function buildPermalinks() {
  for (const e of DATA.entwuerfe) {
    const jsonld = {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: `${e.code} ${e.name}`,
      alternateName: e.name_bedeutung,
      description: e.text_kurz,
      image: `${ORIGIN}/${e.bilder.jpeg_1500}`,
      url: `${ORIGIN}${BASE}/${e.id}/`,
      creator: { '@type': 'Organization', name: 'THE GREY', url: ORIGIN + '/' },
      isPartOf: { '@type': 'CollectionPage', name: K.name, url: `${ORIGIN}${BASE}/` },
      material: e.material,
    };
    writeFile(`${BASE}/${e.id}/index.html`, pageShell({
      path: `${BASE}/${e.id}/`,
      title: `${e.code} ${e.name} — Teppichentwurf — THE GREY Wanna Do Collection`,
      description: e.text_kurz,
      ogImage: e.bilder.jpeg_1500,
      openId: e.id,
      jsonld,
    }));
  }
}

function buildClientJs() {
  writeFile(`${BASE}/stream.js`, CLIENT_JS);
}

function buildSitemap() {
  const urls = [];
  urls.push(`  <url>\n    <loc>${ORIGIN}/</loc>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>`);
  urls.push(`  <url>\n    <loc>${ORIGIN}/index-en.html</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.9</priority>\n  </url>`);
  urls.push(`  <url>\n    <loc>${ORIGIN}${BASE}/</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.9</priority>\n  </url>`);
  for (const e of DATA.entwuerfe) {
    urls.push(`  <url>\n    <loc>${ORIGIN}${BASE}/${e.id}/</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n${urls.join('\n\n')}\n\n</urlset>\n`;
  writeFile('sitemap.xml', xml);
}

function injectTeaser(file, lang) {
  const p = join(ROOT, file);
  if (!existsSync(p)) return;
  let html = readFileSync(p, 'utf8');
  const start = '<!-- WANNA-DO-TEASER:START -->';
  const end = '<!-- WANNA-DO-TEASER:END -->';
  if (!html.includes(start) || !html.includes(end)) { console.warn(`⚠ Teaser-Marker fehlen in ${file}`); return; }
  const de = lang === 'de';
  const hero = entwuerfeById.get(K.hero_id);
  const d = imgDims(hero.bilder.jpeg_1500);
  const teaser = `${start}
        <section class="section wd-teaser" id="wanna-do">
            <div class="section__container">
                <div class="section__header reveal">
                    <span class="section__eyebrow">${K.code} · ${esc(K.name)}</span>
                    <h2 class="section__title">Wanna Do Collection<em>.</em></h2>
                    <p class="section__intro">${de ? esc(K.kurzbeschreibung) : 'The first collection made in-house: bold, warm, grounded. Eight designs — starting points for individually crafted rugs, not end products — in German.'}</p>
                </div>
                <div class="wd-teaser__grid reveal" style="grid-template-columns: 1fr;">
                <a class="wd-teaser__tile" href="wanna-do-collection/" style="max-width:420px;">
                    <img src="/${hero.bilder.webp_800}" alt="${esc(hero.alt_text)}" width="${d.w}" height="${d.h}" loading="lazy" decoding="async">
                    <span>${esc(hero.name)}</span>
                    <p>${esc(K.claim)}</p>
                </a>
                </div>
                <div class="reveal" style="margin-top: 2.5rem;">
                    <a href="wanna-do-collection/" class="btn">${de ? 'Zur Kollektion' : 'View the collection'} <span class="btn__arrow">→</span></a>
                </div>
            </div>
        </section>
        ${end}`;
  html = html.slice(0, html.indexOf(start)) + teaser + html.slice(html.indexOf(end) + end.length);
  writeFileSync(p, html);
  console.log('✓ Teaser aktualisiert:', file);
}

cleanupObsoletePermalinks();
buildRoot();
buildPermalinks();
buildClientJs();
buildSitemap();
injectTeaser('index.html', 'de');
injectTeaser('index-en.html', 'en');
console.log(`\nFertig: Hero + Stream (${streamIds.length}) + ${DATA.entwuerfe.length} Permalinks generiert.`);

#!/usr/bin/env node
/**
 * Build-Script v2: Wanna Do Collection (editorialer Edition-Stream) für thegrey.berlin
 *
 * Ersetzt scripts/build-wanna-do.mjs (Landing+Serien+Detailseiten) durch einen
 * Single-Stream-Aufbau mit Kapiteln (Campo/Trama/Alles), Filtern und Overlay,
 * gemäß campo-web-kit/CLAUDE-CODE-TASK.md + reference/prototyp-edition.html.
 *
 * Erzeugt aus data/designs.json:
 *   wanna-do-collection/index.html              Stream (alle 39 Entwürfe, beide Kapitel)
 *   wanna-do-collection/<id>/index.html   × 39   Permalink = voller Stream + offenes Overlay
 * und injiziert den Kollektions-Teaser in index.html / index-en.html.
 *
 * Aufruf: node scripts/build-wanna-do-v2.mjs   (vom Repo-Root)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = JSON.parse(readFileSync(join(ROOT, 'data/designs.json'), 'utf8'));
const ORIGIN = 'https://www.thegrey.berlin';
const BASE = '/wanna-do-collection';
const LOGO = 'https://static.wixstatic.com/media/bdc123_37188656e7a04cebb530fc75bc1a552b~mv2.png/v1/fill/w_201,h_70,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GREY-logo-383838-freigestellt.png';

const SERIEN_PDF = {
  'serie-1-fond': 'thegrey-wannado-campo-konzept.pdf',
  'serie-2-cheio': 'thegrey-wannado-campo-cheio-konzept.pdf',
  'serie-3-amanha': 'thegrey-wannado-campo-amanha-konzept.pdf',
  'serie-4-elo': 'thegrey-wannado-campo-elo-konzept.pdf',
  'serie-5-nuvem': 'thegrey-wannado-campo-nuvem-konzept.pdf',
  'trama-reihe-1': 'thegrey-wannado-trama-konzept.pdf',
  'trama-reihe-2': 'thegrey-wannado-trama-konzept.pdf',
};
const FARBKARTE_PDF = 'thegrey-wannado-campo-farbkarte.pdf';

// Filterzeile (Suche + Stimmung/Farbe/Typ/Format/Special) vorerst ausgeblendet —
// Kunden sollen beide Kollektionen zunächst frei durchscrollen. Technik bleibt
// vollständig erhalten (Markup + JS), nur unsichtbar/aus dem Tab-Fokus via `hidden`.
// Zum Reaktivieren einfach auf `true` setzen und neu bauen.
const FILTERS_ENABLED = false;

/* ---------------------------------------------------------------- Utils */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nn = (n) => String(n).padStart(2, '0');
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

const entwuerfeById = new Map(DATA.entwuerfe.map((e) => [e.id, e]));
const serienByKey = new Map(DATA.serien.map((s) => [s.key, s]));
const kollektionenByKey = new Map(DATA.kollektionen.map((k) => [k.key, k]));

function serieIndexInKollektion(serieKey) {
  const s = serienByKey.get(serieKey);
  const siblings = DATA.serien.filter((x) => x.kollektion === s.kollektion);
  return siblings.findIndex((x) => x.key === serieKey) + 1;
}

function serieDot(serieKey) {
  const s = serienByKey.get(serieKey);
  const hero = entwuerfeById.get(s.hero_id);
  return hero.farben[0].hex;
}

function formatBucket(e) {
  if (/^80\s*×/.test(e.format_cm) || /Läufer/i.test(e.typ)) return { key: 'laufer', label: 'Läufer' };
  if (/^250\s*×\s*250/.test(e.format_cm)) return { key: 'quadrat', label: 'Quadrat' };
  return { key: 'hochformat', label: 'Hochformat' };
}

function typBucket(e) {
  if (/Läufer/i.test(e.typ)) return { key: 'laufer', label: 'Läufer' };
  if (/Vollflächig|verwebt/i.test(e.typ)) return { key: 'voll', label: 'Vollflächig' };
  return { key: 'fond', label: 'Fond' };
}

const FARBWELT_LABEL = { rot: 'Rot & Terra', rosa: 'Rosa', blau: 'Blau', lila: 'Lila', gruen: 'Grün', gelb: 'Gelb', neutral: 'Hell', bunt: 'Bunt' };
const STIMMUNG_LABEL = { leise: 'leise', kräftig: 'kräftig', erdig: 'erdig', kühl: 'kühl', warm: 'warm', tonal: 'tonal', verspielt: 'verspielt' };

/* ------------------------------------------------------- Bild-Dimensionen */

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

function picture(e, variant, { sizes, eager = false, fetchpriority = false, className = '' }) {
  const b = variant === 'real' ? e.bilder_real : e.bilder;
  const d = imgDims(b.jpeg_1500);
  const srcset = [400, 800, 1500].map((w) => `/${b['webp_' + w]} ${w}w`).join(', ');
  return `<picture>
      <source type="image/webp" srcset="${srcset}" sizes="${sizes}">
      <img${className ? ` class="${className}"` : ''} src="/${b.jpeg_1500}" alt="${esc(e.alt_text)}" width="${d.w}" height="${d.h}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${fetchpriority ? ' fetchpriority="high"' : ''}>
    </picture>`;
}

/* ------------------------------------------------------------- Copy/CTA */

const betreff = (e) => `Wanna do: ${e.code} ${e.name}`;
const kontaktUrl = (e) => `/index.html?betreff=${encodeURIComponent(betreff(e))}#contact`;
const mailtoUrl = (e) => `mailto:hallo@thegrey.berlin?subject=${encodeURIComponent(betreff(e))}`;

const HERO_COPY = {
  campo: {
    kicker: 'The Grey — Wanna Do Collection · Berlin',
    title: 'Teppiche,<br>die als <em>Bilder</em> beginnen.',
    lede: 'Siebenundzwanzig Entwürfe, handgetuftet gedacht in reiner Neuseelandwolle. Jeder trägt seine Geschichte bei sich — ein Klick, und sie liegt offen. Nichts hier ist Endprodukt: Alles ist eine Einladung. Wanna&nbsp;do?',
    line: 'Kollektion N° 1 — Campo',
  },
  trama: {
    kicker: 'The Grey — Wanna Do Collection · Berlin',
    title: 'Teppiche,<br>gedacht vom <em>Webstuhl</em> her.',
    lede: 'Zwölf Entwürfe als Hommage an die Bauhaus-Weberei: Kette und Schuss, Karo und Nadelstreifen, der bewusst sichtbare Knoten. Jede Struktur beginnt als Zeichnung — ein Klick, und die Geschichte liegt offen. Wanna&nbsp;do?',
    line: 'Kollektion N° 2 — Trama',
  },
  alles: {
    kicker: 'The Grey — Wanna Do Collection · Berlin',
    title: 'Neununddreißig<br>Anfänge für <em>deinen</em> Teppich.',
    lede: 'Zwei Kollektionen, eine Haltung: Farbfeld-Malerei in Campo, Webstuhl-Logik in Trama. Jeder Entwurf ist ein Ausgangspunkt, kein Endprodukt — durchsuchbar, filterbar, einen Klick von seiner ganzen Geschichte entfernt.',
    line: 'Campo N° 1 · Trama N° 2',
  },
};

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

/* Header/Nav — 1:1 aus index.html übernommen (gleiche Klassennamen wie auf allen anderen
   Unterseiten der Website, z. B. impressum.html), damit das Menüband überall identisch ist. */
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

.micro { font-family: var(--wd-sans); font-size: 10px; letter-spacing: .26em; text-transform: uppercase; color: var(--wd-grey); }
.sdot { display: inline-block; width: 8px; height: 8px; border-radius: 99px; margin-right: 8px; vertical-align: 1px; }

.hero { padding: clamp(7rem, 8vw, 9.5rem) 0 clamp(2.5rem, 6vw, 4.5rem); border-bottom: 1px solid var(--wd-hair); }
.hero .micro { margin-bottom: 1.5rem; }
.hero h1 { font-family: var(--wd-serif); font-weight: normal; font-size: clamp(2.4rem, 6vw, 4.75rem); line-height: 1.04; letter-spacing: .003em; max-width: 840px; margin: 0; }
.hero h1 em { font-style: italic; }
.hero .lede { font-family: var(--wd-serif); font-style: italic; font-size: 1.1rem; line-height: 1.65; color: #4A463E; max-width: 560px; margin-top: 1.75rem; }
.hero .no { font-family: var(--wd-serif); font-size: .92rem; color: var(--wd-grey); margin-top: 2rem; letter-spacing: .04em; }

.chapters { display: flex; gap: 1.5rem; margin-top: 2.25rem; }
.chapters a { font-family: var(--wd-sans); font-size: .72rem; letter-spacing: .2em; text-transform: uppercase; color: var(--wd-grey); text-decoration: none; padding-bottom: .3rem; border-bottom: 1px solid transparent; }
.chapters a.on { color: var(--wd-ink); border-bottom-color: var(--wd-ink); }
.chapters a:hover { color: var(--wd-ink); }

.fline { position: sticky; top: 68px; z-index: 150; background: rgba(246,244,239,.96); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-bottom: 1px solid var(--wd-hair); }
.fline .wd-wrap { display: flex; flex-wrap: wrap; align-items: baseline; gap: .65rem 1.35rem; padding-top: .7rem; padding-bottom: .6rem; }
.fline .lbl { font-family: var(--wd-sans); font-size: 10px; letter-spacing: .22em; color: var(--wd-grey); text-transform: uppercase; margin-right: -.4rem; }
.fline a.flink { font-family: var(--wd-serif); font-style: italic; font-size: .92rem; color: #4A463E; text-decoration: none; border-bottom: 1px solid transparent; cursor: pointer; background: none; border-top: none; border-left: none; border-right: none; padding: .65rem .15rem; margin: -.65rem -.15rem; display: inline-block; line-height: 1; }
.fline a.flink:hover { border-bottom-color: #B9B2A2; }
.fline a.flink.on { color: var(--wd-ink); border-bottom-color: var(--wd-ink); }
.fline input { border: none; border-bottom: 1px solid var(--wd-hair); background: none; font-family: var(--wd-serif); font-style: italic; font-size: .92rem; padding: .55rem 0 .6rem; width: 200px; color: var(--wd-ink); outline: none; }
.fline input::placeholder { color: #A8A196; }
.fline .sep { color: var(--wd-hair); }
.fline .reset { font-family: var(--wd-sans); font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: var(--wd-grey); background: none; border: none; cursor: pointer; padding: 0; }
.rcount { padding: 1rem 0 0; font-family: var(--wd-serif); font-style: italic; font-size: .92rem; color: var(--wd-grey); min-height: 1.4em; }

.stream { padding: 2.25rem 0 5.5rem; }
.tile { margin: 0 0 5.25rem; }
.tile.hide { display: none; }
.work { cursor: pointer; text-decoration: none; display: block; color: inherit; }
.work .fimg { overflow: hidden; background: var(--wd-ovbg); }
.work .fimg img { transition: transform .5s ease; }
.work:hover .fimg img, .work:focus-visible .fimg img { transform: scale(1.015); }
.special-tag { font-family: var(--wd-sans); font-size: 9.5px; letter-spacing: .2em; text-transform: uppercase; color: var(--wd-grey); margin-top: .5rem; }

.feat { display: grid; grid-template-columns: 7fr 5fr; gap: 3.5rem; align-items: center; }
.feat.flip .fimg { order: 2; }
.feat .ftxt { max-width: 420px; }
.feat h2 { font-family: var(--wd-serif); font-weight: normal; font-size: clamp(1.8rem, 3.4vw, 2.75rem); letter-spacing: .008em; margin: 1rem 0 .25rem; }
.feat .bed { font-family: var(--wd-serif); font-style: italic; font-size: 1.05rem; color: var(--wd-grey); margin-bottom: 1.25rem; }
.feat .story { font-family: var(--wd-serif); font-size: 1.03rem; line-height: 1.75; color: #37342D; margin-bottom: 1.5rem; }
@media (max-width: 900px) { .feat { grid-template-columns: 1fr; gap: 1.5rem; } .feat.flip .fimg { order: 0; } .feat h2 { font-size: 2.1rem; } }

.trio { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.75rem; margin-bottom: 5.25rem; }
@media (max-width: 900px) { .trio { grid-template-columns: 1fr; gap: 3.25rem; } }
.trio .work { margin: 0; }
.trio h2 { font-family: var(--wd-serif); font-weight: normal; font-size: 1.4rem; margin: .85rem 0 .1rem; }
.trio .bed { font-family: var(--wd-serif); font-style: italic; font-size: .85rem; color: var(--wd-grey); margin-bottom: .7rem; }
.trio .story { font-family: var(--wd-serif); font-size: .84rem; line-height: 1.65; color: #4A463E; margin-bottom: 1rem; }
.trio .micro { margin-top: 1.1rem; }

.foot { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.chips { display: flex; gap: 0; }
.chip { width: 15px; height: 15px; display: inline-block; }
.read { font-family: var(--wd-sans); font-size: 9.5px; letter-spacing: .22em; text-transform: uppercase; color: var(--wd-ink); border-bottom: 1px solid var(--wd-ink); padding-bottom: 2px; white-space: nowrap; }

.band { border-top: 1px solid var(--wd-hair); border-bottom: 1px solid var(--wd-hair); padding: 2.75rem 0 2.85rem; text-align: center; }
.band .claim { font-family: var(--wd-serif); font-style: italic; font-size: 1.35rem; line-height: 1.55; color: #37342D; max-width: 640px; margin: 1.1rem auto 1.35rem; }
.slink, .plink { font-family: var(--wd-sans); font-size: 10px; letter-spacing: .24em; text-transform: uppercase; background: none; border: none; border-bottom: 1px solid var(--wd-ink); padding: 0 0 3px; color: var(--wd-ink); cursor: pointer; text-decoration: none; }

.rv { opacity: 0; transform: translateY(20px); transition: opacity .7s ease, transform .7s ease; }
.rv.in { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) { .rv { opacity: 1; transform: none; transition: none; } .work .fimg img { transition: none; } }

.ov { position: fixed; inset: 0; background: rgba(31,29,26,.5); z-index: 2000; display: none; align-items: stretch; justify-content: flex-end; }
.ov.open { display: flex; }
.ovbox { background: var(--wd-paper); width: min(1020px, 100%); overflow: auto; display: grid; grid-template-columns: minmax(0,45%) 1fr; }
@media (max-width: 820px) { .ovbox { grid-template-columns: 1fr; } }
.ovimg { background: var(--wd-ovbg); display: flex; flex-direction: column; align-items: center; padding: clamp(1.5rem, 4vw, 2.75rem); }
.ovimg img { width: 100%; height: auto; box-shadow: 0 18px 50px rgba(31,29,26,.22); }
.ovimg .plantoggle { margin-top: 1.25rem; font-family: var(--wd-sans); font-size: 9.5px; letter-spacing: .2em; text-transform: uppercase; color: var(--wd-grey); background: none; border: none; border-bottom: 1px solid var(--wd-grey); cursor: pointer; padding: 0 0 2px; }
.ovtxt { padding: clamp(2.5rem, 6vw, 4.75rem) clamp(1.5rem, 4vw, 4rem) 4.25rem; }
.ovtxt h2 { font-family: var(--wd-serif); font-weight: normal; font-size: clamp(1.9rem, 3.6vw, 2.9rem); margin: 1.1rem 0 .25rem; }
.ovtxt .bed { font-family: var(--wd-serif); font-style: italic; font-size: 1.1rem; color: var(--wd-grey); margin-bottom: 1.6rem; }
.ovtxt .story { font-family: var(--wd-serif); font-size: 1.05rem; line-height: 1.8; color: #37342D; margin-bottom: 1.5rem; }
.ovtxt .special { font-family: var(--wd-serif); font-size: .98rem; line-height: 1.75; color: #37342D; background: rgba(31,29,26,.045); border-left: 2px solid var(--wd-ink); padding: .9rem 1.1rem; margin-bottom: 1.6rem; }
.ovtxt .special strong { font-family: var(--wd-sans); font-style: normal; font-size: 9.5px; letter-spacing: .18em; text-transform: uppercase; display: block; margin-bottom: .4rem; color: var(--wd-grey); }
.ovtxt .chips { margin-bottom: 1.5rem; flex-wrap: wrap; row-gap: .5rem; }
.ovtxt .chip { width: 26px; height: 26px; }
.palette-list { list-style: none; margin: 0 0 1.5rem; padding: 0; display: grid; gap: .4rem; }
.palette-list li { display: flex; align-items: center; gap: .7rem; font-size: .82rem; color: var(--wd-grey); }
.palette-list .chip-sm { width: 15px; height: 15px; flex: none; border: 1px solid rgba(31,29,26,.12); }
.spec { font-size: 11px; letter-spacing: .06em; line-height: 2; color: var(--wd-grey); border-top: 1px solid var(--wd-hair); padding-top: 1.1rem; margin-bottom: 1.9rem; text-transform: uppercase; }
.ovcta { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; }
.cta { display: inline-block; font-family: var(--wd-sans); font-size: 11px; letter-spacing: .26em; text-transform: uppercase; color: var(--wd-paper); background: var(--wd-ink); padding: 1rem 1.6rem; text-decoration: none; }
.cta--ghost { color: var(--wd-ink); background: none; border: 1px solid var(--wd-ink); }
.ovclose { position: fixed; top: 1.35rem; right: clamp(1.25rem, 4vw, 1.9rem); z-index: 2010; font-size: 2.1rem; font-family: var(--wd-serif); color: #fff; background: rgba(31,29,26,.35); border: none; cursor: pointer; line-height: 1; width: 46px; height: 46px; border-radius: 50%; }
.ovclose:hover { background: rgba(31,29,26,.55); }

.wd-downloads { border-top: 1px solid var(--wd-hair); padding: 3rem 0; }
.wd-downloads h2 { font-family: var(--wd-serif); font-weight: normal; font-size: 1.6rem; margin: 0 0 .35rem; }
.wd-downloads p.std { font-size: .85rem; color: var(--wd-grey); margin-bottom: 1.5rem; max-width: 60ch; }
.wd-downloads ul { list-style: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: .6rem 2rem; margin: 0; padding: 0; }
.wd-downloads a { display: inline-flex; align-items: center; gap: .5rem; font-size: .85rem; border-bottom: 1px solid var(--wd-hair); padding-bottom: .3rem; text-decoration: none; }
.wd-downloads a:hover { border-color: var(--wd-ink); }
.wd-downloads a::before { content: '↓'; color: var(--wd-grey); }

.wd-footer { border-top: 1px solid var(--wd-hair); padding: 2.25rem 0 3.5rem; }
.wd-footer .wd-wrap { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--wd-grey); line-height: 2.1; }

/* Header/Nav mobil — 1:1 aus index.html übernommen (dort @media max-width: 720px). */
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
  .hero { padding-top: 7rem; }
  .fline { top: 62px; }
  .fline .wd-wrap { gap: .35rem .9rem; }
  .ovtxt { padding-top: 3rem; }
}
`;

/* ---------------------------------------------------------- Filter data */

function collectOptions(field, labelMap) {
  const set = new Set();
  DATA.entwuerfe.forEach((e) => e[field].forEach((v) => set.add(v)));
  return [...set].map((v) => ({ value: v, label: labelMap[v] || v }));
}
const STIMMUNGEN = collectOptions('stimmungen', STIMMUNG_LABEL);
const FARBWELTEN = collectOptions('farbwelten', FARBWELT_LABEL);
const TYPEN = [{ value: 'fond', label: 'Fond' }, { value: 'voll', label: 'Vollflächig' }, { value: 'laufer', label: 'Läufer' }];
const FORMATE = [{ value: 'hochformat', label: 'Hochformat' }, { value: 'quadrat', label: 'Quadrat' }, { value: 'laufer', label: 'Läufer' }];
const SPECIALS = [{ value: 'schlingenflor', label: 'Schlingenflor' }, { value: 'fransen', label: 'Fransen' }];

/* -------------------------------------------------------------- Karten */

function dataAttrs(e) {
  const typ = typBucket(e);
  const fmt = formatBucket(e);
  const search = [e.name, e.name_bedeutung, e.text_kurz, e.code, serienByKey.get(e.serie_key).name]
    .join(' ').toLowerCase().replace(/"/g, '');
  return `data-id="${e.id}" data-kollektion="${e.kollektion}" data-serie="${e.serie_key}" data-typ="${typ.key}" data-format="${fmt.key}"` +
    (e.special ? ` data-special="${e.special.typ}"` : '') +
    ` data-mood="${e.stimmungen.join(' ')}" data-color="${e.farbwelten.join(' ')}" data-search="${esc(search)}"`;
}

function microLine(e) {
  const s = serienByKey.get(e.serie_key);
  const roman = ROMAN[serieIndexInKollektion(e.serie_key)];
  const kurzname = s.name.replace(/^Serie \d+\s*—\s*/, '').replace(/^Reihe \d+\s*—\s*/, '');
  return `<span class="sdot" style="background:${serieDot(e.serie_key)}"></span>${e.kollektion === 'campo' ? 'Serie' : 'Reihe'} ${roman} — ${esc(kurzname)} &nbsp;·&nbsp; N° ${nn(e.nummer)} &nbsp;·&nbsp; ${esc(typBucket(e).label)}`;
}

function chips(e, size = '') {
  return e.farben.map((f) => `<span class="chip${size}" style="background:${f.hex}"></span>`).join('');
}

function specialTag(e) {
  if (!e.special) return '';
  const label = e.special.typ === 'schlingenflor' ? 'Schlingenflor' : 'Fransen';
  return `<div class="special-tag">Special: ${label}</div>`;
}

function featureCard(e, { eager = false } = {}) {
  return `<article class="tile work feat rv" ${dataAttrs(e)}>
  <a class="fimg" href="${BASE}/${e.id}/">${picture(e, 'real', { sizes: '(min-width: 900px) 58vw, 92vw', eager })}</a>
  <div class="ftxt">
    <div class="micro">${microLine(e)}</div>
    <a href="${BASE}/${e.id}/" style="text-decoration:none;color:inherit;">
      <h2>${esc(e.name)}</h2>
      <div class="bed">${esc(e.name_bedeutung.replace(/^[^:]+:\s*/, ''))}</div>
    </a>
    <p class="story">${esc(e.text_kurz)}</p>
    <div class="foot"><div class="chips">${chips(e)}</div><a class="read" href="${BASE}/${e.id}/">Geschichte lesen</a></div>
    ${specialTag(e)}
  </div>
</article>`;
}

function trioCard(e) {
  return `<article class="tile work rv" ${dataAttrs(e)}>
  <a class="fimg" href="${BASE}/${e.id}/">${picture(e, 'real', { sizes: '(min-width: 900px) 28vw, 92vw' })}</a>
  <a href="${BASE}/${e.id}/" style="text-decoration:none;color:inherit;">
    <h2>${esc(e.name)}</h2>
    <div class="bed">${esc(e.name_bedeutung.replace(/^[^:]+:\s*/, ''))}</div>
  </a>
  <p class="story">${esc(e.text_kurz)}</p>
  <div class="foot"><div class="chips">${chips(e)}</div><a class="read" href="${BASE}/${e.id}/">Geschichte lesen</a></div>
  ${specialTag(e)}
  <div class="micro">${microLine(e)}</div>
</article>`;
}

function serieBand(serieKey) {
  const s = serienByKey.get(serieKey);
  const kollektion = s.kollektion === 'campo' ? 'campo' : 'trama';
  return `<div class="tile band rv" data-kollektion="${kollektion}" data-band-serie="${s.key}">
  <div class="micro"><span class="sdot" style="background:${serieDot(s.key)}"></span>${esc(s.name)}</div>
  <p class="claim">${esc(s.claim)}</p>
  <button class="slink" data-serie="${s.key}" data-kollektion="${kollektion}">Serie entdecken</button>
</div>`;
}

const PAIR_CLAIM = 'Hora Azul lässt den Abend in tiefes Grün sinken — Alvorada dreht das Bild um: die Nacht oben, ein Lichtstreif, der Tag kommt von unten.';

function pairBand() {
  return `<div class="tile band rv" data-kollektion="campo">
  <div class="micro">Ein Paar, zwei Tageszeiten</div>
  <p class="claim">${esc(PAIR_CLAIM)}</p>
  <button class="plink" data-pair="campo-17-hora-azul,campo-27-alvorada">Beide ansehen</button>
</div>`;
}

/* ----------------------------------------------------- Stream-Assembly */

function renderKollektionStream(kollektionKey) {
  const k = kollektionenByKey.get(kollektionKey);
  const byNummer = new Map(DATA.entwuerfe.filter((e) => e.kollektion === kollektionKey).map((e) => [e.nummer, e]));
  let html = '';
  let first = true;
  for (const item of k.edition_stream) {
    if (typeof item === 'number') {
      const e = byNummer.get(item);
      html += featureCard(e, { eager: first }) + '\n';
      first = false;
    } else if (item.typ === 'g') {
      html += `<div class="trio">\n` + item.nummern.map((n) => trioCard(byNummer.get(n))).join('\n') + `\n</div>\n`;
    } else if (item.typ === 'serie') {
      html += serieBand(item.serie_key) + '\n';
    } else if (item.typ === 'pair') {
      html += pairBand() + '\n';
    }
  }
  return html;
}

/* --------------------------------------------------------- Overlay-Body */

function overlayContent(e) {
  const s = serienByKey.get(e.serie_key);
  const fmt = formatBucket(e);
  const specialBlock = e.special ? `<div class="special"><strong>Special — nach individueller Besprechung</strong>${esc(e.special.text)}</div>` : '';
  const paletteList = e.farben.map((f) => `<li><span class="chip-sm" style="background:${f.hex}"></span><span>${esc(f.name)} — ${esc(f.hex)} · ${esc(f.pantone_fhi)}</span></li>`).join('');
  return `
    <div class="ovimg" data-real="${e.id}">
      <div class="ov-picture-real">${picture(e, 'real', { sizes: '46vw', eager: true })}</div>
      <div class="ov-picture-plan" hidden>${picture(e, 'plan', { sizes: '46vw' })}</div>
      <button class="plantoggle" type="button" data-toggle-plan>Plan-Ansicht</button>
    </div>
    <div class="ovtxt">
      <div class="micro">${microLine(e)}</div>
      <h2>${esc(e.name)}</h2>
      <div class="bed">— ${esc(e.name_bedeutung.replace(/^[^:]+:\s*/, ''))}</div>
      <p class="story">${esc(e.text_lang)}</p>
      ${specialBlock}
      <div class="chips ovtxt-chips" style="display:flex;">${chips(e, '')}</div>
      <ul class="palette-list">${paletteList}</ul>
      <div class="spec">${esc(e.format_cm)} cm, frei skalierbar · ${esc(fmt.label)} · Fond: ${esc(e.fond)}<br>${esc(e.material)}<br>Herstellung: ${esc(e.herstellung)}<br>Eignung: ${esc(e.eignung)}<br>Downloads: <a href="/downloads/${SERIEN_PDF[s.key]}">Konzept-PDF ${esc(s.name)}</a> · <a href="/downloads/${FARBKARTE_PDF}">Farbkarte</a></div>
      <div class="ovcta">
        <a class="cta" href="${kontaktUrl(e)}">Wanna do? — Anfragen</a>
        <a class="cta cta--ghost" href="${mailtoUrl(e)}">Direkt per E-Mail</a>
      </div>
    </div>`;
}

/* ------------------------------------------------------------- Seiten */

function pageShell({ path, title, description, ogImage, openId, jsonld, itemListJsonld }) {
  const url = ORIGIN + path;
  const defaultChapter = openId ? entwuerfeById.get(openId).kollektion : 'campo';
  const openScript = `<script>window.__WD_OPEN_ID = ${JSON.stringify(openId)}; window.__WD_DEFAULT_CHAPTER = ${JSON.stringify(defaultChapter)};</script>`;
  const jsonldTags = [jsonld, itemListJsonld].filter(Boolean)
    .map((obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`).join('\n    ');
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
    ${jsonldTags}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
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
        <div class="wd-wrap">
            ${['campo', 'trama', 'alles'].map((ch) => `<div class="hero-content" data-chapter-content="${ch}"${ch !== defaultChapter ? ' hidden' : ''}>
                <div class="micro">${esc(HERO_COPY[ch].kicker)}</div>
                <h1>${HERO_COPY[ch].title}</h1>
                <p class="lede">${HERO_COPY[ch].lede}</p>
                <div class="no">${esc(HERO_COPY[ch].line)}</div>
            </div>`).join('\n            ')}
            <nav class="chapters" aria-label="Kapitel">
                <a href="?kollektion=campo" data-chapter="campo"${defaultChapter === 'campo' ? ' class="on"' : ''}>Campo N°1</a>
                <a href="?kollektion=trama" data-chapter="trama"${defaultChapter === 'trama' ? ' class="on"' : ''}>Trama N°2</a>
                <a href="?kollektion=alles" data-chapter="alles"${defaultChapter === 'alles' ? ' class="on"' : ''}>Alles</a>
            </nav>
        </div>
    </header>

    <nav class="fline" aria-label="Filter"${FILTERS_ENABLED ? '' : ' hidden'}>
        <div class="wd-wrap">
            <input id="q" type="search" placeholder="Suchen — Name, Wort, Geschichte …" aria-label="Suche">
            <span class="sep">|</span>
            <span class="lbl">Stimmung</span>
            ${STIMMUNGEN.map((o) => `<a class="flink" data-g="mood" data-v="${o.value}" href="?stimmung=${o.value}">${esc(o.label)}</a>`).join('')}
            <span class="sep">|</span>
            <span class="lbl">Farbe</span>
            ${FARBWELTEN.map((o) => `<a class="flink" data-g="color" data-v="${o.value}" href="?farbe=${o.value}">${esc(o.label)}</a>`).join('')}
            <span class="sep">|</span>
            <span class="lbl">Typ</span>
            ${TYPEN.map((o) => `<a class="flink" data-g="typ" data-v="${o.value}" href="?typ=${o.value}">${esc(o.label)}</a>`).join('')}
            <span class="sep">|</span>
            <span class="lbl">Format</span>
            ${FORMATE.map((o) => `<a class="flink" data-g="format" data-v="${o.value}" href="?format=${o.value}">${esc(o.label)}</a>`).join('')}
            <span class="sep">|</span>
            <span class="lbl">Special</span>
            ${SPECIALS.map((o) => `<a class="flink" data-g="special" data-v="${o.value}" href="?special=${o.value}">${esc(o.label)}</a>`).join('')}
            <span class="sep">|</span>
            <button class="reset" id="reset" type="button">Alles zeigen</button>
        </div>
    </nav>
    <div class="wd-wrap"${FILTERS_ENABLED ? '' : ' hidden'}><div class="rcount" id="count" aria-live="polite"></div></div>

    <main class="stream"><div class="wd-wrap" id="stream">
${renderKollektionStream('campo')}
${renderKollektionStream('trama')}
    </div></main>

    <section class="wd-downloads">
        <div class="wd-wrap">
            <h2>Downloads</h2>
            <p class="std">${esc(DATA.wanna_do_collection.standard)} ${esc(DATA.wanna_do_collection.specials_hinweis)}</p>
            <ul>
                ${[...new Set(Object.values(SERIEN_PDF))].map((pdf) => `<li><a href="/downloads/${pdf}">${esc(pdf.replace('thegrey-wannado-', '').replace('-konzept.pdf', '').replace(/-/g, ' '))} — Konzept-PDF</a></li>`).join('\n                ')}
                <li><a href="/downloads/${FARBKARTE_PDF}">Farbkarte CAMPO — PDF</a></li>
            </ul>
        </div>
    </section>

    <footer class="wd-footer"><div class="wd-wrap">Handgetuftet · 100 % Neuseelandwolle, matt, geschnittener Flor · Formate frei skalierbar<br>${esc(DATA.wanna_do_collection.pantone_hinweis)}</div></footer>

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

/* ------------------------------------------------------- Client-Daten */

function buildClientData() {
  const overlays = {};
  DATA.entwuerfe.forEach((e) => { overlays[e.id] = overlayContent(e); });
  return {
    hero: HERO_COPY,
    overlays,
    base: BASE,
  };
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

  function setHero(chapter) {
    document.querySelectorAll('.hero-content').forEach(function (el) {
      el.hidden = el.dataset.chapterContent !== chapter;
    });
    document.querySelectorAll('.chapters a').forEach(function (a) {
      a.classList.toggle('on', a.dataset.chapter === chapter);
    });
  }

  var params = new URLSearchParams(window.location.search);
  var state = {
    q: params.get('q') || '',
    mood: params.get('stimmung') || null,
    color: params.get('farbe') || null,
    typ: params.get('typ') || null,
    format: params.get('format') || null,
    special: params.get('special') || null,
    serie: params.get('serie') || null,
    kollektion: params.get('kollektion') || window.__WD_DEFAULT_CHAPTER || 'campo',
    pair: null,
  };
  if (state.kollektion === 'alles' && !params.has('kollektion') === false) { /* explicit alles ok */ }

  var works = [].slice.call(document.querySelectorAll('.work'));
  var bands = [].slice.call(document.querySelectorAll('.band'));
  var trios = [].slice.call(document.querySelectorAll('.trio'));
  var countEl = document.getElementById('count');
  var qInput = document.getElementById('q');
  if (state.q) qInput.value = state.q;

  function syncUrl() {
    var p = new URLSearchParams();
    if (state.kollektion && state.kollektion !== 'campo') p.set('kollektion', state.kollektion);
    if (state.q) p.set('q', state.q);
    if (state.mood) p.set('stimmung', state.mood);
    if (state.color) p.set('farbe', state.color);
    if (state.typ) p.set('typ', state.typ);
    if (state.format) p.set('format', state.format);
    if (state.special) p.set('special', state.special);
    if (state.serie) p.set('serie', state.serie);
    var qs = p.toString();
    var path = window.location.pathname;
    history.replaceState(null, '', path + (qs ? '?' + qs : ''));
  }

  function apply(opts) {
    opts = opts || {};
    var n = 0;
    var anyFilter = state.q || state.mood || state.color || state.typ || state.format || state.special || state.serie || state.pair;
    works.forEach(function (c) {
      var ok = true;
      if (state.kollektion !== 'alles' && c.dataset.kollektion !== state.kollektion) ok = false;
      if (ok && state.pair) { ok = state.pair.indexOf(c.dataset.id) !== -1; }
      else if (ok) {
        if (state.q && c.dataset.search.indexOf(state.q) === -1) ok = false;
        if (state.mood && c.dataset.mood.split(' ').indexOf(state.mood) === -1) ok = false;
        if (state.color && c.dataset.color.split(' ').indexOf(state.color) === -1) ok = false;
        if (state.typ && c.dataset.typ !== state.typ) ok = false;
        if (state.format && c.dataset.format !== state.format) ok = false;
        if (state.special && c.dataset.special !== state.special) ok = false;
        if (state.serie && c.dataset.serie !== state.serie) ok = false;
      }
      c.classList.toggle('hide', !ok);
      if (ok) n++;
    });
    bands.forEach(function (b) {
      var kOk = state.kollektion === 'alles' || b.dataset.kollektion === state.kollektion;
      b.classList.toggle('hide', !kOk || !!anyFilter);
    });
    trios.forEach(function (t) {
      var allHidden = [].slice.call(t.children).every(function (c) { return c.classList.contains('hide'); });
      t.style.display = allHidden ? 'none' : '';
    });
    countEl.textContent = anyFilter ? (n + ' Entwürfe') : '';
    if (!opts.skipUrl) syncUrl();
  }

  document.querySelectorAll('.fline a.flink').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      var g = a.dataset.g, on = a.classList.contains('on');
      document.querySelectorAll('.fline a.flink[data-g="' + g + '"]').forEach(function (x) { x.classList.remove('on'); });
      state.pair = null;
      state[g] = on ? null : a.dataset.v;
      if (!on) a.classList.add('on');
      apply();
    });
  });
  qInput.addEventListener('input', function (e) { state.q = e.target.value.toLowerCase().trim(); state.pair = null; apply(); });
  document.getElementById('reset').addEventListener('click', function () {
    ['q', 'mood', 'color', 'typ', 'format', 'special', 'serie', 'pair'].forEach(function (k) { state[k] = k === 'q' ? '' : null; });
    qInput.value = '';
    document.querySelectorAll('.fline a.flink.on').forEach(function (a) { a.classList.remove('on'); });
    apply();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.querySelectorAll('.slink').forEach(function (b) {
    b.addEventListener('click', function () {
      state.serie = b.dataset.serie; state.pair = null;
      if (b.dataset.kollektion) { state.kollektion = b.dataset.kollektion; setHero(state.kollektion); }
      apply();
      document.querySelector('.fline').scrollIntoView({ behavior: 'smooth' });
    });
  });
  document.querySelectorAll('.plink').forEach(function (b) {
    b.addEventListener('click', function () {
      state.pair = b.dataset.pair.split(',');
      apply();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
  document.querySelectorAll('.chapters a').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      state.kollektion = a.dataset.chapter;
      state.serie = null; state.pair = null;
      setHero(state.kollektion);
      apply();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* Overlay */
  var ov = document.getElementById('ov'), ovbox = document.getElementById('ovbox');
  var lastFocus = null;

  function planToggleInit(scope) {
    var btn = scope.querySelector('[data-toggle-plan]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var real = scope.querySelector('.ov-picture-real');
      var plan = scope.querySelector('.ov-picture-plan');
      var showingPlan = !plan.hidden;
      plan.hidden = showingPlan;
      real.hidden = !showingPlan;
      btn.textContent = showingPlan ? 'Plan-Ansicht' : 'Real-Ansicht';
    });
  }

  function openOverlay(id, push, alreadyRendered) {
    if (!alreadyRendered) {
      var html = WD.overlays[id];
      if (!html) return;
      ovbox.innerHTML = html;
    }
    planToggleInit(ovbox);
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
    if (!pop) history.pushState({}, '', BASE + '/' + window.location.search);
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

  /* Scroll reveal */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .12 });
    document.querySelectorAll('.rv').forEach(function (t) { io.observe(t); });
  } else {
    document.querySelectorAll('.rv').forEach(function (t) { t.classList.add('in'); });
  }

  window.addEventListener('scroll', function () {
    header.classList.toggle('scrolled', window.scrollY > 30);
  });

  setHero(state.kollektion);
  apply({ skipUrl: true });

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

function buildRoot() {
  const k = kollektionenByKey.get('campo');
  const hero = entwuerfeById.get(k.hero_id);
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Wanna Do Collection — THE GREY',
    itemListElement: DATA.entwuerfe.map((e, i) => ({
      '@type': 'ListItem', position: i + 1, url: `${ORIGIN}${BASE}/${e.id}/`,
    })),
  };
  const html = pageShell({
    path: `${BASE}/`,
    title: 'Wanna Do Collection — Campo & Trama — THE GREY',
    description: DATA.wanna_do_collection.kurzbeschreibung,
    ogImage: hero.bilder_real.jpeg_1500,
    openId: null,
    itemListJsonld: jsonld,
  });
  writeFile(`${BASE}/index.html`, html);
}

function buildPermalinks() {
  for (const e of DATA.entwuerfe) {
    const s = serienByKey.get(e.serie_key);
    const jsonld = {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: `${e.code} ${e.name}`,
      alternateName: e.name_bedeutung,
      description: e.text_kurz,
      image: `${ORIGIN}/${e.bilder_real.jpeg_1500}`,
      url: `${ORIGIN}${BASE}/${e.id}/`,
      creator: { '@type': 'Organization', name: 'THE GREY', url: ORIGIN + '/' },
      isPartOf: { '@type': 'CollectionPage', name: kollektionenByKey.get(e.kollektion).name, url: `${ORIGIN}${BASE}/` },
      material: e.material,
    };
    const html = pageShell({
      path: `${BASE}/${e.id}/`,
      title: `${e.code} ${e.name} — Teppichentwurf — THE GREY Wanna Do Collection`,
      description: e.text_kurz,
      ogImage: e.bilder_real.jpeg_1500,
      openId: e.id,
      jsonld,
    });
    writeFile(`${BASE}/${e.id}/index.html`, html);
  }
}

function buildClientJs() {
  writeFile(`${BASE}/stream.js`, CLIENT_JS);
}

function cleanupOldStructure() {
  const old = DATA.entwuerfe.filter((e) => e.kollektion === 'campo' && e.nummer <= 22);
  // Alte Serien-Ordner (existieren in der neuen IA nicht mehr als eigene Route)
  for (const serieKey of ['serie-1-fond', 'serie-2-cheio', 'serie-3-amanha', 'serie-4-elo']) {
    const dir = join(ROOT, BASE.slice(1), serieKey);
    if (existsSync(dir)) { rmSync(dir, { recursive: true }); console.log('✗ entfernt', `${BASE}/${serieKey}/`); }
  }
}

function buildSitemap() {
  const urls = [];
  urls.push(`  <url>\n    <loc>${ORIGIN}/</loc>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>`);
  urls.push(`  <url>\n    <loc>${ORIGIN}/index-en.html</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.9</priority>\n  </url>`);
  urls.push(`  <url>\n    <loc>${ORIGIN}${BASE}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>`);
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
  const campo = kollektionenByKey.get('campo');
  const trama = kollektionenByKey.get('trama');
  const campoHero = entwuerfeById.get(campo.hero_id);
  const tramaHero = entwuerfeById.get(trama.hero_id);
  const tile = (k, hero) => {
    const d = imgDims(hero.bilder_real.jpeg_1500);
    return `                <a class="wd-teaser__tile" href="wanna-do-collection/?kollektion=${k.key}">
                    <img src="/${hero.bilder_real.webp_400}" alt="${esc(hero.alt_text)}" width="${d.w}" height="${d.h}" loading="lazy" decoding="async">
                    <span>${esc(k.name)}</span>
                    <p>${esc(k.claim)}</p>
                </a>`;
  };
  const teaser = `${start}
        <section class="section wd-teaser" id="wanna-do">
            <div class="section__container">
                <div class="section__header reveal">
                    <span class="section__eyebrow">${de ? 'Wanna Do Collection' : 'Wanna Do Collection'}</span>
                    <h2 class="section__title">${de ? 'Campo &amp;<br><em>Trama.</em>' : 'Campo &amp;<br><em>Trama.</em>'}</h2>
                    <p class="section__intro">${de
                      ? esc(DATA.wanna_do_collection.kurzbeschreibung) + ' 39 Entwürfe in zwei Kollektionen — durchsuchbar, filterbar, einen Klick von ihrer ganzen Geschichte entfernt.'
                      : 'Curated rug designs as inspiration for planners and interior architects — starting points for individually crafted rugs, not end products. 39 designs across two collections, searchable and filterable — in German.'}</p>
                </div>
                <div class="wd-teaser__grid reveal">
${tile(campo, campoHero)}
${tile(trama, tramaHero)}
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

cleanupOldStructure();
buildRoot();
buildPermalinks();
buildClientJs();
buildSitemap();
injectTeaser('index.html', 'de');
injectTeaser('index-en.html', 'en');
console.log(`\nFertig: Stream + ${DATA.entwuerfe.length} Permalinks generiert (${kollektionenByKey.get('campo').edition_stream.length + kollektionenByKey.get('trama').edition_stream.length} Stream-Einträge).`);

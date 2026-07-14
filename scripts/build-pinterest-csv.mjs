#!/usr/bin/env node
/**
 * Generator: Pinterest-Bulk-Upload-CSV für die PRÓPRIO-Kollektion.
 *
 * Erzeugt aus data/designs.json eine CSV nach Pinterests offiziellem Bulk-Format
 * (Title, Media URL, Pinterest board, Description, Link, Publish date, Keywords) —
 * https://help.pinterest.com/en/business/article/bulk-upload-video-pins
 *
 * Wird NICHT deployt (siehe .gitignore) — reines lokales Marketing-Tool. Upload
 * manuell im Pinterest Business Hub unter „Bulk create Pins".
 *
 * Aufruf: node scripts/build-pinterest-csv.mjs   (vom Repo-Root)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = JSON.parse(readFileSync(join(ROOT, 'data/designs.json'), 'utf8'));
const ORIGIN = 'https://www.thegrey.berlin';
const BASE = '/wanna-do-collection';
const BOARD = `THE GREY — ${DATA.kollektion.name}`;

/* ---------------------------------------------------------------- Utils */

// RFC-4180-CSV: Feld in Anführungszeichen, interne " verdoppelt.
const csvField = (v) => `"${String(v).replace(/"/g, '""')}"`;

// Portugiesische Farbnamen aus dem Kit → deutsche Suchbegriffe für Pinterest.
const COLOR_DE = {
  'Rosa': 'Rosa', 'Creme': 'Creme', 'Vermelho': 'Rot', 'Índigo': 'Indigo',
  'Azul': 'Blau', 'Céu': 'Himmelblau', 'Âmbar': 'Ocker', 'Verde': 'Grün',
  'Lilás': 'Lila', 'Marinho': 'Marineblau', 'Laranja': 'Orange',
  'Bordô': 'Bordeaux', 'Areia': 'Sandbeige', 'Roxo': 'Violett', 'Petrol': 'Petrol',
};

function keywords(e) {
  const colors = [...new Set(e.farben.map((f) => COLOR_DE[f.name] || f.name))];
  const base = ['Teppich', 'Design-Teppich', 'handgetuftet', 'Wollteppich', 'Interior Design', 'Wohnzimmer Deko', e.typ];
  return [...base, ...colors].join(', ');
}

function title(e) {
  const bedeutung = e.name_bedeutung.replace(/^[^:]+:\s*/, '');
  return `${DATA.kollektion.name} — ${e.name} (${bedeutung})`;
}

function description(e) {
  return `${e.text_kurz} Handgetuftet aus 100 % Neuseelandwolle, ${e.format_cm}, frei skalierbar. Aus der Kollektion ${DATA.kollektion.name} (THE GREY, Wanna Do ${DATA.kollektion.code}) — Ausgangspunkt für deinen individuell gefertigten Teppich.`;
}

/* --------------------------------------------------------------- Build */

const header = ['Title', 'Media URL', 'Pinterest board', 'Description', 'Link', 'Keywords'];
const rows = DATA.entwuerfe.map((e) => [
  title(e),
  `${ORIGIN}/${e.bilder.jpeg_1500}`,
  BOARD,
  description(e),
  `${ORIGIN}${BASE}/${e.id}/`,
  keywords(e),
]);

// Zeichenlimits gegenprüfen (Title ≤ 100, Description ≤ 500) — Pinterest kürzt sonst
// selbst und ggf. an ungünstiger Stelle.
for (const [i, row] of rows.entries()) {
  const [t, , , desc] = row;
  if (t.length > 100) console.warn(`⚠ Title zu lang (${t.length}/100): ${DATA.entwuerfe[i].id}`);
  if (desc.length > 500) console.warn(`⚠ Description zu lang (${desc.length}/500): ${DATA.entwuerfe[i].id}`);
}

const csv = '﻿' + [header, ...rows].map((r) => r.map(csvField).join(',')).join('\r\n') + '\r\n';

const outDir = join(ROOT, 'pinterest');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'proprio-bulk-upload.csv');
writeFileSync(outPath, csv);

console.log(`✓ pinterest/proprio-bulk-upload.csv (${rows.length} Pins, Board „${BOARD}")`);
console.log('  Upload: business.pinterest.com → Erstellen → Pins im Bulk erstellen');

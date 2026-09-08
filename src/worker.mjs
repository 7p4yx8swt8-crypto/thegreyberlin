/**
 * Cloudflare Worker für thegrey.berlin
 *
 * Statische Seiten liefert weiterhin das Assets-System aus (assets-first:
 * Requests auf existierende Dateien erreichen dieses Script nie). Das Script
 * behandelt ausschließlich Nicht-Asset-Routen — aktuell nur POST /api/contact:
 * nimmt das Kontaktformular entgegen und sendet es per Resend-API als E-Mail
 * an hallo@thegrey.berlin.
 *
 * Setup: Resend-Account mit verifizierter Domain thegrey.berlin, API-Key als
 * Worker-Secret RESEND_API_KEY hinterlegen:  npx wrangler secret put RESEND_API_KEY
 */

const EMPFAENGER = 'hallo@thegrey.berlin';
const ABSENDER = 'THE GREY Website <formular@thegrey.berlin>';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

async function handleContact(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed' });
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, error: 'Ungültige Anfrage' });
  }

  // Honeypot: echte Besucher füllen das versteckte Feld nie aus.
  if (data.website) {
    return jsonResponse(200, { ok: true });
  }

  const name = String(data.name || '').trim().slice(0, 200);
  const email = String(data.email || '').trim().slice(0, 200);
  const betreff = String(data.betreff || '').trim().slice(0, 300);
  const nachricht = String(data.nachricht || '').trim().slice(0, 5000);

  if (!name || !email || !nachricht || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return jsonResponse(400, { ok: false, error: 'Bitte Name, gültige E-Mail und Nachricht angeben.' });
  }

  if (!env.RESEND_API_KEY) {
    return jsonResponse(503, { ok: false, error: 'Mailversand noch nicht konfiguriert.' });
  }

  const subject = betreff ? `Website-Anfrage: ${betreff}` : `Website-Anfrage von ${name}`;
  const html = `
    <h2 style="font-family:sans-serif;">Neue Anfrage über thegrey.berlin</h2>
    <table style="font-family:sans-serif; border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0; color:#888;">Name</td><td>${esc(name)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0; color:#888;">E-Mail</td><td>${esc(email)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0; color:#888;">Betreff</td><td>${esc(betreff || '—')}</td></tr>
    </table>
    <p style="font-family:sans-serif; white-space:pre-wrap; border-top:1px solid #ddd; padding-top:12px;">${esc(nachricht)}</p>`;

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: ABSENDER,
      to: [EMPFAENGER],
      reply_to: email,
      subject,
      html,
    }),
  });

  if (!resendResponse.ok) {
    console.error('Resend-Fehler', resendResponse.status, await resendResponse.text());
    return jsonResponse(502, { ok: false, error: 'Versand fehlgeschlagen. Bitte direkt an hallo@thegrey.berlin schreiben.' });
  }

  return jsonResponse(200, { ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') {
      return handleContact(request, env);
    }
    // Alles andere: an das Assets-System durchreichen (404-Handling inklusive).
    return env.ASSETS.fetch(request);
  },
};

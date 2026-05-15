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

### Legacy redirects
0-second redirects to preserve old bookmarks:
- `index-de.html` → `index.html`
- `impressum-de.html` → `impressum.html`
- `datenschutz-de.html` → `datenschutz.html`

## Tech

- Pure HTML/CSS/JS, no build step
- Fonts: Archivo (headings) + Inter (body) via Google Fonts
- Images: hot-linked from a Wix CDN (placeholder, replace with own assets when ready)
- Fully responsive, mobile burger menu, lightbox gallery with category filters
- SEO: hreflang + canonical tags on all main pages, German set as `x-default`

## Before going live (or before next deploy)

1. **Hosting provider**: Open `datenschutz.html` and `privacy.html` and fill in the highlighted yellow placeholder for the hosting provider (DSGVO/GDPR requirement). For Cloudflare Pages, you can use: `Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, USA`.
2. **Contact form**: The form currently triggers only a JavaScript alert. To actually receive submissions, wire it up to Formspree, Cloudflare Workers, or another endpoint.
3. **Images**: The gallery images are hot-linked from a Wix CDN. Replace with your own images and update the `src` attributes in `index.html` and `index-en.html`.

## License

© 2026 thegrey.berlin – All rights reserved.

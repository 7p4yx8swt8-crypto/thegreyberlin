# thegrey.berlin – Website

Handcrafted custom rugs from Berlin. Static bilingual website (DE/EN).

## File structure

### German (default)
- `index.html` – Homepage
- `impressum.html` – Imprint (§5 TMG)
- `datenschutz.html` – Privacy Policy (GDPR)

### English
- `index-en.html` – Homepage
- `imprint.html` – Imprint (English translation)
- `privacy.html` – Privacy Policy (English translation)

### Legacy redirects
The following pages exist only as 0-second redirects to preserve any old bookmarks:
- `index-de.html` → `index.html`
- `impressum-de.html` → `impressum.html`
- `datenschutz-de.html` → `datenschutz.html`

## Tech

- Pure HTML/CSS/JS, no build step
- Fonts: Archivo + Inter via Google Fonts
- Images: hosted on Wix CDN (placeholder, replace with your own when ready)
- Fully responsive, mobile burger menu, lightbox gallery with category filters
- SEO: hreflang + canonical tags on all main pages, German set as `x-default`

## Before going live

1. **Domain**: All hreflang and canonical tags assume `https://thegrey.berlin/`. If your live domain differs, find-and-replace across the 6 main HTML files.
2. **Hosting provider**: Open `datenschutz.html` and `privacy.html` and fill in the highlighted placeholder for the hosting provider (DSGVO requirement).
3. **Contact form**: The form currently only triggers a JavaScript alert. To actually receive submissions, wire it up to Formspree, Netlify Forms, or a serverless function.
4. **Images**: The gallery images are hot-linked from a Wix CDN. Replace with your own images and update the `src` attributes.

## License

© 2026 thegrey.berlin – All rights reserved.

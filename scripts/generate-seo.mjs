// Writes public/robots.txt and public/sitemap.xml from VITE_SITE_URL (env var or .env). Runs before `npm run build`.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

let site = process.env.VITE_SITE_URL;
if (!site && existsSync('.env')) {
  const m = readFileSync('.env', 'utf8').match(/^VITE_SITE_URL=(.+)$/m);
  if (m) site = m[1].trim();
}
site = (site || 'http://localhost:5173').replace(/\/+$/, '');
mkdirSync('public', { recursive: true });

writeFileSync('public/robots.txt',
`User-agent: *
Allow: /
Disallow: /app
Disallow: /admin
Disallow: /login

Sitemap: ${site}/sitemap.xml
`);

// Only public pages are listed. Dashboards and lead data are never in the sitemap.
writeFileSync('public/sitemap.xml',
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${site}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>
</urlset>
`);
console.log(`SEO files written for ${site}`);

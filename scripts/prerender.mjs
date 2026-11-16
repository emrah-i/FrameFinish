import { mkdir, readFile, writeFile } from 'node:fs/promises';
const preview = process.argv.includes('--preview');
const build = new URL(preview && process.env.FRAME_FINISH_BROWSER_TEST === '1' ? '../dist/browser-tests/' : '../dist/', import.meta.url);
const { pages, renderPage } = await import(new URL('server/entry-server.js', build).href);
const output = new URL('client/', build);
const template = await readFile(new URL('index.html', output), 'utf8');
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const sitemap = [];
const analyticsToken = preview ? '' : process.env.FRAME_FINISH_ANALYTICS_TOKEN?.trim();
const analytics = analyticsToken
  ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon="${escape(JSON.stringify({ token: analyticsToken }))}"></script>`
  : '';

for (const path of Object.keys(pages)) {
  const page = renderPage(path);
  const metadata = [
    page.canonical && `<link rel="canonical" href="${escape(page.canonical)}" />`,
    page.noindex && '<meta name="robots" content="noindex, nofollow" />',
    '<meta property="og:type" content="website" />',
    `<meta property="og:title" content="${escape(page.title)}" />`,
    `<meta property="og:description" content="${escape(page.description)}" />`,
    page.canonical && `<meta property="og:url" content="${escape(page.canonical)}" />`,
    page.image && `<meta property="og:image" content="${escape(page.image)}" />`,
    page.organization && `<script type="application/ld+json">${JSON.stringify(page.organization).replaceAll('<', '\\u003c')}</script>`,
  ].filter(Boolean).join('\n');
  const html = template
    .replace(/<title>.*?<\/title>/, () => `<title>${escape(page.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, () => `<meta name="description" content="${escape(page.description)}" />`)
    .replace('<!--page-head-->', () => metadata)
    .replace('<!--app-html-->', () => page.html)
    .replace('<!--hydration-script-->', () => page.hydration)
    .replace('<!--web-analytics-->', () => analytics);
  const destination = new URL(path === '/' ? 'index.html' : path === '/404' ? '404.html' : `${path.slice(1)}.html`, output);
  await mkdir(new URL('.', destination), { recursive: true });
  await writeFile(destination, html);
  if (!page.noindex && page.canonical) sitemap.push(page.canonical);
}

await writeFile(new URL('robots.txt', output), sitemap.length
  ? `User-agent: *\nDisallow: /api/\nSitemap: ${new URL('/sitemap.xml', sitemap[0]).href}\n`
  : 'User-agent: *\nDisallow: /\n');
await writeFile(new URL('sitemap.xml', output), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemap.map(url => `<url><loc>${escape(url)}</loc></url>`).join('')}</urlset>\n`);

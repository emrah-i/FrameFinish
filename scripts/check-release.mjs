import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (file) => readFile(new URL(file, root), 'utf8');
const [site, wrangler] = await Promise.all([
  read('src/content/site.json').then(JSON.parse),
  read('wrangler.json').then(JSON.parse),
]);
const production = wrangler.env.production;
const issues = [];
const requireSetting = (condition, message) => { if (!condition) issues.push(message); };
const canonical = site.url ? new URL(site.url) : undefined;

requireSetting(canonical?.protocol === 'https:' && production.vars.SITE_URL === canonical.origin, 'Set matching HTTPS origins in site.json and Wrangler.');
requireSetting(production.routes.some(route => route.custom_domain && route.pattern === canonical?.hostname), 'Configure the confirmed custom domain.');
requireSetting(site.legalName && site.email, 'Confirm the legal business name and monitored email.');
requireSetting(production.ratelimits?.some(binding => binding.name === 'RATE_LIMITER'), 'Configure the production RATE_LIMITER binding.');
requireSetting(production.vars.EMAIL_FROM && production.vars.LEAD_EMAIL, 'Set the verified sender and monitored recipient.');

if (issues.length) {
  console.error(['Production setup is incomplete.', ...issues.map(issue => `- ${issue}`)].join('\n'));
  process.exit(1);
}
const homepage = await read('dist/client/index.html');
assert.equal(homepage.includes('noindex, nofollow'), Boolean(site.coverageProvisional), 'The built homepage has stale robots settings. Rebuild before deploying.');
assert.ok(homepage.includes(`rel="canonical" href="${canonical.origin}/"`), 'The built canonical URL is stale. Rebuild before deploying.');

if (site.coverageProvisional) {
  console.warn('Warning: The site is not indexable while coverageProvisional is enabled.');
}
if (site.phonePlaceholder) console.warn('Warning: Replace the placeholder phone or remove it and clear phonePlaceholder.');
if (!site.turnstileSiteKey) console.warn('Warning: Add the public production Turnstile site key to enable form verification.');

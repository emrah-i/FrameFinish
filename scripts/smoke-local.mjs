import assert from 'node:assert/strict';

const url = new URL(process.env.FRAME_FINISH_TEST_URL || 'http://127.0.0.1:8787');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Use a local Worker for this synthetic test.');
const get = (path) => fetch(new URL(path, url));
const servicePages = [
  ['/services/kitchen', 'Kitchen Remodeling'],
  ['/services/bathroom', 'Bathroom Remodeling'],
  ['/services/flooring', 'Flooring'],
];
const pageTitles = {
  '/': 'Frame &amp; Finish Remodeling',
  '/contact': 'Contact Us | Frame &amp; Finish Remodeling',
  '/services/kitchen': 'Kitchen Remodeling in Delaware County, OH | Frame &amp; Finish Remodeling',
  '/services/bathroom': 'Bathroom Remodeling in Delaware County, OH | Frame &amp; Finish Remodeling',
  '/services/flooring': 'Flooring in Delaware County, OH | Frame &amp; Finish Remodeling',
};
const serviceDescriptions = new Set();
for (const path of ['/', '/contact', '/privacy', '/terms', ...servicePages.map(([path]) => path)]) {
  const response = await get(path);
  assert.equal(response.status, 200);
  const html = await response.text();
  const pageTitle = pageTitles[path];
  if (pageTitle) {
    assert.ok(html.includes(`<title>${pageTitle}</title>`), `Unexpected page title on ${path}`);
    assert.ok(html.includes(`<meta property="og:title" content="${pageTitle}" />`), `Unexpected social title on ${path}`);
  }
  assert.doesNotMatch(html, /<!--[^>]*Font Awesome/i);
  if (path === '/terms') {
    assert.match(html, /Fonticons, Inc\./);
    assert.ok(html.includes('href="https://fontawesome.com/"'));
    assert.ok(html.includes('href="https://creativecommons.org/licenses/by/4.0/"'));
  }
  assert.match(html, /<h1[^>]*>/);
  assert.doesNotMatch(html, /\(placeholder\)/);
  assert.equal(response.headers.has('Set-Cookie'), false);
  for (const field of html.match(/<input\b[^>]*\btype="tel"[^>]*>/g) ?? []) {
    assert.ok(field.includes('placeholder="(614) 555-0142"'), `Expected a local phone placeholder on ${path}`);
  }
  const servicePage = servicePages.find(([servicePath]) => servicePath === path);
  if (path === '/' || servicePage) {
    assert.equal((html.match(/id="sticky-estimate-form"/g) ?? []).length, 1);
    assert.match(html, /class="sticky-estimate" hidden/);
    const heroActions = html.match(/class="hero-cta-buttons">([\s\S]*?)<\/div>/)?.[1] ?? '';
    assert.match(heroActions, /quote-action[\s\S]*See Our Work/);
  } else {
    assert.doesNotMatch(html, /id="sticky-estimate-form"/);
  }
  if (path === '/') {
    assert.match(html, /<h1[^>]*>Ohio’s Most Trusted Home Remodeling Experts Since 2010<\/h1>/);
    assert.ok(html.includes('Planning a kitchen, bathroom, or flooring update? Tell us about your project and get a free quote.'));
    assert.match(html, /href="#why-choose-us">See Our Work<\/a>/);
    assert.match(html, /<section\b[^>]*\bid="why-choose-us"/);
    for (const formId of ['hero-estimate-form', 'estimate-modal-form', 'bottom-estimate-form']) {
      assert.equal((html.match(new RegExp(`id="${formId}"`, 'g')) ?? []).length, 1);
    }
  }
  if (servicePage) {
    assert.equal((html.match(/id="hero-estimate-form"/g) ?? []).length, 1);
    const title = `${servicePage[1]} in Delaware County, OH`;
    const category = path.split('/').at(-1);
    assert.match(html, new RegExp(`<h1[^>]*>${title}</h1>`));
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.equal(new URL(canonical).pathname, path);
    const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    assert.match(description ?? '', /Delaware County, OH\b/);
    serviceDescriptions.add(description);
    assert.match(html, new RegExp(`href="${path}" aria-current="page"`));
    assert.match(html, /href="#featured-work">See Our Work<\/a>/);
    let position = -1;
    for (const marker of ['What’s Included</h2>', 'id="featured-work"', 'Frequently Asked Questions</h2>', 'id="remodel-gallery-title"', 'id="bottom-estimate-form"', '<footer']) {
      const next = html.indexOf(marker);
      assert.ok(next > position, `Expected ${marker} in order on ${path}`);
      position = next;
    }
    const included = html.slice(html.indexOf('What’s Included</h2>'), html.indexOf('id="featured-work"'));
    const cards = [...included.matchAll(/<li\b[^>]*class="service-card rounded">([\s\S]*?)<\/li>/g)];
    assert.equal(cards.length, 6);
    for (const [, card] of cards) {
      assert.equal((card.match(/quote-action/g) ?? []).length, 1);
      assert.doesNotMatch(card, /Learn More/);
    }
    const galleryPhotos = [
      `/images/remodel-${category}-before-960.webp`, `/images/remodel-${category}-after-960.webp`,
    ];
    const featured = html.slice(html.indexOf('id="featured-work"'), html.indexOf('id="service-faq-title"'));
    const estimateGallery = html.slice(html.indexOf('id="estimate-section"'), html.indexOf('id="bottom-estimate-form"'));
    const imageSources = region => [...region.matchAll(/src="(\/images\/remodel-[^"]+)"/g)].map(match => match[1]);
    const captions = region => [...region.matchAll(/<figcaption\b[^>]*>([^<]+)<\/figcaption>/g)].map(match => match[1]);
    const before = `${servicePage[1]}: Before`;
    const after = `${servicePage[1]}: After`;
    assert.deepEqual(imageSources(featured), [...galleryPhotos, ...galleryPhotos]);
    assert.deepEqual(captions(featured), [before, after, before, after]);
    assert.deepEqual(imageSources(estimateGallery), galleryPhotos);
    assert.deepEqual(captions(estimateGallery), ['Before', 'After']);
    assert.equal([...html.matchAll(/aria-expanded="false" aria-controls="service-faq-answer-/g)].length, 6);
    assert.match(html, new RegExp(`<option[^>]*value="${category}" selected>`));
    const redirect = await fetch(new URL(`${path}/`, url), { redirect: 'manual' });
    assert.ok([301, 302, 307, 308].includes(redirect.status));
    assert.equal(new URL(redirect.headers.get('Location'), url).pathname, path);
  }
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
}
assert.equal(serviceDescriptions.size, servicePages.length);
assert.equal((await get('/missing-page')).status, 404);
assert.equal((await get('/services/unknown')).status, 404);
assert.equal((await get('/api/missing-endpoint')).status, 404);
assert.equal((await get('/api/health')).status, 200);

const request = {
  name: 'Synthetic Smoke Test',
  email: 'smoke@example.invalid',
  phone: '614-555-0142',
  zip: '43015',
  category: 'kitchen',
  description: 'Replace the kitchen cabinets and update the lighting.',
  key: crypto.randomUUID(),
  source: 'hero',
  disclosureVersion: 'intake-v2',
};
const send = (body, origin = url.origin) => fetch(new URL('/api/estimates', url), {
  method: 'POST',
  headers: { Origin: origin, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
assert.equal((await send(request, 'https://example.invalid')).status, 403);
const invalid = await send({ ...request, zip: '123' });
assert.equal(invalid.status, 400);
assert.ok((await invalid.json()).fields.zip);
for (const phone of ['', '614-555']) {
  const invalidPhone = await send({ ...request, phone });
  assert.equal(invalidPhone.status, 400);
  assert.ok((await invalidPhone.json()).fields.phone);
}
assert.equal((await send({ ...request, description: 'A'.repeat(17000) })).status, 413);
const bot = await send({ ...request, website: 'https://example.invalid' });
assert.equal(bot.status, 202);
assert.equal((await bot.json()).reference, undefined);

const responses = await Promise.all([send(request), send(request)]);
assert.deepEqual(responses.map(response => response.status), [202, 202]);
assert.ok(responses.every(response => response.headers.get('Cache-Control') === 'no-store'));
const receipts = await Promise.all(responses.map(response => response.json()));
assert.ok(receipts[0].reference && receipts[0].preview);
assert.equal(receipts[0].reference, receipts[1].reference);
const optedIn = { ...request, key: crypto.randomUUID(), disclosureVersion: 'intake-v3', formId: 'estimate-modal-form', marketingConsentVersion: 'marketing-email-v1', marketingConsentedAt: new Date().toISOString() };
const accepted = await send(optedIn);
assert.equal(accepted.status, 202);
const receipt = await accepted.json();
const retry = await send(optedIn);
assert.equal(retry.status, 202);
assert.equal((await retry.json()).reference, receipt.reference);
assert.equal((await send({ ...optedIn, source: 'inline' })).status, 400);
assert.equal((await send({ ...request, source: 'inline', formId: 'bottom-estimate-form' })).status, 202);
const contact = { ...optedIn, key: crypto.randomUUID(), source: 'contact', formId: 'contact-form', disclosureVersion: 'intake-v4', zip: '90210', category: '' };
for (const zip of ['', '90A10']) {
  const invalidZip = await send({ ...contact, zip });
  assert.equal(invalidZip.status, 400);
  assert.ok((await invalidZip.json()).fields.zip);
}
assert.equal((await send(contact)).status, 202);
console.log('Local Worker smoke checks passed. Preview accepts test requests without storing them or sending email.');

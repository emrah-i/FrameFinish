import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { preview, site } from '../shared/content';
import { validateEstimate } from '../shared/estimates';
import type { Env } from './env';
import { sendEstimateEmails } from './notifications';

export const app = new Hono<{ Bindings: Env }>();
const unavailable = { message: 'The form is temporarily unavailable. Please email us about your project.' };
const localHost = (host: string) => ['localhost', '127.0.0.1', '[::1]'].includes(host);

app.use('*', async (context, next) => {
  const url = new URL(context.req.url);
  if (context.env.ENVIRONMENT === 'production' && site.url) {
    const canonical = new URL(site.url);
    if (url.origin !== canonical.origin && (url.hostname === canonical.hostname || url.hostname === `www.${canonical.hostname}`)) {
      canonical.pathname = url.pathname;
      canonical.search = url.search;
      return context.redirect(canonical.href, 308);
    }
  }
  await next();
  if (context.env.ENVIRONMENT !== 'production' || preview) context.header('X-Robots-Tag', 'noindex, nofollow');
  if (url.pathname.startsWith('/api/')) {
    context.header('Cache-Control', 'no-store');
    context.header('X-Content-Type-Options', 'nosniff');
  }
});

app.on('GET', ['/services/flooring', '/services/flooring/', '/services/basement-finishing', '/services/basement-finishing/'], context => {
  const target = new URL(context.req.url);
  target.pathname = '/services/basement-remodeling';
  return context.redirect(target.pathname + target.search, 301);
});

app.get('/api/health', context => context.json({ ok: true }));
app.use('/api/estimates', bodyLimit({ maxSize: 16_384, onError: context => context.json({ message: 'Your request is too large.' }, 413) }));
app.post('/api/estimates', async context => {
  const env = context.env;
  const url = new URL(context.req.url);
  const local = env.ENVIRONMENT === 'staging' && localHost(url.hostname);
  const origin = context.req.header('Origin');
  const localOrigins = new Set([url.origin, 'http://127.0.0.1:5173', 'http://localhost:5173']);
  if (!origin || (local ? !localOrigins.has(origin) : origin !== (env.SITE_URL || url.origin))) {
    return context.json({ message: 'Submit the form from the Frame & Finish website.' }, 403);
  }
  const contentType = context.req.header('Content-Type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') return context.json({ message: 'Send a JSON request.' }, 415);
  if (!local && (env.ENVIRONMENT !== 'production' || preview)) return context.json(unavailable, 503);
  if (!local && (!env.RATE_LIMITER || !env.TURNSTILE_SECRET_KEY || !site.turnstileSiteKey || !env.RESEND_API_KEY || !env.EMAIL_FROM || !env.LEAD_EMAIL)) {
    return context.json(unavailable, 503);
  }

  const ip = context.req.header('CF-Connecting-IP');
  if (env.RATE_LIMITER && ip && !(await env.RATE_LIMITER.limit({ key: `estimate:${ip}` })).success) {
    context.header('Retry-After', '60');
    return context.json({ message: 'Please wait a minute before trying again.' }, 429);
  }

  let input: unknown;
  try { input = await context.req.json(); }
  catch { return context.json({ message: 'Send a valid estimate request.' }, 400); }
  if (input && typeof input === 'object' && 'website' in input && typeof input.website === 'string' && input.website.trim()) {
    return context.json({ accepted: true, preview: local }, 202);
  }

  const result = validateEstimate(input);
  if (!result.ok) return context.json(result, 400);
  const data = result.data;
  if (!local || env.TURNSTILE_SECRET_KEY) {
    const valid = await verifyTurnstile(data.token || '', env.TURNSTILE_SECRET_KEY || '', url.hostname);
    if (!valid) return context.json({ message: 'Please complete verification again.', refreshToken: true }, 403);
  }

  if (!local) {
    const sent = await sendEstimateEmails(env, data, 'review');
    if (sent === 'changed') return context.json({ message: 'This request changed. Please submit it again.' }, 409);
    if (sent !== 'accepted') return context.json({ message: "We couldn't confirm your request. Please try again or contact us by email." }, 503);
  }
  return context.json({ accepted: true, reference: data.key, preview: local }, 202);
});

async function verifyTurnstile(token: string, secret: string, hostname: string) {
  if (!token || !secret) return false;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, idempotency_key: crypto.randomUUID() }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const result = await response.json<{ success?: boolean; action?: string; hostname?: string }>();
    return result.success === true && result.action === 'estimate' && result.hostname === hostname;
  } catch { return false; }
}

app.all('/api/*', context => context.json({ message: 'Endpoint not found.' }, 404));
app.all('*', context => context.env.ASSETS.fetch(context.req.raw));
app.onError((error, context) => {
  console.error(JSON.stringify({ event: 'request_failed', name: error.name }));
  context.header('Cache-Control', 'no-store');
  return context.json(unavailable, 503);
});

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<Env>;

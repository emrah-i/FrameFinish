import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Env } from '../src/server/env';
import { app } from '../src/server/index';
import { disclosureVersion } from '../src/shared/content';
import { estimateFormIds } from '../src/shared/estimates';

vi.mock('../src/content/site.json', async importOriginal => {
  const { default: site } = await importOriginal<{ default: typeof import('../src/content/site.json') }>();
  return { default: {
    ...site,
    url: 'https://frame.example.invalid',
    coverageProvisional: false,
    turnstileSiteKey: 'synthetic-public-key',
    serviceAreas: [{ name: 'Test area', services: ['kitchen', 'basement'] }],
  } };
});

const origin = 'https://frame.example.invalid';
const verification = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const resend = 'https://api.resend.com/emails/batch';
const estimate = {
  name: 'Test Homeowner', email: 'homeowner@example.invalid', phone: '614-555-0142',
  zip: '43015', category: 'kitchen', description: 'Replace the kitchen cabinets.',
  formId: estimateFormIds.modal, source: 'hero', disclosureVersion,
  key: '472e8c2d-74af-4791-b8ea-a2d880405e3b', token: 'synthetic-token',
};
const verified = { success: true, action: 'estimate', hostname: new URL(origin).hostname };
const limit = vi.fn<NonNullable<Env['RATE_LIMITER']>['limit']>();
const turnstile = vi.fn<typeof fetch>();
const email = vi.fn<typeof fetch>();
const env: Env = {
  ASSETS: {} as Fetcher, ENVIRONMENT: 'production', SITE_URL: origin, RATE_LIMITER: { limit },
  TURNSTILE_SECRET_KEY: 'synthetic-secret', RESEND_API_KEY: 'synthetic-resend-key',
  EMAIL_FROM: 'estimates@example.invalid', LEAD_EMAIL: 'owner@example.invalid',
};

beforeEach(() => {
  limit.mockReset().mockResolvedValue({ success: true });
  turnstile.mockReset().mockImplementation(async () => Response.json(verified));
  email.mockReset().mockImplementation(async () => Response.json({ data: [{ id: 'lead' }, { id: 'receipt' }] }));
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
    if (url === verification) return turnstile(url, init);
    if (url === resend) return email(url, init);
    throw new Error(`Unexpected provider URL: ${url}`);
  });
});
afterEach(() => vi.unstubAllGlobals());

function submit(body: unknown = estimate, headers: Record<string, string> = {}, bindings: Env = env) {
  return app.request(`${origin}/api/estimates`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }, bindings);
}

it.each<{ label: string; status: number; body: unknown; headers?: Record<string, string> }>([
  { label: 'empty origin', status: 403, body: estimate, headers: { Origin: '' } },
  { label: 'foreign origin', status: 403, body: estimate, headers: { Origin: 'https://elsewhere.example.invalid' } },
  { label: 'non-JSON content', status: 415, body: estimate, headers: { 'Content-Type': 'text/plain' } },
  { label: 'malformed JSON', status: 400, body: '{' },
  { label: 'unexpected request shape', status: 400, body: [estimate] },
  { label: 'invalid fields', status: 400, body: { ...estimate, phone: '', zip: '123' } },
  { label: 'oversized request', status: 413, body: { ...estimate, description: 'x'.repeat(17_000) } },
])('rejects $label before either provider is contacted', async ({ status, body, headers }) => {
  const response = await submit(body, headers);
  expect(response.status).toBe(status);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  expect(await response.json()).toHaveProperty('message');
  expect(turnstile).not.toHaveBeenCalled();
  expect(email).not.toHaveBeenCalled();
});

it.each(['RATE_LIMITER', 'TURNSTILE_SECRET_KEY', 'RESEND_API_KEY', 'EMAIL_FROM', 'LEAD_EMAIL'] as const)(
  'returns a contact fallback when %s is missing', async binding => {
    const response = await submit(estimate, {}, { ...env, [binding]: undefined });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ message: expect.stringMatching(/please email/i) });
    expect(turnstile).not.toHaveBeenCalled();
    expect(email).not.toHaveBeenCalled();
  },
);

it('rate limits by IP with retry guidance', async () => {
  limit.mockResolvedValueOnce({ success: false });
  const response = await submit();
  expect(response.status).toBe(429);
  expect(response.headers.get('Retry-After')).toBe('60');
  expect(limit).toHaveBeenCalledWith({ key: 'estimate:192.0.2.1' });
  expect(turnstile).not.toHaveBeenCalled();
  expect(email).not.toHaveBeenCalled();
});

it('accepts a honeypot submission without a receipt or provider calls', async () => {
  const response = await submit({ ...estimate, website: 'https://bot.example.invalid' });
  expect(response.status).toBe(202);
  expect(await response.json()).toEqual({ accepted: true, preview: false });
  expect(turnstile).not.toHaveBeenCalled();
  expect(email).not.toHaveBeenCalled();
});

it.each([
  { success: false }, { ...verified, action: 'another-form' }, { ...verified, hostname: 'elsewhere.example.invalid' },
])('requests fresh verification if Turnstile returns %j', async result => {
  turnstile.mockResolvedValueOnce(Response.json(result));
  const response = await submit();
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ refreshToken: true });
  expect(email).not.toHaveBeenCalled();
});

it('requests fresh verification if the provider is unreachable', async () => {
  turnstile.mockRejectedValueOnce(new TypeError('Synthetic network failure'));
  const response = await submit();
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ refreshToken: true });
  expect(email).not.toHaveBeenCalled();
});

it.each(['17101', '17011', '90210', '01234', '43015'])('forwards valid ZIP %s for manual review', async zip => {
  const response = await submit({ ...estimate, zip });
  expect(response.status).toBe(202);
  expect(await response.json()).toEqual({ accepted: true, preview: false, reference: estimate.key });
  expect(turnstile).toHaveBeenCalledOnce();
  const verificationRequest = JSON.parse(String(turnstile.mock.calls[0][1]?.body));
  expect(verificationRequest).toMatchObject({ secret: env.TURNSTILE_SECRET_KEY, response: estimate.token });
  expect(email).toHaveBeenCalledOnce();
  const [lead, receipt] = JSON.parse(String(email.mock.calls[0][1]?.body));
  expect(lead.text).toContain('Coverage: Manual review');
  expect(receipt.to).toEqual([estimate.email]);
});

it.each([
  { providerStatus: 409, data: { name: 'invalid_idempotent_request' }, appStatus: 409 },
  { providerStatus: 429, data: { name: 'rate_limit_exceeded' }, appStatus: 503 },
  { providerStatus: 200, data: { data: [{ id: 'lead' }] }, appStatus: 503 },
  { providerStatus: 200, data: { data: [{ id: 'lead' }, { id: '' }] }, appStatus: 503 },
])('withholds a receipt for incomplete provider acceptance ($providerStatus)', async ({ providerStatus, data, appStatus }) => {
  email.mockResolvedValueOnce(Response.json(data, { status: providerStatus }));
  const response = await submit();
  expect(response.status).toBe(appStatus);
  const result = await response.json();
  expect(result).toHaveProperty('message');
  expect(result).not.toHaveProperty('reference');
});


it('forwards basement remodeling inquiries from any valid ZIP and rejects retired flooring selections', async () => {
  const response = await submit({ ...estimate, category: 'basement', zip: '90210' });
  expect(response.status).toBe(202);
  const [lead] = JSON.parse(String(email.mock.calls[0][1]?.body));
  expect(lead.text).toContain('Basement Remodeling');
  email.mockClear();
  const retired = await submit({ ...estimate, category: 'flooring' });
  expect(retired.status).toBe(400);
  expect(await retired.json()).toMatchObject({ fields: { category: expect.any(String) } });
  expect(email).not.toHaveBeenCalled();
});

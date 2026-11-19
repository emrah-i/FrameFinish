import { afterEach, expect, it, vi } from 'vitest';
import { disclosureVersion, marketingConsentText, marketingConsentVersion } from '../src/shared/content';
import { estimateFormIds } from '../src/shared/estimates';
import { sendEstimateEmails } from '../src/server/notifications';
import type { Env } from '../src/server/env';

const env: Env = {
  ASSETS: {} as Fetcher,
  ENVIRONMENT: 'production',
  RESEND_API_KEY: 'test-key',
  EMAIL_FROM: 'estimates@example.invalid',
  LEAD_EMAIL: 'owner@example.invalid',
};
const estimate = {
  key: '472e8c2d-74af-4791-b8ea-a2d880405e3b',
  formId: estimateFormIds.modal,
  source: 'hero',
  name: 'Test Homeowner',
  email: 'homeowner@example.invalid',
  phone: '614-555-0142',
  zip: '43015',
  category: 'kitchen',
  description: 'Replace the kitchen cabinets.\nKeep the current layout.',
  disclosureVersion,
  marketingConsentVersion,
  marketingConsentedAt: '2026-11-14T17:30:00.000Z',
  token: 'private-verification-token',
} as const;

afterEach(() => vi.unstubAllGlobals());

it('sends an internal record and separate confirmation with one stable provider key', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json({ data: [{ id: 'lead' }, { id: 'receipt' }] }));
  vi.stubGlobal('fetch', fetch);
  expect(await sendEstimateEmails(env, estimate, 'review')).toBe('accepted');
  expect(await sendEstimateEmails(env, { ...estimate, token: 'another-secret' }, 'review')).toBe('accepted');
  const [url, init] = fetch.mock.calls[0];
  const [retryUrl, retry] = fetch.mock.calls[1];
  expect(url).toBe('https://api.resend.com/emails/batch');
  expect(retryUrl).toBe(url);
  expect(retry?.headers).toEqual(init?.headers);
  expect(retry?.body).toBe(init?.body);
  expect(new Headers(init?.headers).get('Idempotency-Key')).toContain(estimate.key);
  const [lead, receipt] = JSON.parse(init?.body as string);
  expect(lead.to).toEqual([env.LEAD_EMAIL]);
  expect(lead.reply_to).toBe(estimate.email);
  for (const value of [estimate.formId, estimateFormIds.hero, estimate.name, estimate.email, estimate.phone,
    estimate.zip, estimate.category, estimate.description, marketingConsentText, estimate.marketingConsentedAt]) {
    expect(lead.text).toContain(value);
  }
  expect(lead.text).not.toContain(estimate.token);
  expect(receipt.to).toEqual([estimate.email]);
  expect(receipt.text).toContain(estimate.key);
  expect(receipt.text).not.toContain(estimate.description);
});

it('distinguishes a changed request from a temporary provider failure', async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json({ name: 'invalid_idempotent_request' }, { status: 409 }))
    .mockResolvedValueOnce(Response.json({ name: 'concurrent_idempotent_requests' }, { status: 409 }))
    .mockResolvedValueOnce(Response.json({ data: [{ id: 'lead' }] }));
  vi.stubGlobal('fetch', fetch);
  expect(await sendEstimateEmails(env, estimate, 'review')).toBe('changed');
  expect(await sendEstimateEmails(env, estimate, 'review')).toBe('unavailable');
  expect(await sendEstimateEmails(env, estimate, 'review')).toBe('unavailable');
});

it('includes the contact ZIP in the internal notification', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json({ data: [{ id: 'lead' }, { id: 'receipt' }] }));
  vi.stubGlobal('fetch', fetch);
  const contact = { ...estimate, source: 'contact', formId: estimateFormIds.contact, zip: '90210', category: '' } as const;
  expect(await sendEstimateEmails(env, contact, 'review')).toBe('accepted');
  const [lead, receipt] = JSON.parse(fetch.mock.calls[0][1]?.body as string);
  expect(lead.text).toContain('ZIP code: 90210');
  expect(lead.text).not.toContain('Project type:');
  expect(receipt.text).not.toContain('90210');
});


it('includes Contact project types and omits empty quote descriptions', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json({ data: [{ id: 'lead' }, { id: 'receipt' }] }));
  vi.stubGlobal('fetch', fetch);
  await sendEstimateEmails(env, { ...estimate, formId: estimateFormIds.contact, source: 'contact', category: 'other' }, 'review');
  let [lead] = JSON.parse(fetch.mock.calls[0][1]?.body as string);
  expect(lead.text).toContain('Project type: Other [other]');
  expect(lead.text).toContain('Message:');
  await sendEstimateEmails(env, { ...estimate, formId: estimateFormIds.hero, description: '' }, 'review');
  [lead] = JSON.parse(fetch.mock.calls[1][1]?.body as string);
  expect(lead.text).not.toContain('Project description:');
});

import { expect, test as base, type Locator, type Page, type Request } from '@playwright/test';
import type { EstimateFields, EstimateRequest } from '../../src/shared/estimates';

export const estimateApi = '**/api/estimates';
export const widgetScript = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
export const homeowner = {
  name: 'Test Homeowner', email: 'homeowner@example.invalid', phone: '6145550142', zip: '43015',
  category: 'kitchen', description: 'Replace the kitchen cabinets and update the lighting.',
};
export const formattedPhone = '+1 (614) 555-0142';
export const quoteButton = /Get a FREE quote/i;
export const dialog = (page: Page) => page.getByRole('dialog', { name: quoteButton });
export const project = (form: Locator) => form.getByLabel('Project Type');
export const description = (form: Locator) => form.getByLabel('What would you like remodeled?');
export const marketing = (form: Locator) => form.getByRole('checkbox', { name: /agree to receive marketing emails/ });
export const submitQuote = (form: Locator) => form.getByRole('button', { name: quoteButton });
export const submission = (request: Request) => request.postDataJSON() as EstimateRequest;

export function watchSubmissions(page: Page) {
  const payloads: EstimateRequest[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/estimates' && request.method() === 'POST') {
      payloads.push(submission(request));
    }
  });
  return payloads;
}

export async function expectInvalid(field: Locator, guidance: RegExp) {
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(field).toHaveAccessibleDescription(guidance);
}

export const test = base.extend<{ browserChecks: void }>({
  browserChecks: [async ({ context }, use) => {
    const errors: Error[] = [];
    const watch = (page: Page) => page.on('pageerror', error => errors.push(error));
    context.on('page', watch);
    context.pages().forEach(watch);
    await context.route(widgetScript, route => route.fulfill({
      contentType: 'application/javascript',
      body: `
        let sequence = 0;
        const widgets = new Map();
        window.turnstile = {
          render(element, options) {
            if (options.sitekey !== 'synthetic-browser-key' || options.action !== 'estimate') {
              throw new Error('Unexpected Turnstile configuration');
            }
            const id = String(++sequence);
            const complete = () => {
              options.callback('synthetic-token-' + id);
              element.setAttribute('data-test-verified', '');
            };
            const controls = [];
            if (window.manualTestVerification) {
              const verify = document.createElement('button');
              verify.type = 'button';
              verify.textContent = 'Complete test verification';
              verify.addEventListener('click', complete);
              const expire = document.createElement('button');
              expire.type = 'button';
              expire.textContent = 'Expire test verification';
              expire.addEventListener('click', () => {
                element.removeAttribute('data-test-verified');
                options['expired-callback']();
              });
              element.append(verify, expire);
              controls.push(verify, expire);
            } else {
              queueMicrotask(complete);
            }
            widgets.set(id, () => {
              element.removeAttribute('data-test-verified');
              controls.forEach(control => control.remove());
            });
            return id;
          },
          remove(id) { widgets.get(id)?.(); widgets.delete(id); },
        };
      `,
    }));
    await use();
    expect(errors.map(error => error.message), 'Uncaught browser errors').toEqual([]);
  }, { auto: true }],
});

export async function fillRequest(form: Locator, overrides: Partial<EstimateFields> = {}, contact = false) {
  const values = { ...homeowner, ...overrides };
  await form.getByLabel('Full Name').fill(values.name);
  await form.getByLabel('Email Address', { exact: true }).fill(values.email);
  await form.getByLabel('Phone Number', { exact: true }).fill(values.phone);
  await form.getByLabel('ZIP Code').fill(values.zip);
  await project(form).selectOption(values.category);
  if (contact) await form.getByLabel('Message', { exact: true }).fill(values.description);
}

export async function submitToPreview(page: Page, button: Locator) {
  await expect(button.locator('xpath=ancestor::form').locator('[data-test-verified]')).toHaveCount(1);
  const [response] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === '/api/estimates' && response.request().method() === 'POST'),
    button.click(),
  ]);
  const payload = submission(response.request());
  expect(response.status()).toBe(202);
  expect(await response.json()).toEqual({ accepted: true, preview: true, reference: payload.key });
  const confirmation = page.getByRole('status').filter({ hasText: payload.key });
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText(payload.key);
  await expect(confirmation.getByRole('heading')).toBeFocused();
  return payload;
}

import { expect } from '@playwright/test';
import {
  dialog, estimateApi, expectInvalid, fillRequest, formattedPhone, homeowner, marketing, project, quoteButton,
  submitQuote, submitToPreview, test, watchSubmissions, widgetScript,
} from './fixtures';

test('maps server field errors and keeps the request reference during temporary failures', async ({ page }) => {
  const posts = watchSubmissions(page);
  const outOfArea = 'This project type is unavailable for that ZIP code.';
  const rateLimited = 'Please wait a minute before trying again.';
  const unavailable = "We couldn't confirm your request. Please try again or contact us by email.";
  const responses = [
    { status: 422, json: { message: outOfArea, fields: { zip: 'Check the project ZIP code' } } },
    { status: 429, json: { message: rateLimited }, headers: { 'Retry-After': '60' } },
    { status: 503, json: { message: unavailable } },
  ];
  await page.route(estimateApi, route => {
    const response = responses.shift();
    return response ? route.fulfill(response) : route.continue();
  });
  await page.goto('/');
  const form = page.locator('#bottom-estimate-form');
  const button = submitQuote(form);
  const alert = form.getByRole('alert');
  const zip = form.getByLabel('ZIP Code');
  await fillRequest(form, { zip: '90210' });

  await button.click();
  await expect(alert).toHaveText(outOfArea);
  await expect(zip).toBeFocused();
  await expectInvalid(zip, /check the project ZIP code/i);
  await zip.fill(homeowner.zip);

  for (const message of [rateLimited, unavailable]) {
    await button.click();
    await expect(alert).toHaveText(message);
    await expect(alert).toBeFocused();
    await expect(project(form)).toHaveValue(homeowner.category);
    await expect(marketing(form)).toHaveCount(0);
    await expect(button).toBeEnabled();
  }
  const accepted = await submitToPreview(page, button);
  expect(posts).toHaveLength(4);
  expect(posts[0].key).not.toBe(accepted.key);
  expect(posts.slice(1).map(post => post.key)).toEqual([accepted.key, accepted.key, accepted.key]);
  expect(posts.every(post => !('marketingConsentVersion' in post) && !('marketingConsentedAt' in post))).toBe(true);
  expect(accepted).not.toHaveProperty('marketingConsentedAt');
});

test('shows server validation in a tooltip without the generic banner', async ({ page }) => {
  await page.route(estimateApi, route => route.fulfill({
    status: 400,
    json: { message: 'Check the highlighted fields.', fields: { zip: 'Enter the five-digit ZIP code for your project' } },
  }));
  await page.goto('/');
  await page.locator('.hero-cta-buttons').getByRole('link', { name: quoteButton }).click();
  const quote = dialog(page);
  await fillRequest(quote);
  await submitQuote(quote).click();
  await expect(quote.getByRole('tooltip')).toHaveText('Enter the five-digit ZIP code for your project');
  await expect(quote.getByRole('alert')).toHaveCount(0);
  const zip = quote.getByLabel('ZIP Code');
  await expect(zip).toBeFocused();
  await expectInvalid(zip, /five-digit ZIP/);
});

test('recovers from a network failure and starts a fresh reference after a conflict', async ({ page }) => {
  const posts = watchSubmissions(page);
  const conflict = 'This request changed. Please submit it again.';
  await page.route(estimateApi, route => {
    if (posts.length === 1) return route.abort();
    if (posts.length === 2) return route.fulfill({ status: 409, json: { message: conflict } });
    return route.continue();
  });
  await page.goto('/contact');
  const form = page.getByRole('form', { name: 'Send a message' });
  const button = form.getByRole('button', { name: quoteButton });
  const alert = form.getByRole('alert');
  const message = form.getByLabel('Message', { exact: true });
  await fillRequest(form, {}, true);
  await button.click();
  await expect(alert).toHaveText(/couldn't confirm your request/i);
  await expect(alert).toBeFocused();
  await expect(message).toHaveValue(homeowner.description);
  await button.click();
  await expect(alert).toHaveText(conflict);
  await expect(message).toHaveValue(homeowner.description);
  const accepted = await submitToPreview(page, button);
  expect(posts).toHaveLength(3);
  expect(posts[1].key).toBe(posts[0].key);
  expect(accepted.key).not.toBe(posts[1].key);

  await page.reload();
  await expect(message).toHaveValue('');
  await expect(form.getByLabel('Full Name')).toHaveValue(homeowner.name);
  await expect(form.getByLabel('ZIP Code')).toHaveValue(homeowner.zip);
});

test('recovers from a widget load error, token expiry, and rejected verification', async ({ page }) => {
  const posts = watchSubmissions(page);
  await page.addInitScript(() => { Reflect.set(window, 'manualTestVerification', true); });
  await page.route(widgetScript, route => route.abort());
  await page.route(estimateApi, route => posts.length === 1 ? route.fulfill({
    status: 403, json: { message: 'Please complete verification again.', refreshToken: true },
  }) : route.continue());
  await page.goto('/contact');
  const form = page.getByRole('form', { name: 'Send a message' });
  const button = form.getByRole('button', { name: quoteButton });
  const alert = form.getByRole('alert');
  const retry = form.getByRole('button', { name: 'Retry verification' });
  const complete = form.getByRole('button', { name: 'Complete test verification' });
  await fillRequest(form, {}, true);
  await expect(retry).toBeVisible();
  await button.click();
  await expect(alert).toHaveText('Complete verification before sending your request.');
  await expect(alert).toBeFocused();
  expect(posts).toHaveLength(0);

  await page.unroute(widgetScript);
  await retry.click();
  await complete.click();
  await form.getByRole('button', { name: 'Expire test verification' }).click();
  await button.click();
  await expect(alert).toHaveText('Complete verification before sending your request.');
  expect(posts).toHaveLength(0);

  await complete.click();
  await button.click();
  await expect(alert).toHaveText('Please complete verification again.');
  await expect(alert).toBeFocused();
  await expect(form.getByLabel('Message', { exact: true })).toHaveValue(homeowner.description);
  await button.click();
  await expect(alert).toHaveText('Complete verification before sending your request.');
  expect(posts).toHaveLength(1);
  await complete.click();
  const accepted = await submitToPreview(page, button);
  expect(posts).toHaveLength(2);
  expect(accepted.key).toBe(posts[0].key);
  expect(accepted.token).not.toBe(posts[0].token);
});

test('avoids duplicate sends and lets the quote dialog reopen while a request is pending and after it settles', async ({ page, isMobile }) => {
  const posts = watchSubmissions(page);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route(estimateApi, async route => { await pending; await route.continue(); });
  await page.goto('/');
  const entryPoint = isMobile ? page.locator('.hero-cta-buttons') : page.getByRole('banner');
  const trigger = entryPoint.getByRole('link', { name: quoteButton }).first();
  const quote = dialog(page);
  const quoteForm = quote.getByRole('form', { name: 'Quote request' });
  const close = quote.getByRole('button', { name: 'Close quote request' });
  const sending = quote.getByRole('button', { name: 'Sending…' });
  try {
    await trigger.click();
    await fillRequest(quote);
    await submitQuote(quote).click();
    await expect(quoteForm).toHaveAttribute('aria-busy', 'true');
    await expect(sending).toBeDisabled();
    await quoteForm.evaluate((form: HTMLFormElement) => form.requestSubmit());

    await close.click();
    await expect(quote).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(sending).toBeDisabled();
    await close.click();
    await expect(quote).toBeHidden();
    expect(posts).toHaveLength(1);

    const response = page.waitForResponse(response => response.url().endsWith('/api/estimates'));
    release();
    expect((await response).status()).toBe(202);
    await expect(project(page.locator('#bottom-estimate-form'))).toHaveValue('');
    await trigger.click();
    await expect(quote.getByRole('status')).toContainText(posts[0].key);
    await quote.getByRole('button', { name: 'Done' }).click();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(quoteForm).toBeVisible();
    await expect(project(quote)).toHaveValue('');
    await expect(quote.getByLabel('Full Name')).toHaveValue(homeowner.name);
    expect(posts).toHaveLength(1);
  } finally {
    release();
  }
});

test('shares drafts across pages and tabs and keeps newer edits after a successful request', async ({ page, context }) => {
  await page.goto('/');
  const form = page.locator('#bottom-estimate-form');
  await fillRequest(form);
  await page.goto('/contact');
  await expect(page).toHaveURL(/\/contact$/);
  const contact = page.getByRole('form', { name: 'Send a message' });
  await expect(contact.getByLabel('Full Name')).toHaveValue(homeowner.name);
  await expect(contact.getByLabel('Phone Number', { exact: true })).toHaveValue(formattedPhone);
  const contactMessage = contact.getByLabel('Message', { exact: true });
  await expect(contactMessage).toHaveValue('');
  await contactMessage.fill('An unrelated question about opening hours.');
  await page.reload();
  await expect(contactMessage).toHaveValue('An unrelated question about opening hours.');
  await page.goto('/');
  await expect(project(form)).toHaveValue('kitchen');
  await expect(project(form)).toHaveValue('kitchen');

  const otherPage = await context.newPage();
  await otherPage.goto('/');
  const otherForm = otherPage.locator('#bottom-estimate-form');
  await expect(project(otherForm)).toHaveValue('kitchen');
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route(estimateApi, async route => { await pending; await route.continue(); });
  try {
    await form.getByLabel('Full Name').focus();
    await expect(form.locator('[data-test-verified]')).toHaveCount(1);
    await submitQuote(form).click();
    await expect(form.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    const updatedCategory = 'bathroom';
    await project(otherForm).selectOption(updatedCategory);
    await expect(project(form)).toHaveValue(updatedCategory);
    release();
    await expect(page.getByRole('status')).toContainText('Preview Request Accepted');
    await expect(project(otherForm)).toHaveValue(updatedCategory);
    await otherPage.reload();
    await expect(project(otherForm)).toHaveValue(updatedCategory);
    await expect(otherForm.getByLabel('Full Name')).toHaveValue(homeowner.name);
    await expect(otherForm.getByLabel('Email Address', { exact: true })).toHaveValue(homeowner.email);
    await expect(otherForm.getByLabel('ZIP Code')).toHaveValue(homeowner.zip);
  } finally {
    release();
  }
});

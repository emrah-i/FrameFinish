import { expect } from '@playwright/test';
import {
  description, dialog, expectInvalid, fillRequest, formattedPhone, homeowner, marketing, project, quoteButton,
  submitQuote, submitToPreview, test, watchSubmissions,
} from './fixtures';

test('continues the homepage hero form into a verified quote with optional consent', async ({ page }) => {
  const posts = watchSubmissions(page);
  await page.goto('/');
  const hero = page.locator('#hero-estimate-form');
  const email = hero.getByLabel('Email', { exact: true });
  const phone = hero.getByLabel('Phone', { exact: true });
  const start = submitQuote(hero);
  await expect(marketing(hero)).not.toBeChecked();
  await email.fill('invalid-email');
  await phone.fill('614555');
  await start.click();
  await expect(email).toBeFocused();
  await expectInvalid(email, /valid email/);
  await expectInvalid(phone, /valid phone/);
  await expect(dialog(page)).toBeHidden();
  expect(posts).toHaveLength(0);

  await email.fill('HOMEOWNER@example.invalid');
  await phone.clear();
  await phone.pressSequentially(homeowner.phone);
  await expect(phone).toHaveValue(formattedPhone);
  await marketing(hero).check();
  await start.click();
  const quote = dialog(page);
  await expect(quote.getByRole('heading', { name: quoteButton })).toBeFocused();
  await expect(quote.getByLabel('Email', { exact: true })).toHaveValue('HOMEOWNER@example.invalid');
  await expect(quote.getByLabel('Phone', { exact: true })).toHaveValue(formattedPhone);
  await expect(marketing(quote)).toBeChecked();
  await quote.getByLabel('Full Name').fill(homeowner.name);
  await quote.getByLabel('Project ZIP Code').fill(homeowner.zip);
  await project(quote).selectOption('kitchen');
  await description(quote).fill(homeowner.description);
  const payload = await submitToPreview(page, submitQuote(quote));
  expect(payload).toMatchObject({
    ...homeowner, phone: formattedPhone, source: 'hero', formId: 'estimate-modal-form', disclosureVersion: 'intake-v4',
    marketingConsentVersion: 'marketing-email-v1', marketingConsentedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    token: expect.stringMatching(/^synthetic-token-/),
  });
  expect(posts).toHaveLength(1);
  await quote.getByRole('button', { name: 'Done' }).click();
  await expect(quote).toBeHidden();
  await expect(start).toBeFocused();
  await expect(marketing(hero)).not.toBeChecked();
});

test('submits from the sticky form or compact mobile quote button', async ({ page, isMobile }) => {
  const posts = watchSubmissions(page);
  await page.goto('/services/flooring');
  const sticky = page.getByRole('form', { name: 'Quick quote request' });
  const compact = page.locator('.sticky-estimate').getByRole('link', { name: quoteButton });
  await expect(sticky).toBeHidden();
  await expect(compact).toBeHidden();
  await page.locator('#featured-work').scrollIntoViewIfNeeded();
  const quote = dialog(page);

  if (isMobile) {
    await expect(sticky).toBeHidden();
    await compact.tap();
    await expect(project(quote)).toHaveValue('flooring');
    await fillRequest(quote, { category: 'flooring' });
  } else {
    const first = sticky.getByLabel('First Name');
    const zip = sticky.getByLabel('ZIP Code');
    await expect(compact).toBeHidden();
    await submitQuote(sticky).click();
    await expect(first).toBeFocused();
    await expectInvalid(first, /enter your name/i);
    await expectInvalid(zip, /five-digit ZIP/);
    expect(posts).toHaveLength(0);
    await first.fill('Test');
    await sticky.getByLabel('Last Name').fill('Homeowner');
    await sticky.getByLabel('Email', { exact: true }).fill(homeowner.email);
    await sticky.getByLabel('Phone', { exact: true }).fill(homeowner.phone);
    await zip.fill(homeowner.zip);
    await expect(zip).not.toHaveAttribute('aria-invalid', 'true');
    await submitQuote(sticky).click();
    await expect(quote.getByLabel('Full Name')).toHaveValue(homeowner.name);
    await expect(quote.getByLabel('Project ZIP Code')).toHaveValue(homeowner.zip);
    await expect(quote.getByLabel('Phone', { exact: true })).toHaveValue(formattedPhone);
    await description(quote).fill(homeowner.description);
  }

  await expect(project(quote)).toHaveValue('flooring');
  const payload = await submitToPreview(page, submitQuote(quote));
  expect(payload).toMatchObject({
    ...homeowner, category: 'flooring', phone: formattedPhone, source: 'sticky', formId: 'estimate-modal-form',
  });
  expect(payload).not.toHaveProperty('marketingConsentVersion');
  expect(posts).toHaveLength(1);
});

test('validates the bottom quote and sends the service selection with opt-in cleared after an email edit', async ({ page }) => {
  const posts = watchSubmissions(page);
  await page.goto('/services/bathroom');
  const form = page.locator('#bottom-estimate-form');
  const button = submitQuote(form);
  const notes = description(form);
  await expect(project(form)).toHaveValue('bathroom');
  await project(form).selectOption('');
  await button.click();
  await expect(form.getByLabel('Full Name')).toBeFocused();
  await expect(form.getByRole('alert')).toHaveText('Check the highlighted fields.');
  await expectInvalid(project(form), /select a project type/i);
  await expectInvalid(notes, /describe your project/i);
  expect(posts).toHaveLength(0);

  const limit = 'x'.repeat(2000);
  await notes.fill(limit);
  await notes.press('End');
  await notes.press('X');
  await expect(notes).toHaveValue(limit);
  await expect(notes).toHaveAccessibleDescription(/2,000 \/ 2,000/);
  await fillRequest(form, { category: 'bathroom' });
  await marketing(form).check();
  const changedEmail = 'new-homeowner@example.invalid';
  await form.getByLabel('Email', { exact: true }).fill(changedEmail);
  await expect(marketing(form)).not.toBeChecked();

  const payload = await submitToPreview(page, button);
  expect(payload).toMatchObject({
    ...homeowner, email: changedEmail, category: 'bathroom', phone: formattedPhone, source: 'inline', formId: 'bottom-estimate-form',
  });
  expect(payload).not.toHaveProperty('marketingConsentVersion');
  expect(payload).not.toHaveProperty('marketingConsentedAt');
  expect(posts).toHaveLength(1);
});

test('validates and submits a general contact message from outside the quote area', async ({ page }) => {
  const posts = watchSubmissions(page);
  await page.goto('/contact');
  const form = page.getByRole('form', { name: 'Send a message' });
  const button = form.getByRole('button', { name: 'Send Message' });
  const zip = form.getByLabel('ZIP Code');
  const message = form.getByLabel('Message', { exact: true });
  await expect(project(form)).toHaveCount(0);
  await fillRequest(form, { description: 'Hi', zip: '90A10' }, true);
  await button.click();
  await expect(zip).toBeFocused();
  await expectInvalid(zip, /five-digit ZIP/);
  await expectInvalid(message, /10–2,000 characters/);
  expect(posts).toHaveLength(0);

  await zip.fill('90210');
  await message.fill('Could you tell me more about scheduling?');
  await marketing(form).check();
  const payload = await submitToPreview(page, button);
  expect(payload).toMatchObject({
    ...homeowner, phone: formattedPhone, category: '', zip: '90210', description: 'Could you tell me more about scheduling?',
    source: 'contact', formId: 'contact-form', marketingConsentVersion: 'marketing-email-v1',
  });
  expect(posts).toHaveLength(1);
});

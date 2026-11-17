import { expect } from '@playwright/test';
import {
  description, dialog, expectInvalid, fillRequest, formattedPhone, homeowner, marketing, project, quoteButton,
  submitQuote, submitToPreview, test, watchSubmissions,
} from './fixtures';

test('continues the homepage hero form from name and phone into a verified quote', async ({ page }) => {
  await page.clock.install();
  const posts = watchSubmissions(page);
  await page.goto('/');
  const hero = page.locator('#hero-estimate-form');
  const name = hero.getByLabel('Full Name');
  const phone = hero.getByLabel('Phone Number');
  const start = submitQuote(hero);
  await expect(hero.getByText("Tell us how to reach you, and we'll call to discuss your remodeling project.")).toBeVisible();
  await expect(marketing(hero)).toHaveCount(0);
  await expect(hero.getByLabel('Email', { exact: true })).toHaveCount(0);
  await phone.fill('614555');
  const phoneOffset = await phone.evaluate(element => element.getBoundingClientRect().top - element.closest('form')!.getBoundingClientRect().top);
  await start.click();
  await expect(name).toBeFocused();
  await expectInvalid(name, /^Enter your name \(up to 100 characters\)$/);
  await expect(hero.locator('#hero-name-error')).toHaveCSS('color', 'rgb(199, 25, 43)');
  await expect(hero.getByRole('tooltip')).toHaveCount(2);
  await expect(hero.getByRole('tooltip').first()).not.toHaveCSS('box-shadow', 'none');
  await expect(hero.getByRole('tooltip').first()).toHaveCSS('animation-name', 'none');
  await expect(hero.getByRole('tooltip').first()).toHaveCSS('position', 'absolute');
  await expect(hero.getByRole('tooltip').first()).toHaveCSS('pointer-events', 'none');
  expect(await phone.evaluate(element => element.getBoundingClientRect().top - element.closest('form')!.getBoundingClientRect().top)).toBeCloseTo(phoneOffset);
  expect((await hero.locator('#hero-name-error').boundingBox())!.y).toBeLessThan((await phone.boundingBox())!.y);
  await expectInvalid(phone, /valid phone/);
  await expect(dialog(page)).toBeHidden();
  expect(posts).toHaveLength(0);

  await page.clock.fastForward(2500);
  await expect(hero.getByRole('tooltip')).toHaveCount(0);
  await expectInvalid(name, /^Enter your name \(up to 100 characters\)$/);
  await start.click();
  await expect(hero.getByRole('tooltip')).toHaveCount(2);
  await phone.click();
  await expect(phone).toBeFocused();

  await name.fill(homeowner.name);
  await phone.clear();
  await phone.pressSequentially(homeowner.phone);
  await expect(phone).toHaveValue(formattedPhone);
  await start.click();
  const quote = dialog(page);
  await expect(quote.getByRole('heading', { name: quoteButton })).toBeFocused();
  await expect(quote.getByLabel('Full Name')).toHaveValue(homeowner.name);
  await expect(quote.getByLabel('Email', { exact: true })).toHaveValue('');
  await submitQuote(quote).click();
  await expect(quote.getByRole('tooltip').first()).toHaveCSS('position', 'absolute');
  await expect(quote.getByLabel('Email', { exact: true })).toBeFocused();
  await quote.getByLabel('Email', { exact: true }).fill(homeowner.email);
  await expect(quote.getByLabel('Phone', { exact: true })).toHaveValue(formattedPhone);
  await expect(marketing(quote)).not.toBeChecked();
  await expect(quote.getByLabel('Project ZIP Code')).toHaveAttribute('placeholder', '75201');
  await quote.getByLabel('Project ZIP Code').fill(homeowner.zip);
  await project(quote).selectOption('kitchen');
  await description(quote).fill(homeowner.description);
  const payload = await submitToPreview(page, submitQuote(quote));
  expect(payload).toMatchObject({
    ...homeowner, phone: formattedPhone, source: 'hero', formId: 'estimate-modal-form', disclosureVersion: 'intake-v4',
    token: expect.stringMatching(/^synthetic-token-/),
  });
  expect(payload).not.toHaveProperty('marketingConsentVersion');
  expect(posts).toHaveLength(1);
  await quote.getByRole('button', { name: 'Done' }).click();
  await expect(quote).toBeHidden();
  await expect(start).toBeFocused();
});

test('fades field tooltips and restarts the timer on resubmission', async ({ page }) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const form = page.locator('#bottom-estimate-form');
  const tooltip = form.locator('#bottom-estimate-name-error');
  await expect(submitQuote(form)).toBeEnabled();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const submit = () => form.evaluate(node => (node as HTMLFormElement).requestSubmit());

  await submit();
  await expect(tooltip).toHaveCSS('opacity', '1');
  await page.clock.runFor(2299);
  await expect(tooltip).not.toHaveAttribute('data-dismissing', '');
  await page.clock.runFor(1);
  await expect(tooltip).toHaveAttribute('data-dismissing', '');
  await expect(tooltip).toHaveCSS('transition-duration', '0.2s');

  await submit();
  await expect(tooltip).not.toHaveAttribute('data-dismissing', '');
  await expect(tooltip).toHaveCSS('opacity', '1');
  await page.clock.runFor(2300);
  await expect(tooltip).toHaveCSS('opacity', '0');
  await page.clock.runFor(200);
  await expect(tooltip).toBeHidden();
  await expectInvalid(form.getByLabel('Full Name'), /^Enter your name \(up to 100 characters\)$/);
});

test('submits from the desktop sticky form', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The sticky quote form is desktop-only.');
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('frame-finish.form-draft', JSON.stringify({
      version: 1,
      fields: { firstName: { value: 'Test', revision: '1' }, lastName: { value: 'Homeowner', revision: '1' } },
    }));
  });
  const posts = watchSubmissions(page);
  await page.goto('/services/flooring');
  const sticky = page.getByRole('form', { name: 'Quick quote request' });
  const compact = page.locator('.sticky-estimate').getByRole('link', { name: quoteButton });
  await expect(sticky).toBeHidden();
  await expect(compact).toBeHidden();
  await page.locator('#featured-work').scrollIntoViewIfNeeded();
  const quote = dialog(page);

  const name = sticky.getByLabel('Full Name');
  const zip = sticky.getByLabel('ZIP Code');
  await expect(name).toHaveValue(homeowner.name);
  await expect(name).toHaveAttribute('placeholder', 'Jane Smith');
  await expect(zip).toHaveAttribute('placeholder', '75201');
  await name.clear();
  await expect(compact).toBeHidden();
  await submitQuote(sticky).click();
  await expect(name).toBeFocused();
  await expectInvalid(name, /^Enter your name \(up to 100 characters\)$/);
  await expectInvalid(zip, /five-digit ZIP/);
  const tooltips = sticky.getByRole('tooltip');
  await expect(tooltips).toHaveCount(4);
  await expect(tooltips.first()).toHaveCSS('color', 'rgb(199, 25, 43)');
  await expect(tooltips.first()).toHaveCSS('background-color', 'rgb(255, 240, 235)');
  await expect(tooltips.first()).toHaveCSS('animation-name', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(tooltips.first()).toHaveCSS('animation-name', 'field-tooltip-enter');
  const bounds = await Promise.all((await tooltips.all()).map(tooltip => tooltip.boundingBox()));
  for (let index = 1; index < bounds.length; index++) {
    expect(bounds[index - 1]!.x + bounds[index - 1]!.width).toBeLessThanOrEqual(bounds[index]!.x);
  }
  expect(posts).toHaveLength(0);
  await name.fill(homeowner.name);
  await expect(sticky.locator('#sticky-name-error')).toHaveCount(0);
  await sticky.getByLabel('Email', { exact: true }).fill(homeowner.email);
  await sticky.getByLabel('Phone', { exact: true }).fill(homeowner.phone);
  await zip.fill(homeowner.zip);
  await expect(zip).not.toHaveAttribute('aria-invalid', 'true');
  await submitQuote(sticky).click();
  await expect(quote.getByLabel('Full Name')).toHaveValue(homeowner.name);
  await expect(quote.getByLabel('Project ZIP Code')).toHaveValue(homeowner.zip);
  await expect(quote.getByLabel('Phone', { exact: true })).toHaveValue(formattedPhone);
  await description(quote).fill(homeowner.description);

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
  await expect(form.getByLabel('Project ZIP Code')).toHaveAttribute('placeholder', '75201');
  const button = submitQuote(form);
  const notes = description(form);
  await expect(project(form)).toHaveValue('bathroom');
  await project(form).selectOption('');
  await button.click();
  await expect(form.getByLabel('Full Name')).toBeFocused();
  await expect(form.getByRole('alert')).toHaveCount(0);
  await expect(form.getByRole('tooltip').first()).not.toHaveCSS('box-shadow', 'none');
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
  await expect(zip).toHaveAttribute('placeholder', '75201');
  const message = form.getByLabel('Message', { exact: true });
  await expect(project(form)).toHaveCount(0);
  await fillRequest(form, { description: 'Hi', zip: '90A10' }, true);
  await button.click();
  await expect(zip).toBeFocused();
  await expectInvalid(zip, /five-digit ZIP/);
  await expectInvalid(message, /10-2,000 characters/);
  await expect(form.getByRole('tooltip')).toHaveCount(2);
  await expect(form.getByRole('alert')).toHaveCount(0);
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

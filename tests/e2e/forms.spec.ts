import { expect } from '@playwright/test';
import {
  description, dialog, expectInvalid, fillRequest, formattedPhone, homeowner, marketing, project, quoteButton,
  submitQuote, submitToPreview, test, watchSubmissions,
} from './fixtures';

test('validates and directly submits the homepage hero', async ({ page }) => {
  const posts = watchSubmissions(page);
  await page.goto('/');
  const hero = page.locator('#hero-estimate-form');
  await submitQuote(hero).click();
  await expect(hero.getByLabel('Full Name')).toBeFocused();
  await expectInvalid(hero.getByLabel('Full Name'), /Enter your name/);
  await expectInvalid(hero.getByLabel('Phone Number'), /valid phone/);
  await expectInvalid(project(hero), /Select a project type/);
  await expect(hero.getByRole('tooltip')).toHaveCount(5);
  await expect(marketing(hero)).toHaveCount(0);
  await expect(description(hero)).toHaveCount(0);
  expect(posts).toHaveLength(0);
  await fillRequest(hero);
  await expect(hero.getByLabel('Phone Number')).toHaveValue(formattedPhone);
  const payload = await submitToPreview(page, submitQuote(hero));
  expect(payload).toMatchObject({
    ...homeowner, description: '', phone: formattedPhone, source: 'hero', formId: 'hero-estimate-form',
  });
  expect(payload).not.toHaveProperty('marketingConsentVersion');
  expect(payload).not.toHaveProperty('marketingConsentedAt');
  await expect(dialog(page)).toBeHidden();
  expect(posts).toHaveLength(1);
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

test('directly submits all five fields from the desktop sticky form', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The sticky quote form is desktop-only.');
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('frame-finish.form-draft', JSON.stringify({
      version: 1,
      fields: { firstName: { value: 'Test', revision: '1' }, lastName: { value: 'Homeowner', revision: '1' } },
    }));
  });
  await page.goto('/services/flooring');
  const sticky = page.locator('#sticky-estimate-form');
  await expect(sticky).toBeHidden();
  await page.locator('#featured-work').scrollIntoViewIfNeeded();
  await expect(sticky.getByLabel('Full Name')).toHaveValue(homeowner.name);
  await expect(project(sticky)).toHaveValue('flooring');
  await submitQuote(sticky).click();
  await expectInvalid(sticky.getByLabel('Project ZIP Code'), /five-digit ZIP/);
  await fillRequest(sticky, { category: 'flooring' });
  const payload = await submitToPreview(page, submitQuote(sticky));
  expect(payload).toMatchObject({
    ...homeowner, category: 'flooring', description: '', phone: formattedPhone, source: 'sticky', formId: 'sticky-estimate-form',
  });
  expect(payload).not.toHaveProperty('marketingConsentVersion');
  await expect(dialog(page)).toBeHidden();
});

test('validates the bottom quote and submits Other without description or marketing consent', async ({ page }) => {
  await page.goto('/services/bathroom');
  const form = page.locator('#bottom-estimate-form');
  await expect(project(form)).toHaveValue('bathroom');
  await project(form).selectOption('');
  await submitQuote(form).click();
  await expectInvalid(project(form), /select a project type/i);
  await expect(description(form)).toHaveCount(0);
  await expect(marketing(form)).toHaveCount(0);
  await expect(project(form).getByRole('option', { name: 'Not sure', exact: true })).toHaveCount(0);
  await fillRequest(form, { category: 'other' });
  const payload = await submitToPreview(page, submitQuote(form));
  expect(payload).toMatchObject({ category: 'other', description: '', source: 'inline', formId: 'bottom-estimate-form' });
  expect(payload).not.toHaveProperty('marketingConsentVersion');
  expect(payload).not.toHaveProperty('marketingConsentedAt');
});

test('validates and submits a Contact message with a project type', async ({ page }) => {
  await page.goto('/contact');
  const form = page.locator('#contact-form');
  const button = form.getByRole('button', { name: quoteButton });
  await fillRequest(form, { description: 'Hi', zip: '90A10' }, true);
  await project(form).selectOption('');
  await button.click();
  await expect(form.getByLabel('Project ZIP Code')).toBeFocused();
  await expectInvalid(project(form), /select a project type/i);
  await expectInvalid(form.getByLabel('Message', { exact: true }), /10-2,000 characters/);
  await fillRequest(form, { zip: '90210', category: 'other', description: 'Could you tell me more about scheduling?' }, true);
  const payload = await submitToPreview(page, button);
  expect(payload).toMatchObject({
    category: 'other', zip: '90210', description: 'Could you tell me more about scheduling?', source: 'contact', formId: 'contact-form',
  });
  expect(payload).not.toHaveProperty('marketingConsentVersion');
});

test('restores an older Not sure draft as Other', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('frame-finish.form-draft', JSON.stringify({ version: 1, fields: { category: { value: 'unsure', revision: '1' } } }));
  });
  await page.goto('/');
  await expect(project(page.locator('#hero-estimate-form'))).toHaveValue('other');
  await expect(project(page.locator('#bottom-estimate-form'))).toHaveValue('other');
});

import { expect } from '@playwright/test';
import { description, dialog, fillRequest, project, quoteButton, submitQuote, submitToPreview, test } from './fixtures';

test('navigates between services, contact, legal pages, and the not-found recovery link', async ({ page, isMobile }) => {
  await page.goto('/');
  const header = page.getByRole('banner');
  if (isMobile) await header.getByRole('button', { name: 'Open menu' }).click();
  const nav = header.getByRole('navigation', { name: isMobile ? 'Mobile navigation' : 'Main navigation' });
  await expect(nav.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: 'Kitchen', exact: true }).click();
  await expect(page).toHaveURL(/\/services\/kitchen$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Kitchen Remodeling/);
  if (isMobile) {
    await expect(nav).toBeHidden();
    await header.getByRole('button', { name: 'Open menu' }).click();
  }
  await expect(nav.getByRole('link', { name: 'Kitchen', exact: true })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: 'Contact Us' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contact Us');

  const footer = page.getByRole('contentinfo');
  await footer.getByRole('link', { name: 'Privacy Policy' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy Policy');
  await footer.getByRole('link', { name: 'Terms and Conditions' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Terms and Conditions');
  const missing = await page.goto('/services/unknown');
  expect(missing?.status()).toBe(404);
  await page.getByRole('link', { name: 'Back to homepage' }).click();
  await expect(page).toHaveURL(new URL('/', missing!.url()).href);
  await footer.getByRole('link', { name: 'Our services' }).click();
  await expect(page).toHaveURL(/#services$/);
  await page.getByRole('link', { name: /Learn More about bathroom remodeling/i }).click();
  await expect(page).toHaveURL(/\/services\/bathroom$/);
});

test('submits header, service, and footer quotes with their entry points', async ({ page }) => {
  await page.goto('/services/kitchen');
  const quote = dialog(page);
  const submit = submitQuote(quote);
  const done = quote.getByRole('button', { name: 'Done' });
  const header = page.getByRole('banner').getByRole('link', { name: quoteButton });
  await header.click();
  await expect(project(quote)).toHaveValue('kitchen');
  await fillRequest(quote);
  expect(await submitToPreview(page, submit)).toMatchObject({ source: 'header', formId: 'estimate-modal-form', category: 'kitchen' });
  await done.click();

  await page.goto('/');
  const service = page.getByRole('link', { name: /Get a FREE quote for bathroom remodeling/i });
  await service.click();
  await expect(project(quote)).toHaveValue('bathroom');
  await quote.getByRole('button', { name: 'Close quote request' }).click();
  await expect(service).toBeFocused();

  await page.goto('/services/bathroom');
  await page.getByRole('link', { name: /Get a FREE quote for Tub-to-Shower Conversion/i }).click();
  await expect(project(quote)).toHaveValue('bathroom');
  const suggested = "I'm interested in the Tub-to-Shower Conversion package.";
  await expect(description(quote)).toHaveValue(suggested);
  expect(await submitToPreview(page, submit)).toMatchObject({
    source: 'services', formId: 'estimate-modal-form', category: 'bathroom', description: suggested,
  });
  await done.click();

  await page.goto('/services/flooring');
  await submitQuote(page.locator('#hero-estimate-form')).click();
  await expect(project(quote)).toHaveValue('flooring');
  await description(quote).fill('Replace the flooring in the living room.');
  expect(await submitToPreview(page, submit)).toMatchObject({
    source: 'services', formId: 'estimate-modal-form', category: 'flooring',
  });
  await done.click();

  const footer = page.getByRole('contentinfo').getByRole('link', { name: quoteButton });
  await footer.click();
  await fillRequest(quote, { category: 'flooring' });
  expect(await submitToPreview(page, submit)).toMatchObject({ source: 'footer', formId: 'estimate-modal-form', category: 'flooring' });
  await done.click();
  await expect(footer).toBeFocused();
});

test('opens service details, switches FAQ answers, and operates the before-and-after gallery by keyboard', async ({ page }) => {
  await page.goto('/services/bathroom');
  await page.getByRole('link', { name: 'See Our Work' }).click();
  await expect(page).toHaveURL(/#featured-work$/);
  const gallery = page.getByRole('region', { name: 'Featured Work' }).getByRole('group', { name: 'Before and after remodels' });
  const activePhoto = gallery.locator('button[tabindex="0"]');
  await expect(activePhoto).toHaveAccessibleName(/Bathroom Remodeling: Before/);
  await activePhoto.press('ArrowRight');
  await expect(activePhoto).toHaveAccessibleName(/Bathroom Remodeling: After/);
  await expect(activePhoto).toBeFocused();
  await activePhoto.press('Enter');
  const image = gallery.getByRole('dialog', { name: 'Bathroom Remodeling: After' });
  await expect(image).toBeVisible();
  await expect(image.getByRole('img')).toHaveAccessibleName(/walnut-toned vanity/i);
  await expect.poll(() => image.getByRole('img').evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(image).toBeHidden();
  await expect(activePhoto).toBeFocused();

  const faq = page.getByRole('region', { name: 'Frequently Asked Questions' });
  const [first, second] = await faq.getByRole('button').all();
  await expect(first).toHaveAttribute('aria-expanded', 'false');
  await first.press('Enter');
  await expect(first).toHaveAttribute('aria-expanded', 'true');
  const answer = page.locator('#' + await first.getAttribute('aria-controls'));
  await expect(answer).not.toHaveAttribute('inert');
  await second.click();
  await expect(second).toHaveAttribute('aria-expanded', 'true');
  await expect(first).toHaveAttribute('aria-expanded', 'false');
  await expect(answer).toHaveAttribute('inert');
  await second.click();
  await expect(second).toHaveAttribute('aria-expanded', 'false');
});

test('makes the process steps and additional preview reviews usable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'See Our Work' }).click();
  await expect(page).toHaveURL(/#why-choose-us$/);
  const process = page.getByRole('region', { name: 'How It Works' });
  const first = process.getByRole('button', { name: /Step 1/ });
  const third = process.getByRole('button', { name: /Step 3/ });
  await expect(first).toHaveAttribute('aria-current', 'step');
  await third.click();
  await expect(third).toHaveAttribute('aria-current', 'step');
  await expect(first).not.toHaveAttribute('aria-current', 'step');

  const reviews = page.getByRole('region', { name: 'What Our Customers Say' });
  const items = reviews.getByRole('listitem');
  const more = reviews.getByRole('button', { name: /Load more/ });
  await expect(items).toHaveCount(12);
  await expect(reviews.getByRole('button', { name: 'Review us on Google' })).toBeDisabled();
  await more.click();
  await expect(items).toHaveCount(16);
  await expect(items.nth(12)).toBeFocused();
  await expect(more).toBeHidden();
});

test.describe('with JavaScript disabled', () => {
  test.use({ javaScriptEnabled: false });

  test('uses the prerendered quote link and provides a contact email fallback', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('banner').getByRole('link', { name: quoteButton }).click();
    await expect(page).toHaveURL(/\/contact#estimate-contact$/);
    await expect(page.getByText(/To send a message with JavaScript disabled, please email us/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Message' })).toBeDisabled();
    await expect(page.getByRole('contentinfo').locator('a[href^="mailto:"]')).toBeVisible();
  });
});

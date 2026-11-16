import { expect, type Locator, type Page } from '@playwright/test';
import { description, dialog, fillRequest, quoteButton, submitQuote, submitToPreview, test } from './fixtures';

async function expectNoPageOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

async function expectInsideViewport(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect.poll(() => locator.evaluate(element => {
    const { left, right, top, bottom } = element.getBoundingClientRect();
    const { clientWidth, clientHeight } = document.documentElement;
    return left >= -1 && top >= -1 && right <= clientWidth + 1 && bottom <= clientHeight + 1;
  })).toBe(true);
}

test('keeps header navigation and the sticky quote usable across their breakpoints', async ({ page }) => {
  const header = page.getByRole('banner');
  const menu = header.getByRole('button', { name: 'Open menu' });
  const desktop = header.getByRole('navigation', { name: 'Main navigation' });
  const stickyForm = header.getByRole('form', { name: 'Quick quote request' });
  const compact = header.locator('.sticky-estimate-compact').getByRole('link', { name: quoteButton });

  for (const width of [768, 860, 861, 1099, 1100]) {
    await test.step(width + 'px', async () => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/services/kitchen');
      if (width <= 860) {
        await expectInsideViewport(menu);
        await expect(desktop).toBeHidden();
      } else {
        await expectInsideViewport(desktop);
        await expect(menu).toBeHidden();
      }
      await expectInsideViewport(header.getByRole('link', { name: quoteButton }));
      await expectNoPageOverflow(page);
      await page.locator('#featured-work').scrollIntoViewIfNeeded();
      if (width >= 1100) {
        await expectInsideViewport(stickyForm.getByLabel('First Name'));
        await expectInsideViewport(submitQuote(stickyForm));
        await expect(compact).toBeHidden();
      } else {
        await expectInsideViewport(compact);
        await expect(stickyForm).toBeHidden();
      }
      await expectNoPageOverflow(page);
    });
  }
});

test('restores keyboard focus across the mobile menu, desktop resize, and skip link', async ({ page }) => {
  await page.setViewportSize({ width: 860, height: 800 });
  await page.goto('/');
  const header = page.getByRole('banner');
  const open = header.getByRole('button', { name: 'Open menu' });
  const mobile = header.getByRole('navigation', { name: 'Mobile navigation' });
  const desktop = header.getByRole('navigation', { name: 'Main navigation' });
  const kitchen = mobile.getByRole('link', { name: 'Kitchen', exact: true });
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();

  await open.press('Enter');
  await expect(header.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
  await kitchen.press('Escape');
  await expect(mobile).toBeHidden();
  await expect(open).toBeFocused();

  await open.press('Enter');
  await kitchen.focus();
  await page.setViewportSize({ width: 861, height: 800 });
  await expect(mobile).toBeHidden();
  await expect(desktop.getByRole('link', { name: 'Kitchen', exact: true })).toBeFocused();
});

test('fits narrow pages and makes a quote dialog on a short phone scrollable and submittable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 570 });
  for (const path of ['/services/kitchen', '/services/bathroom', '/services/flooring', '/contact', '/privacy', '/terms', '/']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoPageOverflow(page);
  }
  await page.locator('#why-choose-us').scrollIntoViewIfNeeded();
  const header = page.getByRole('banner');
  const compact = header.locator('.sticky-estimate-compact').getByRole('link', { name: quoteButton });
  await expectInsideViewport(compact);
  await header.getByRole('button', { name: 'Open menu' }).click();
  await expect(compact).toBeHidden();
  await header.getByRole('button', { name: 'Close menu' }).click();
  await compact.click();

  const quote = dialog(page);
  await expectInsideViewport(quote);
  await expect(quote.getByRole('button', { name: 'Close quote request' })).toBeInViewport({ ratio: 0.95 });
  await expect.poll(() => quote.evaluate(element => element.scrollHeight - element.clientHeight)).toBeGreaterThan(0);
  await fillRequest(quote);
  await description(quote).scrollIntoViewIfNeeded();
  await expect(description(quote)).toBeInViewport({ ratio: 0.95 });
  await submitToPreview(page, submitQuote(quote));
  await quote.getByRole('button', { name: 'Done' }).click();
  await expectInsideViewport(compact);
});

test('advances the process only until the customer chooses a step', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/');
  const process = page.getByRole('region', { name: 'How It Works' });
  const stepTwo = process.getByRole('button', { name: /Step 2/ });
  await stepTwo.scrollIntoViewIfNeeded();
  await expect(stepTwo).toHaveAttribute('aria-current', 'step');
  const first = process.getByRole('button', { name: /Step 1/ });
  await first.click();
  await page.clock.runFor(4_200);
  await expect(first).toHaveAttribute('aria-current', 'step');
});

test('keeps the keyboard-selected gallery photo in view after a wide-to-narrow resize', async ({ page }) => {
  await page.goto('/services/bathroom');
  const featured = page.getByRole('region', { name: 'Featured Work' });
  const selected = featured.locator('button[tabindex="0"]');
  await selected.scrollIntoViewIfNeeded();
  await page.setViewportSize({ width: 390, height: 800 });
  await selected.scrollIntoViewIfNeeded();
  await selected.press('ArrowRight');
  await expect(selected).toHaveAccessibleName(/Bathroom Remodeling: After/);
  await expect(selected).toBeFocused();
  await expect(selected).toBeInViewport({ ratio: 0.95 });
});

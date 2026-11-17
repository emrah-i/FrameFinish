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

test('keeps the Dallas headline and trust grid readable across screen sizes', async ({ page }) => {
  const grid = page.locator('.hero-trust-points');
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/services/kitchen', '/services/bathroom']) {
      await page.goto(path);
      const city = page.locator('h1 .hero-city');
      await expect(city).toHaveText('Dallas');
      await expect.poll(() => city.evaluate(element => getComputedStyle(element, '::after').maskImage)).toContain('data:image/svg+xml');
      await expect.poll(() => city.evaluate(element => getComputedStyle(element, '::after').height)).toBe('11px');
      await expect(city.locator('..')).not.toHaveCSS('max-width', 'none');
      if (path === '/') {
        await expect(page.getByRole('heading', { name: 'Remodeling Since 2005' })).toBeAttached();
        const since = page.locator('#services-title .pencil-underline');
        await expect(since).toHaveText('Since 2005');
        await expect.poll(() => since.evaluate(element => getComputedStyle(element, '::after').height)).toBe('11px');
        const headline = page.locator('#hero-title');
        await expect(headline).toHaveText('Home Remodeling Experts in Dallas, TX');
        await expect(headline.locator('br')).toHaveCount(1);
      } else {
        await expect(city.locator('..').locator('br')).toHaveCount(0);
      }
      await expect(grid.getByRole('listitem')).toHaveText([
        'Licensed & Insured', 'FREE In-Home Estimates', 'Dallas-Based Team', 'Fixed-Price Proposals',
      ]);
      await expect(page.locator('.hero-google-rating + .hero-trust-points')).toBeVisible();
      if (width <= 860) {
        await expect(page.locator('.hero-google-rating')).toHaveCSS('margin-top', '8px');
        await expect(page.locator('.hero-google-rating')).toHaveCSS('flex-basis', '100%');
      }
      await expect(grid).toHaveCSS('margin-top', '16px');
      await expect(grid).toHaveCSS('row-gap', '24px');
      await expect(grid).toHaveCSS('line-height', '24px');
      await expect(grid).toHaveCSS('font-size', width === 320 ? '15px' : '16px');
      await expect(grid.locator('svg').first()).toHaveCSS('width', '24px');
      await expect.poll(() => grid.evaluate(element => {
        const aligned = Array.from(element.querySelectorAll('li')).every(item =>
          item.querySelector('svg')!.getBoundingClientRect().top === item.querySelector('span')!.getBoundingClientRect().top
        );
        const [first, second, third, fourth] = Array.from(element.children, item => item.getBoundingClientRect());
        return aligned && first.top === second.top && third.top === fourth.top && third.top > first.bottom &&
          first.left === third.left && second.left === fourth.left && second.left > first.left;
      })).toBe(true);
      await expectNoPageOverflow(page);
      await expect.poll(() => grid.evaluate((element, stacked) => {
        const copy = element.closest('.hero-copy')!.getBoundingClientRect();
        const form = document.querySelector('.hero-estimate')!.getBoundingClientRect();
        return stacked ? copy.bottom <= form.top : copy.right <= form.left;
      }, width === 320)).toBe(true);
      await page.locator('.hero-google-rating').evaluate(element => element.remove());
      await expect(grid).toHaveCSS('margin-top', '4px');
    }
  }
  await page.goto('/services/flooring');
  await expect(grid).toHaveCount(0);
  const flooringCity = page.locator('h1 .hero-city');
  await expect(flooringCity).toHaveText('Dallas');
  await expect.poll(() => flooringCity.evaluate(element => getComputedStyle(element, '::after').maskImage)).toContain('data:image/svg+xml');
});

test('smoothly scrolls See Our Work links and preserves focus and history', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const scrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options) {
      if (typeof options === 'object' && options.behavior === 'smooth') this.setAttribute('data-test-smooth-scroll', '');
      scrollIntoView.call(this, options);
    };
  });
  for (const { path, hash } of [
    { path: '/', hash: '#why-choose-us' },
    { path: '/services/kitchen', hash: '#featured-work' },
  ]) {
    await page.goto(path);
    const link = page.getByRole('link', { name: 'See Our Work' });
    if (path === '/') await link.click();
    else await link.press('Enter');
    const target = page.locator(hash);
    await expect(page).toHaveURL(new RegExp(hash + '$'));
    await expect(target).toBeFocused();
    await expect(target).toHaveAttribute('data-test-smooth-scroll', '');
    await expect.poll(() => target.evaluate(element => {
      const header = document.querySelector('.site-header')!.getBoundingClientRect();
      const top = element.getBoundingClientRect().top;
      return top >= header.bottom && top < window.innerHeight / 2;
    })).toBe(true);
    await page.goBack();
    expect(new URL(page.url()).hash).toBe('');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('link', { name: 'See Our Work' }).click();
  await expect(page).toHaveURL(/#why-choose-us$/);
  await expect(page.locator('#why-choose-us[data-test-smooth-scroll]')).toHaveCount(0);
});

test('keeps header navigation and the sticky quote usable across their breakpoints', async ({ page }) => {
  const header = page.getByRole('banner');
  const menu = header.getByRole('button', { name: 'Open menu' });
  const desktop = header.getByRole('navigation', { name: 'Main navigation' });
  const stickyForm = header.getByRole('form', { name: 'Quick quote request' });
  const compact = header.locator('.sticky-estimate-compact').getByRole('link', { name: quoteButton });
  const hours = header.locator('.contact-strip .header-hours');

  for (const width of [320, 680, 681, 768, 860, 861, 1099, 1100, 1440]) {
    await test.step(width + 'px', async () => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/services/kitchen');
      const wordmark = header.locator('.wordmark img');
      await expect(wordmark).toHaveJSProperty('naturalWidth', 1656);
      const logo = (await wordmark.boundingBox())!;
      if (width <= 860) {
        await expectInsideViewport(menu);
        await expect(desktop).toBeHidden();
        const contact = header.getByRole('link', { name: 'Call Now' });
        await expectInsideViewport(contact);
        await expectInsideViewport(contact.locator('svg[data-icon="phone"]'));
        await expect(contact).toHaveAttribute('href', '/contact');
        const action = (await contact.boundingBox())!;
        const toggle = (await menu.boundingBox())!;
        expect(logo.x + logo.width).toBeLessThan(action.x);
        expect(action.x + action.width).toBeLessThan(toggle.x);
        expect(Math.abs(action.x + action.width / 2 - (logo.x + logo.width + toggle.x) / 2)).toBeLessThan(1);
        await expect(hours).toBeHidden();
        await page.locator('#featured-work').scrollIntoViewIfNeeded();
        await expectInsideViewport(contact);
        await expect(header.locator('.header-estimate, .header-contact, .sticky-estimate').filter({ visible: true })).toHaveCount(0);
        await expectNoPageOverflow(page);
        return;
      } else {
        await expectInsideViewport(desktop);
        expect(logo.x + logo.width).toBeLessThan((await desktop.boundingBox())!.x);
        await expect(menu).toBeHidden();
      }
      await expectInsideViewport(hours);
      const hoursBounds = (await hours.boundingBox())!;
      expect(Math.abs(hoursBounds.x + hoursBounds.width / 2 - width / 2)).toBeLessThan(1);
      await expectInsideViewport(header.getByRole('link', { name: quoteButton }));
      await expectNoPageOverflow(page);
      await page.locator('#featured-work').scrollIntoViewIfNeeded();
      await expect(hours).toBeHidden();
      const stickyHours = header.locator('.header-contact .header-hours');
      await expectInsideViewport(stickyHours);
      await expect(stickyHours).toHaveText(/^Mon-Sat 9 AM-7 PM (EST|EDT)$/);
      const stickyPhone = header.locator('.header-contact .header-phone');
      await expectInsideViewport(stickyPhone);
      await expect(stickyHours).toHaveCSS('font-size', await stickyPhone.evaluate(element => getComputedStyle(element).fontSize));
      const clock = stickyHours.locator('svg[data-icon="clock"]');
      await expect(clock).toHaveCSS('width', '16px');
      await expect(clock).toHaveCSS('height', '16px');
      await expect(header.locator('.header-contact-phone')).toHaveText(/\d\s*\/$/);
      await expect(header.locator('.header-location')).toBeHidden();
      if (width >= 1100) {
        await expectInsideViewport(stickyForm.getByLabel('Full Name'));
        await expectInsideViewport(submitQuote(stickyForm));
        await expect(compact).toBeHidden();
      } else {
        await expectInsideViewport(compact);
        await expect(stickyForm).toBeHidden();
      }
      await expectNoPageOverflow(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(header.locator('.header-location')).toBeVisible();
    });
  }
});

test('restores keyboard focus across the mobile menu, desktop resize, and skip link', async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 860, height: 800 });
  await page.goto('/');
  const header = page.getByRole('banner');
  const open = header.getByRole('button', { name: 'Open menu' });
  const mobile = header.getByRole('navigation', { name: 'Mobile navigation' });
  const desktop = header.getByRole('navigation', { name: 'Main navigation' });
  const kitchen = mobile.getByRole('link', { name: 'Kitchen', exact: true });
  await expect(header.locator('#mobile-navigation')).toHaveCSS('transition-duration', '0s');
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

  await page.clock.fastForward(300);
  await open.press('Enter');
  await kitchen.focus();
  await page.setViewportSize({ width: 861, height: 800 });
  await expect(mobile).toBeHidden();
  await expect(desktop.getByRole('link', { name: 'Kitchen', exact: true })).toBeFocused();
});

test('fits narrow pages and makes a quote dialog on a short phone scrollable and submittable', async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 320, height: 570 });
  for (const path of ['/services/kitchen', '/services/bathroom', '/services/flooring', '/contact', '/privacy', '/terms', '/']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoPageOverflow(page);
  }
  const header = page.getByRole('banner');
  await header.getByRole('button', { name: 'Open menu' }).click();
  await page.clock.fastForward(300);
  await header.getByRole('button', { name: 'Close menu' }).click();
  const heroQuote = page.locator('.hero-cta-buttons').getByRole('link', { name: quoteButton });
  await heroQuote.click();

  const quote = dialog(page);
  await expectInsideViewport(quote);
  await expect(quote.getByRole('button', { name: 'Close quote request' })).toBeInViewport({ ratio: 0.95 });
  await expect.poll(() => quote.evaluate(element => element.scrollHeight - element.clientHeight)).toBeGreaterThan(0);
  await fillRequest(quote);
  await description(quote).scrollIntoViewIfNeeded();
  await expect(description(quote)).toBeInViewport({ ratio: 0.95 });
  await submitToPreview(page, submitQuote(quote));
  await quote.getByRole('button', { name: 'Done' }).click();
  await expect(heroQuote).toBeFocused();
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

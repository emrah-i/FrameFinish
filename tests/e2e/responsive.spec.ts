import { expect, type Locator, type Page } from '@playwright/test';
import { dialog, fillRequest, quoteButton, submitQuote, submitToPreview, test } from './fixtures';

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

async function expectReviewBadgeLayout(page: Page) {
  const badge = page.locator('.hero-google-rating');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveCSS('border-top-width', '0px');
  await expect(badge).toHaveCSS('border-radius', await page.locator('.hero-cta-buttons .button-secondary').evaluate(
    element => getComputedStyle(element).borderRadius));
  const logos = badge.locator('.hero-review-logo');
  await expect(logos.nth(0)).toHaveClass(/hero-review-yelp/);
  await expect(logos.nth(1)).toHaveClass(/hero-review-facebook/);
  await expect(logos.nth(2)).toHaveClass(/hero-review-google/);
  await expect(logos.nth(0)).toHaveCSS('background-color', 'rgb(211, 35, 35)');
  await expect(logos.nth(1)).toHaveCSS('background-color', 'rgb(24, 119, 242)');
  await expect(logos.nth(2)).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect.poll(() => logos.evaluateAll(elements => elements.every(element =>
    ['Top', 'Right', 'Bottom', 'Left'].every(side =>
      getComputedStyle(element).getPropertyValue(`border-${side.toLowerCase()}-width`) === '0px')
  ))).toBe(true);
  await expect.poll(() => badge.evaluate(element => {
    const badge = element.getBoundingClientRect();
    const copy = element.closest('.hero-copy')!.getBoundingClientRect();
    const subtitle = element.closest('.hero-copy')!.querySelector('p')!.getBoundingClientRect();
    const buttons = element.nextElementSibling!.getBoundingClientRect();
    const trustPoints = element.parentElement!.querySelector('.hero-trust-points')!;
    return Math.abs(badge.top - subtitle.bottom - 18) <= 1 &&
      Math.abs(buttons.top - badge.bottom - 24) <= 1 &&
      Math.abs(trustPoints.getBoundingClientRect().top - buttons.bottom - 24) <= 1 &&
      badge.right <= copy.right &&
      element.scrollWidth <= element.clientWidth;
  })).toBe(true);
}

test('keeps the Harrisburg headline and trust grid readable across screen sizes', async ({ page }) => {
  const grid = page.locator('.hero-trust-points');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/services/kitchen', '/services/bathroom', '/services/basement-remodeling']) {
      await page.goto(path);
      const city = page.locator('h1 .hero-city');
      await expect(city).toHaveText('Harrisburg');
      await expect.poll(() => city.evaluate(element => getComputedStyle(element, '::after').maskImage)).toContain('data:image/svg+xml');
      await expect.poll(() => city.evaluate(element => getComputedStyle(element, '::after').height)).toBe('11px');
      if (width < 1100) await expect(city.locator('..')).toHaveCSS('max-width', 'none');
      else await expect(city.locator('..')).not.toHaveCSS('max-width', 'none');
      if (path === '/') {
        await expect(page.getByRole('heading', { name: 'Remodeling Since 2006' })).toBeAttached();
        const since = page.locator('#services-title .pencil-underline');
        await expect(since).toHaveText('Since 2006');
        await expect.poll(() => since.evaluate(element => getComputedStyle(element, '::after').height)).toBe('11px');
        const headline = page.locator('#hero-title');
        await expect(headline).toHaveText('Home Remodeling Experts in Harrisburg, PA');
        await expect(headline.locator('br')).toHaveCount(1);
      } else {
        await expect(city.locator('..').locator('br')).toHaveCount(0);
      }
      await expect(grid.getByRole('listitem')).toHaveText([
        'Licensed & Insured', 'FREE In-Home Estimates', 'Camp Hill-Based Team', 'Fixed-Price Proposals',
      ]);
      const badge = page.locator('.hero-google-rating');
      await expect(badge).toHaveAccessibleName('Rated 4.9 out of 5 stars based on reviews on Google, Facebook, and Yelp');
      await expect(badge.locator('.hero-review-sources')).toHaveText('Reviews based on Google, Facebook & Yelp');
      await expect(badge.locator('.hero-rating-star')).toHaveCount(5);
      await expect(badge.locator('.hero-review-logo')).toHaveCount(3);
      await expect.poll(() => badge.locator('img').evaluateAll(images =>
        images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
      await expectReviewBadgeLayout(page);
      await expect(grid).toHaveCSS('margin-top', '0px');
      await expect(grid).toHaveCSS('row-gap', '24px');
      await expect(grid).toHaveCSS('line-height', '24px');
      await expect(grid).toHaveCSS('font-size', width <= 620 ? '15px' : '16px');
      await expect(grid.locator('svg').first()).toHaveCSS('width', '24px');
      await expect.poll(() => grid.evaluate(element => {
        const aligned = Array.from(element.querySelectorAll('li')).every(item =>
          item.querySelector('svg')!.getBoundingClientRect().top === item.querySelector('span')!.getBoundingClientRect().top
        );
        const [first, second, third, fourth] = Array.from(element.children, item => item.getBoundingClientRect());
        return aligned && first.top === second.top && third.top === fourth.top && third.top > first.bottom &&
          first.left === third.left && second.left === fourth.left && second.left > first.left;
      })).toBe(true);
      await expect.poll(() => page.locator('.hero-cta-buttons').evaluate(container => {
        const buttons = Array.from(container.children, button => button.getBoundingClientRect());
        const stacked = buttons[0].top !== buttons[1].top;
        if (innerWidth <= 390 && !stacked) return false;
        if (!stacked) return buttons[0].right <= buttons[1].left;
        const copy = container.closest('.hero-copy')!;
        const style = getComputedStyle(copy);
        const width = copy.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        return buttons.every(button => Math.abs(button.width - width) < 1 && Math.abs(button.left - container.getBoundingClientRect().left) < 1);
      })).toBe(true);
      await expectNoPageOverflow(page);
      if (width < 1100) await expect(page.locator('.hero-estimate')).toBeHidden();
      else await expect.poll(() => grid.evaluate(element => {
        const copy = element.closest('.hero-copy')!.getBoundingClientRect();
        const form = document.querySelector('.hero-estimate')!.getBoundingClientRect();
        return copy.right <= form.left;
      })).toBe(true);
      await page.locator('.hero-google-rating').evaluate(element => element.remove());
      await expect(page.locator('.hero-actions')).toHaveCSS('margin-top', width <= 620 ? '17px' : '24px');
      await expect(grid).toHaveCSS('margin-top', '0px');
      await expect.poll(() => grid.evaluate(element =>
        element.getBoundingClientRect().top - element.previousElementSibling!.getBoundingClientRect().bottom
      )).toBe(24);
    }
  }
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
  const contactStrip = header.locator('.contact-strip');
  const hours = contactStrip.locator('.header-hours');

  for (const width of [320, 680, 681, 768, 860, 861, 1099, 1100, 1440]) {
    await test.step(width + 'px', async () => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/services/kitchen');
      const wordmark = header.locator('.wordmark img');
      await expect(wordmark).toHaveJSProperty('naturalWidth', 1941);
      await expect(wordmark).toHaveCSS('object-position', '50% 36%');
      const logo = (await wordmark.boundingBox())!;
      const navRow = (await header.locator('.header-inner').boundingBox())!;
      expect(Math.abs(logo.y + logo.height / 2 - (navRow.y + navRow.height / 2))).toBeLessThan(0.25);
      if (width <= 860) {
        await expectInsideViewport(menu);
        await expect(desktop).toBeHidden();
        const contact = header.getByRole('link', { name: 'Call Now' });
        await expectInsideViewport(contact);
        await expect(contact).toHaveCSS('background-color', 'rgb(251, 93, 50)');
        await expect(menu).toHaveCSS('background-color', 'rgb(251, 93, 50)');
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
      await expect(contactStrip.locator('a.header-phone')).toHaveAttribute('href', 'tel:7405550142');
      await expectInsideViewport(hours);
      const hoursBounds = (await hours.boundingBox())!;
      expect(Math.abs(hoursBounds.x + hoursBounds.width / 2 - width / 2)).toBeLessThan(1);
      const stripBounds = (await contactStrip.boundingBox())!;
      expect(stripBounds.height).toBe(36);
      const stripCenter = stripBounds.y + stripBounds.height / 2;
      for (const item of [contactStrip.locator('.header-location'), hours, contactStrip.locator('.header-phone')]) {
        const { y, height } = (await item.boundingBox())!;
        expect(Math.abs(y + height / 2 - stripCenter)).toBeLessThan(0.25);
      }
      await expectInsideViewport(header.getByRole('link', { name: quoteButton }));
      await expectNoPageOverflow(page);
      await page.locator('#featured-work').scrollIntoViewIfNeeded();
      await expect(hours).toBeHidden();
      const stickyHours = header.locator('.header-contact .header-hours');
      await expectInsideViewport(stickyHours);
      await expect(stickyHours).toHaveText(/^Mon-Sat 9 AM-7 PM (EST|EDT)$/);
      const stickyPhone = header.locator('.header-contact .header-phone');
      await expectInsideViewport(stickyPhone);
      await expect(stickyPhone).toHaveAttribute('href', 'tel:7405550142');
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
        await expect(compact).toBeHidden();
        await expect(header.locator('.sticky-estimate')).toBeHidden();
        await expect.poll(() => page.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--estimate-bar-height').trim())).toBe('0px');
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
  for (const path of ['/services/kitchen', '/services/bathroom', '/services/basement-remodeling', '/contact', '/about', '/privacy', '/terms', '/']) {
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
  await fillRequest(quote);
  await submitQuote(quote).scrollIntoViewIfNeeded();
  await expect(submitQuote(quote)).toBeInViewport({ ratio: 0.95 });
  await submitToPreview(page, submitQuote(quote));
  await quote.getByRole('button', { name: 'Done' }).click();
  await expect(heroQuote).toBeFocused();
});

test('advances the process only until the customer chooses a step', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/');
  const process = page.getByRole('region', { name: 'How Our Home Remodeling Process Works' });
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


test('keeps the requested paired rows across form variants and screen sizes', async ({ page }) => {
  test.setTimeout(120000);
  for (const width of [320, 390, 700, 759, 760, 768, 800, 801, 900, 901, 1024, 1099, 1100, 1180, 1366, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/services/kitchen', '/services/bathroom', '/services/basement-remodeling', '/contact']) {
      await page.goto(path);
      const forms = path === '/contact' ? ['#contact-form'] : width < 1100 ? ['#bottom-estimate-form'] : ['#hero-estimate-form', '#bottom-estimate-form'];
      for (const selector of forms) {
        const form = page.locator(selector);
        await expect(form.getByLabel('ZIP Code', { exact: true })).toBeVisible();
        await expect(form.getByLabel('Project Type').locator('option[value=""]')).toHaveText('Select Type');
        await expect(form.locator('.form-contact-notice')).toHaveText('We’ll use the information you provide to contact you by phone or email about your inquiry.');
        await expect.poll(() => form.evaluate(form => {
          const button = form.querySelector('button[type=submit]')!.getBoundingClientRect();
          const notice = form.querySelector('.form-contact-notice')!.getBoundingClientRect();
          return notice.top >= button.bottom && notice.right <= form.getBoundingClientRect().right + 1;
        })).toBe(true);
        await expect.poll(() => form.evaluate(form => {
          const fields = form.querySelector('.dialog-fields')!.getBoundingClientRect();
          const button = form.querySelector('button[type=submit]')!.getBoundingClientRect();
          return Math.abs(fields.width - button.width) < 1 && Math.abs(fields.left - button.left) < 1;
        })).toBe(true);
        await expect.poll(() => form.locator('.dialog-field').evaluateAll(fields => {
          const [name, phone, email, zip, type] = fields.map(field => field.getBoundingClientRect());
          return name.width > phone.width && phone.top === email.top && zip.top === type.top &&
            phone.top > name.top && zip.top > phone.top && phone.right <= email.left && zip.right <= type.left;
        })).toBe(true);
      }
      await expect(page.locator('form a[href="/privacy"]')).toHaveCount(0);
      await expect(page.locator('#sticky-estimate-form .form-contact-notice')).toHaveCount(0);
      if (path === '/') {
        await expect(page.locator('#why-title')).toHaveText('Why Homeowners Choose Us');
        await expect(page.locator('#process-title')).toHaveText('How Our Home Remodeling Process Works');
      }
      if (path !== '/contact') {
        if (width < 760) expect((await page.locator('.hero h1').boundingBox())!.width).toBeCloseTo(width * .85, 1);
        const panel = page.locator('.estimate-form-panel');
        await expect(panel.locator('#estimate-section-title')).toHaveText('Bring Your Dream Home to Life with Expert Remodeling');
        await expect(panel.locator('.section-head p')).toHaveText("Tell us how to reach you, and we'll call to discuss your remodeling project.");
        await expect(page.locator('#remodel-gallery-title')).toHaveText('Why Homeowners Keep Returning');
        await expect(panel).toHaveCSS('box-shadow', 'none');
        await expect(panel.locator('h2')).toHaveCSS('font-size', await page.locator('.hero-estimate h2').evaluate(heading => getComputedStyle(heading).fontSize));
        if (width <= 900) {
          const container = (await page.locator('.estimate-section-inner').boundingBox())!;
          expect((await panel.boundingBox())!.width).toBeCloseTo(container.width, 1);
        } else {
          const expectedWidth = width >= 1367 ? 540 : width >= 1024 ? 459 : path === '/' ? 408 : ((width - width * .045 - Math.min(48, Math.max(24, width * .04))) / 2 + 20) * .85;
          expect((await panel.boundingBox())!.width).toBeCloseTo(expectedWidth, 1);
        }
        const hero = page.locator('.hero-estimate');
        const cards = width < 1100 ? [panel] : [hero, panel];
        for (const card of cards) {
          await expect(card.locator('.dialog-fields')).toHaveCSS('row-gap', '10px');
          await expect(card.locator('button[type=submit]')).toHaveCSS('margin-top', '24px');
        }
        await expect(page.locator('.estimate-section-copy #estimate-section-title')).toHaveCount(0);
        if (width < 1100) {
          await expect(hero).toBeHidden();
          await hero.getByLabel('Full Name').evaluate(input => (input as HTMLInputElement).focus());
          await expect(hero.getByLabel('Full Name')).not.toBeFocused();
          if (width <= 700) await expect(page.locator('.quote-form-hero')).toHaveCSS('min-height', '0px');
          await expect.poll(() => page.locator('.quote-form-hero').evaluate(section => {
            const copy = section.querySelector('.hero-copy')!.getBoundingClientRect();
            const style = getComputedStyle(section);
            const available = section.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
            const gutter = parseFloat(style.paddingRight);
            const expected = innerWidth > 700 ? (innerWidth - 2 * gutter) * 2 / 3 + gutter : available;
            return Math.abs(copy.width - expected) < 1;
          })).toBe(true);
        } else {
          await expect(hero).toBeVisible();
          await expect(hero).toHaveCSS('width', width <= 1366 ? '459px' : '540px');
          await expect.poll(() => page.locator('.quote-form-hero').evaluate(section =>
            section.querySelector('.hero-copy')!.getBoundingClientRect().right <= section.querySelector('.hero-estimate')!.getBoundingClientRect().left
          )).toBe(true);
        }
        if (path === '/') await expect.poll(() => page.locator('.service-grid').evaluate((grid, stacked) => {
          const cards = Array.from(grid.children, card => card.getBoundingClientRect());
          return stacked ? cards.every((card, index) => Math.abs(card.width - grid.clientWidth) < 1 && (!index || card.top >= cards[index - 1].bottom)) : cards.every(card => card.top === cards[0].top);
        }, width <= 800)).toBe(true);
        await expect.poll(() => page.locator('.estimate-section-inner').evaluate((section, stacked) => {
          const gallery = section.querySelector('.estimate-section-copy')!.getBoundingClientRect();
          const form = section.querySelector('.estimate-form-panel')!.getBoundingClientRect();
          const bounds = section.getBoundingClientRect();
          return stacked ? Math.abs(gallery.width - bounds.width) < 1 && gallery.bottom <= form.top : gallery.right <= form.left;
        }, width <= 900)).toBe(true);
      }
      await expectNoPageOverflow(page);
      if (path !== '/contact' && width === 1099) {
        const trigger = page.locator('.hero-cta-buttons').getByRole('link', { name: quoteButton });
        await trigger.click();
        await expect(dialog(page)).toBeVisible();
        await dialog(page).getByRole('button', { name: 'Close quote request' }).click();
        await expect(trigger).toBeFocused();
      }
      if (path === '/' && width >= 1100) {
        await page.locator('#process').scrollIntoViewIfNeeded();
        await expect.poll(() => page.locator('#sticky-estimate-form .dialog-field').evaluateAll(fields => {
          const boxes = fields.map(field => field.getBoundingClientRect());
          return boxes.length === 5 && boxes.every(box => box.top === boxes[0].top && box.width > 0);
        })).toBe(true);
        await expect(page.locator('#sticky-estimate-form .dialog-fields')).toHaveCSS('gap', '16px');
        await expect(page.locator('#sticky-estimate-form .estimate-form-fields')).toHaveCSS('gap', '16px');
        const fields = (await page.locator('#sticky-estimate-form .dialog-fields').boundingBox())!;
        const action = (await submitQuote(page.locator('#sticky-estimate-form')).boundingBox())!;
        expect(action.x - fields.x - fields.width).toBeCloseTo(16);
        await expect(submitQuote(page.locator('#sticky-estimate-form'))).toHaveCSS('width', '220px');
        await expect(submitQuote(page.locator('#sticky-estimate-form'))).toHaveCSS('height', '44px');
        await expect(page.locator('#sticky-name')).toHaveCSS('height', '44px');
        await expect(submitQuote(page.locator('#hero-estimate-form'))).toHaveCSS('height', '48px');
        await expect.poll(() => page.locator('.sticky-estimate').evaluate(bar =>
          Math.abs(bar.getBoundingClientRect().height - parseFloat(getComputedStyle(document.querySelector('#process')!).scrollMarginTop)))).toBeLessThan(1);
      }
    }
  }
});


test('underlines black FREE in quote headings and keeps popup buttons full width', async ({ page }) => {
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.locator('.hero-cta-buttons').getByRole('link', { name: quoteButton }).click();
    const quote = dialog(page);
    await expect(quote).toBeVisible();
    await expect(quote.locator('.form-contact-notice')).toHaveText('We’ll use the information you provide to contact you by phone or email about your inquiry.');
    const dallasMask = await page.locator('.hero-city').evaluate(element => getComputedStyle(element, '::after').maskImage);
    const marks = page.locator('.estimate-free-mark');
    await expect(marks).toHaveCount(2);
    for (const mark of await marks.all()) {
      await expect(mark).toHaveText('FREE');
      expect(await mark.evaluate(element => getComputedStyle(element, '::after').maskImage)).not.toBe(dallasMask);
      await expect(mark).toHaveCSS('color', 'rgb(23, 23, 23)');
      await expect.poll(() => mark.evaluate(element => {
        const underline = getComputedStyle(element, '::after');
        return underline.backgroundColor === 'rgb(251, 93, 50)' && underline.maskImage.includes('data:image/svg+xml');
      })).toBe(true);
    }
    await expect(submitQuote(quote)).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect.poll(() => quote.locator('form').evaluate(form => {
      const fields = form.querySelector('.dialog-fields')!.getBoundingClientRect();
      const button = form.querySelector('button[type=submit]')!.getBoundingClientRect();
      return Math.abs(fields.width - button.width) < 1 && Math.abs(fields.left - button.left) < 1;
    })).toBe(true);
    await expectNoPageOverflow(page);
  }
});


test('makes footer and banner numbers callable with animated orange banner underlines', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('contentinfo').getByRole('link', { name: '740-555-0142' })).toHaveAttribute('href', 'tel:7405550142');
  for (const selector of ['.contact-strip a.header-phone', '.header-contact a.header-phone']) {
    if (selector.includes('header-contact')) await page.locator('#process').scrollIntoViewIfNeeded();
    const phone = page.locator(selector);
    await expect(phone).toHaveAttribute('href', 'tel:7405550142');
    await expect(phone).toHaveCSS('text-decoration-line', 'none');
    const number = phone.locator('span');
    await expect(number).toHaveCSS('background-size', '0% 2px');
    await expect(number).toHaveCSS('background-image', 'linear-gradient(rgb(251, 93, 50), rgb(251, 93, 50))');
    await phone.hover();
    await expect(number).toHaveCSS('background-size', '100% 2px');
    await page.mouse.move(0, 500);
    await expect(number).toHaveCSS('background-size', '0% 2px');
    await page.keyboard.press('Tab');
    if (selector.includes('header-contact')) await page.locator('#process').scrollIntoViewIfNeeded();
    await phone.focus();
    await expect(number).toHaveCSS('background-size', '100% 2px');
    await phone.evaluate(element => (element as HTMLElement).blur());
    await expect(number).toHaveCSS('background-size', '0% 2px');
  }
});


test('fits the About image and story in columns or a stacked phone layout', async ({ page }) => {
  for (const width of [320, 390, 780, 781, 861, 1100, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/about');
    await expectNoPageOverflow(page);
    await expect(page.locator('.about-photo')).toBeVisible();
    await expect.poll(() => page.locator('.about-layout').evaluate((layout, stacked) => {
      const image = layout.querySelector('img')!.getBoundingClientRect();
      const copy = layout.querySelector('.about-copy')!.getBoundingClientRect();
      const button = layout.querySelector('.about-copy > .button')!.getBoundingClientRect();
      const aligned = Math.abs(button.right - copy.right) < 1;
      return aligned && (stacked ? image.bottom <= copy.top : image.right <= copy.left && Math.abs(image.height - copy.height) < 1 && Math.abs(image.top - copy.top) < 1);
    }, width <= 780)).toBe(true);
  }
});


test('animates About service-link underlines for hover, keyboard focus, and wrapped text', async ({ page }) => {
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/about');
    const links = page.locator('.about-copy a:not(.button)');
    await expect(links).toHaveCount(3);
    for (const link of await links.all()) {
      await expect(link).toHaveCSS('text-decoration-line', 'none');
      await expect(link).toHaveCSS('background-size', '0% 2px');
      await expect(link).toHaveCSS('background-image', 'linear-gradient(rgb(251, 93, 50), rgb(251, 93, 50))');
      await link.hover();
      await expect(link).toHaveCSS('background-size', '100% 2px');
      await page.mouse.move(0, 0);
      await expect(link).toHaveCSS('background-size', '0% 2px');
      await page.keyboard.press('Tab');
      await link.focus();
      await expect(link).toHaveCSS('background-size', '100% 2px');
      await link.evaluate(element => (element as HTMLElement).blur());
    }
    const kitchen = links.first();
    await kitchen.evaluate(element => { element.parentElement!.style.width = '100px'; });
    expect(await kitchen.evaluate(element => element.getClientRects().length)).toBeGreaterThan(1);
    await expect(kitchen).toHaveCSS('box-decoration-break', 'clone');
    await kitchen.hover();
    await expect(kitchen).toHaveCSS('background-size', '100% 2px');
  }
});


test('keeps footer email on one line and preserves sticky form padding', async ({ page }) => {
  for (const width of [320, 950, 1024, 1100, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/services/kitchen');
    const email = page.getByRole('contentinfo').locator('a[href^="mailto:"]');
    await expect(email).toHaveCSS('white-space', 'nowrap');
    expect(await email.locator('span').evaluate(element => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.getClientRects().length;
    })).toBe(1);
    await expectNoPageOverflow(page);
    if (width >= 1100) {
      await page.locator('#featured-work').scrollIntoViewIfNeeded();
      const form = page.locator('#sticky-estimate-form');
      await expect(form).toBeVisible();
      await expect(form).toHaveCSS('padding-top', '12px');
      await expect(form).toHaveCSS('padding-bottom', '16px');
      await expect.poll(() => form.evaluate(form => {
        const bounds = form.getBoundingClientRect();
        const fields = form.querySelector('fieldset')!.getBoundingClientRect();
        return Math.abs(fields.top - bounds.top - 12) + Math.abs(bounds.bottom - fields.bottom - 16);
      })).toBeLessThan(1);
    }
  }
});


test('moves focus out of the sticky banner when resizing below 1100px', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/');
  await page.locator('#process').scrollIntoViewIfNeeded();
  const sticky = page.locator('.sticky-estimate');
  await sticky.getByLabel('Full Name').focus();
  await page.setViewportSize({ width: 1099, height: 900 });
  await expect(sticky).toBeHidden();
  await expect.poll(() => page.evaluate(() => {
    const active = document.activeElement;
    return active instanceof HTMLElement && !active.closest('.sticky-estimate') && active.getClientRects().length > 0;
  })).toBe(true);
  await page.setViewportSize({ width: 1100, height: 900 });
  await expect(sticky).toBeVisible();
  await sticky.getByLabel('Full Name').focus();
  await page.setViewportSize({ width: 768, height: 900 });
  await expect(sticky).toBeHidden();
  await expect(page.locator('.site-header .wordmark')).toBeFocused();
});

test('aligns footer groups and keeps its bottom strip together on tablets', async ({ page }) => {
  await page.goto('/');
  const widths = [320, 390, 540, 541, 620, 625, 700, 759, 760, 800, 825, 830, 950, 1000, 1099, 1100, 1440];
  for (const width of [...widths, ...[...widths].reverse()]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('.footer-main h2')).toHaveText(['Service Areas', 'Explore', 'Remodeling', 'Get in Touch']);
    await expect.poll(() => page.locator('.footer-main').evaluate(footer => {
      const bounds = footer.getBoundingClientRect();
      const [brand, areas, explore, remodeling, contact] = Array.from(footer.children, child => child.getBoundingClientRect());
      const boxes = [brand, areas, explore, remodeling, contact];
      const inside = boxes.every(box => box.left >= bounds.left - 1 && box.right <= bounds.right + 1);
      const separate = boxes.every((box, index) => boxes.slice(index + 1).every(other =>
        box.right <= other.left || other.right <= box.left || box.bottom <= other.top || other.bottom <= box.top));
      if (!inside || !separate) return false;
      if (innerWidth >= 1100) return boxes.every(box => box.top === brand.top);
      if (bounds.width >= 752) return brand.top === areas.top && areas.top === explore.top &&
        contact.top > brand.top && contact.left === brand.left && contact.top === remodeling.top && remodeling.left === areas.left;
      if (bounds.width >= 568) return brand.top === areas.top && contact.top > brand.top &&
        contact.top === explore.top && explore.top === remodeling.top && contact.left === brand.left && contact.right <= explore.left && explore.right <= remodeling.left;
      return explore.top === remodeling.top && explore.right <= remodeling.left && contact.bottom <= explore.top &&
        Math.abs(contact.width - bounds.width) < 1 &&
        (bounds.width >= 496 ? brand.top === areas.top && areas.bottom <= contact.top : brand.bottom <= areas.top && areas.bottom <= contact.top);
    })).toBe(true);
    await expect(page.locator('.footer-bottom')).toHaveCSS('gap', '16px');
    await expect(page.locator('.footer-bottom > div:not(.footer-social)')).toHaveCSS('gap', '16px');
    const towns = page.locator('.footer-service-areas ul');
    await expect(towns).toHaveCSS('column-count', '2');
    await expect(towns).toHaveCSS('column-gap', '4px');
    await expect.poll(() => towns.evaluate(list =>
      new Set(Array.from(list.children, item => item.getBoundingClientRect().left)).size
    )).toBe(2);
    if (width >= 760) await expect.poll(() => page.locator('.footer-bottom').evaluate(strip => {
      const boxes = Array.from(strip.children, child => child.getBoundingClientRect());
      const bounds = strip.getBoundingClientRect();
      return Math.abs(boxes[0].left - bounds.left) < 1 && Math.abs(boxes[2].right - bounds.right) < 1 &&
        boxes.every((box, index) => Math.abs(box.top + box.height / 2 - boxes[0].top - boxes[0].height / 2) < 1 &&
          (!index || box.left - boxes[index - 1].right >= 15.5));
    })).toBe(true);
    else await expect.poll(() => page.locator('.footer-bottom').evaluate(strip => {
      const rows = new Map<number, DOMRect[]>();
      for (const child of strip.children) {
        const box = child.getBoundingClientRect();
        const center = Math.round(box.top + box.height / 2);
        rows.set(center, [...(rows.get(center) ?? []), box]);
      }
      const bounds = strip.getBoundingClientRect();
      if (innerWidth === 320 && rows.size !== 3 || innerWidth === 541 && rows.size !== 2) return false;
      const lines = Array.from(rows.values());
      return lines.every((row, index) => {
        if (index && Math.min(...row.map(box => box.top)) - Math.max(...lines[index - 1].map(box => box.bottom)) < 15.5) return false;
        if (row.some((box, index) => index && box.left - row[index - 1].right < 15.5)) return false;
        if (row.length === 1) return Math.abs((row[0].left + row[0].right) / 2 - (bounds.left + bounds.right) / 2) < 1;
        return Math.abs(Math.min(...row.map(box => box.left)) - bounds.left) < 1 &&
          Math.abs(Math.max(...row.map(box => box.right)) - bounds.right) < 1;
      });
    })).toBe(true);
    await expectNoPageOverflow(page);
  }
});

test('keeps tablet heroes proportional with content spanning two-thirds of the width', async ({ page }) => {
  for (const width of [701, 768, 800, 820, 900, 1000, 1099]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/services/kitchen', '/services/bathroom', '/services/basement-remodeling']) {
      await page.goto(path);
      await expect(page.locator('.hero-estimate')).toBeHidden();
      await expect.poll(() => page.locator('.quote-form-hero').evaluate(section => {
        const copy = section.querySelector('.hero-copy')!;
        const content = copy.getBoundingClientRect();
        const padding = parseFloat(getComputedStyle(copy).paddingLeft);
        const gutter = parseFloat(getComputedStyle(section).paddingRight);
        const expectedWidth = (innerWidth - 2 * gutter) * 2 / 3;
        return section.getBoundingClientRect().height >= content.height && Math.abs(content.width - padding - expectedWidth) < 1 &&
          ['.hero-google-rating', '.hero-cta-buttons', '.hero-trust-points'].every(selector => Math.abs(copy.querySelector(selector)!.getBoundingClientRect().width - expectedWidth) < 1);
      })).toBe(true);
      const hero = page.locator('.quote-form-hero');
      const height = (await hero.boundingBox())!.height;
      await page.setViewportSize({ width, height: 1180 });
      await expect.poll(async () => (await hero.boundingBox())!.height).toBeCloseTo(height, 1);
      await expect.poll(() => hero.locator('.hero-photo').evaluate(image =>
        Math.abs(image.getBoundingClientRect().height - image.closest('.hero')!.getBoundingClientRect().height)
      )).toBeLessThan(1);
      await page.setViewportSize({ width, height: 900 });
      await expectNoPageOverflow(page);
    }
  }
});

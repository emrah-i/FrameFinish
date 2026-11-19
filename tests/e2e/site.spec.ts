import { expect } from '@playwright/test';
import { description, dialog, fillRequest, project, quoteButton, submitQuote, submitToPreview, test } from './fixtures';

test('shows matching business hours and accessible footer social links', async ({ page, browserName, isMobile }) => {
  const hours = page.getByRole('banner').locator('.header-hours');
  const contactHours = page.getByRole('region', { name: 'Business Hours' });
  await page.clock.setFixedTime(new Date('2026-07-15T16:00:00Z'));
  await page.goto('/contact');
  await expect(hours).toHaveText('Mon-Sat 9 AM-7 PM EDT');
  await expect(contactHours.getByText('Eastern Daylight Time', { exact: true })).toBeVisible();

  await page.clock.setFixedTime(new Date('2026-01-15T16:00:00Z'));
  await page.goto('/contact');
  const header = page.getByRole('banner');
  const location = header.locator('.header-location');
  const phone = header.locator('.header-phone');
  if (isMobile) {
    await expect(location).toBeHidden();
    await expect(phone).toBeHidden();
    await expect(header.locator('.mobile-call-action')).toHaveAttribute('href', '/contact');
  } else {
    await expect(location).toBeVisible();
    await expect(location).toHaveText('Dallas, TX');
    await expect(phone).toBeVisible();
  }
  await expect(hours).toHaveText('Mon-Sat 9 AM-7 PM EST');
  await expect(contactHours.getByRole('term')).toHaveText(['Monday-Saturday']);
  await expect(contactHours.getByRole('definition')).toHaveText(['9 AM-7 PM']);
  await expect(contactHours.getByText('Eastern Standard Time', { exact: true })).toBeVisible();

  const footer = page.getByRole('contentinfo');
  await expect(footer.locator('.footer-social')).toHaveCSS('column-gap', '2px');
  for (const icon of await footer.locator('svg').all()) {
    await expect(icon).toHaveCSS('width', '16px');
    await expect(icon).toHaveCSS('height', '16px');
  }
  const contact = page.getByRole('region', { name: 'Contact Information' });
  for (const section of [contact, footer]) {
    const address = section.locator('.contact-links > span').filter({ hasText: 'Dallas, TX' });
    await expect(address).toHaveText('Dallas, TX');
    await expect(address.locator('svg[data-icon="location-dot"]')).toBeVisible();
  }
  const terms = footer.getByRole('link', { name: 'Terms and Conditions' });
  const footerColor = await terms.evaluate(link => getComputedStyle(link).color);
  const orange = await hours.locator('svg').evaluate(icon => getComputedStyle(icon).color);
  const profiles = [
    ['Facebook', 'https://www.facebook.com/'],
    ['Instagram', 'https://www.instagram.com/'],
    ['LinkedIn', 'https://www.linkedin.com/'],
  ];
  for (const [name, href] of profiles) {
    const link = footer.getByRole('link', { name });
    await expect(link).toHaveAttribute('href', href);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener');
    await expect(link).toHaveCSS('width', '32px');
    await expect(link).toHaveCSS('height', '44px');
    await expect(link).toHaveCSS('color', footerColor);
    if (!isMobile) {
      await link.hover();
      await expect(link).toHaveCSS('color', orange);
    }
  }
  await terms.focus();
  // WebKit's default keyboard navigation uses Option+Tab to reach links.
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  const facebook = footer.getByRole('link', { name: 'Facebook' });
  await expect(facebook).toBeFocused();
  await expect(facebook).toHaveCSS('color', orange);
  if (!isMobile) {
    for (const [name, href] of profiles) {
      await page.context().route(href, route => route.fulfill({ body: name, contentType: 'text/plain' }));
      const [tab] = await Promise.all([page.waitForEvent('popup'), footer.getByRole('link', { name }).click()]);
      await expect(tab).toHaveURL(href);
      await tab.close();
    }
  }
});

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

test('mobile menu stays in sync during rapid taps and after scrolling', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Uses the mobile touchscreen.');
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const header = page.getByRole('banner');
  const toggle = header.locator('.menu-toggle');
  const menu = header.locator('#mobile-navigation');
  const contact = header.locator('.mobile-call-action');
  await expect(contact).toHaveText('Call Now');
  await expect(contact).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(contact.locator('svg[data-icon="phone"]')).toBeVisible();
  await expect(contact).toHaveAttribute('href', '/contact');
  await expect(toggle).toHaveCSS('background-color', await contact.evaluate(element => getComputedStyle(element).backgroundColor));
  await expect(toggle).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(toggle).toHaveCSS('border-top-width', '0px');
  await expect(menu).toHaveCSS('transition-property', 'opacity, transform, visibility');
  const bounds = (await toggle.boundingBox())!;
  const tap = () => page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  const logo = (await header.locator('.wordmark').boundingBox())!;
  const action = (await contact.boundingBox())!;
  expect(Math.abs(action.x + action.width / 2 - (logo.x + logo.width + bounds.x) / 2)).toBeLessThan(1);

  await tap();
  await tap();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.clock.fastForward(300);
  await tap();
  await tap();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toHaveAttribute('inert', '');
  await expect(menu).toBeHidden();
  await page.clock.fastForward(300);
  await tap();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toHaveCSS('opacity', '1');
  await expect(menu).not.toHaveAttribute('inert', '');
  const menuWidth = (await menu.boundingBox())!.width;
  for (const link of await menu.getByRole('link').all()) {
    expect((await link.boundingBox())!.width).toBeCloseTo(menuWidth);
  }
  const activeLabel = menu.locator('[aria-current="page"] > span');
  expect(await activeLabel.evaluate(label => {
    const underline = getComputedStyle(label, '::after');
    return underline.transform === 'matrix(1, 0, 0, 1, 0, 0)' &&
      Math.abs(parseFloat(underline.width) - label.getBoundingClientRect().width) < 1 &&
      label.getBoundingClientRect().width < label.parentElement!.getBoundingClientRect().width;
  })).toBe(true);
  const kitchen = (await menu.getByRole('link', { name: 'Kitchen' }).boundingBox())!;
  await page.touchscreen.tap(kitchen.x + kitchen.width - 8, kitchen.y + kitchen.height / 2);
  await expect(page).toHaveURL(/\/services\/kitchen$/);
  await expect(menu).toBeHidden();
  await page.getByRole('link', { name: 'See Our Work' }).tap();
  await expect(page).toHaveURL(/#featured-work$/);
  await expect(contact).toBeInViewport();
  await expect(toggle).toBeInViewport();
  await expect(header.locator('.sticky-estimate')).toBeHidden();
  await expect.poll(() => page.locator('#featured-work').evaluate(section =>
    section.getBoundingClientRect().top >= document.querySelector('.site-header')!.getBoundingClientRect().bottom
  )).toBe(true);
  await contact.tap();
  await expect(page).toHaveURL(/\/contact$/);
});

test('submits header, service, and footer quotes with their entry points', async ({ page, isMobile }) => {
  await page.goto('/services/kitchen');
  const quote = dialog(page);
  const submit = submitQuote(quote);
  const done = quote.getByRole('button', { name: 'Done' });
  const header = page.getByRole('banner').getByRole('link', { name: quoteButton });
  if (isMobile) {
    await expect(header).toHaveCount(0);
  } else {
    await header.click();
    await expect(project(quote)).toHaveValue('kitchen');
    await fillRequest(quote);
    expect(await submitToPreview(page, submit)).toMatchObject({ source: 'header', formId: 'estimate-modal-form', category: 'kitchen' });
    await done.click();
  }

  await page.goto('/');
  const service = page.getByRole('link', { name: /Get a FREE quote for bathroom remodeling/i });
  await service.click();
  await expect(project(quote)).toHaveValue('bathroom');
  await quote.getByRole('button', { name: 'Close quote request' }).click();
  await expect(service).toBeFocused();

  await page.goto('/services/bathroom');
  await page.getByRole('link', { name: /Get a FREE quote for Tub-to-Shower Conversion/i }).click();
  await expect(project(quote)).toHaveValue('bathroom');
  await expect(description(quote)).toHaveCount(0);
  if (isMobile) await fillRequest(quote, { category: 'bathroom' });
  expect(await submitToPreview(page, submit)).toMatchObject({
    source: 'services', formId: 'estimate-modal-form', category: 'bathroom', description: '',
  });
  await done.click();

  await page.goto('/services/flooring');
  const hero = page.locator('#hero-estimate-form');
  await expect(project(hero)).toHaveValue('flooring');
  await hero.getByLabel('Full Name').focus();
  expect(await submitToPreview(page, submitQuote(hero))).toMatchObject({
    source: 'services', formId: 'hero-estimate-form', category: 'flooring', description: '',
  });

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
  const process = page.getByRole('region', { name: 'How Our Home Remodeling Process Works' });
  const first = process.getByRole('button', { name: /Step 1/ });
  const third = process.getByRole('button', { name: /Step 3/ });
  await expect(first).toHaveAttribute('aria-current', 'step');
  await third.click();
  await expect(third).toHaveAttribute('aria-current', 'step');
  await expect(first).not.toHaveAttribute('aria-current', 'step');

  const reviews = page.getByRole('region', { name: 'What Homeowners Say About Our Services' });
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

  test('uses the prerendered quote link and provides a contact email fallback', async ({ page, isMobile }) => {
    await page.goto('/');
    const entryPoint = isMobile ? page.locator('.hero-cta-buttons') : page.getByRole('banner');
    await entryPoint.getByRole('link', { name: quoteButton }).click();
    await expect(page).toHaveURL(/\/contact#estimate-contact$/);
    await expect(page.getByText(/To send a message with JavaScript disabled, please email us/)).toBeVisible();
    await expect(page.getByRole('button', { name: quoteButton })).toBeDisabled();
    await expect(page.getByRole('contentinfo').locator('a[href^="mailto:"]')).toBeVisible();
  });
});


test('keeps contact authorization in both policies and removes notices from every form', async ({ page }) => {
  for (const path of ['/privacy', '/terms']) {
    await page.goto(path);
    await expect(page.getByRole('main')).toContainText('By submitting any form on this website, you authorize Frame & Finish Remodeling to contact you by email or phone about your inquiry.');
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Privacy Policy' })).toBeVisible();
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Terms and Conditions' })).toBeVisible();
  }
  await page.goto('/');
  await page.locator('.hero-cta-buttons').getByRole('link', { name: quoteButton }).click();
  await expect(dialog(page)).toBeVisible();
  await expect(page.locator('form').filter({ hasText: 'By submitting this form' })).toHaveCount(0);
  await expect(page.locator('form a[href="/privacy"]')).toHaveCount(0);
});


test('links Explore to the homepage sections in order', async ({ page }) => {
  const labels = ['Our Services', 'Why Choose Us', 'Our Process', 'Reviews'];
  const anchors = ['services', 'why-choose-us', 'process', 'customer-reviews'];
  for (let index = 0; index < labels.length; index++) {
    await page.goto('/services/kitchen');
    const explore = page.getByRole('contentinfo').getByRole('heading', { name: 'Explore' }).locator('..');
    await expect(explore.getByRole('link')).toHaveText(labels);
    await explore.getByRole('link', { name: labels[index], exact: true }).click();
    await expect(page).toHaveURL(new RegExp('/#' + anchors[index] + '$'));
    const section = page.locator('#' + anchors[index]);
    await expect(section).toBeInViewport();
    await expect.poll(() => section.evaluate(element => {
      const sticky = document.querySelector('.sticky-estimate:not([hidden])');
      const bottom = sticky?.getBoundingClientRect().bottom ?? document.querySelector('.site-header')!.getBoundingClientRect().bottom;
      return element.getBoundingClientRect().top >= bottom - 1;
    })).toBe(true);
  }
});


test('uses the Dallas homepage title and provides project-specific timeline FAQs', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Home Remodeling in Dallas, Texas | Frame and Finish Home Remodeling');
  await expect(page.locator('#hero-title')).toHaveText('Home Remodeling Experts in Dallas, TX');
  for (const [service, question] of [
    ['kitchen', 'How long does a kitchen remodel take?'],
    ['bathroom', 'How long does a bathroom remodel take?'],
    ['flooring', 'How long does flooring installation take?'],
  ]) {
    await page.goto('/services/' + service);
    const faq = page.getByRole('region', { name: 'Frequently Asked Questions' });
    const button = faq.getByRole('button', { name: question, exact: true });
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    const panel = page.locator('#' + await button.getAttribute('aria-controls'));
    await expect(panel).not.toHaveAttribute('inert', '');
    await expect(panel).toContainText('We confirm your project timeline after reviewing the scope.');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).toHaveAttribute('inert', '');
  }
});


test('opens About before Contact in navigation and links its story to services and contact', async ({ page, isMobile }) => {
  await page.goto('/');
  const header = page.getByRole('banner');
  if (isMobile) await header.getByRole('button', { name: 'Open menu' }).click();
  const nav = header.getByRole('navigation', { name: isMobile ? 'Mobile navigation' : 'Main navigation' });
  await expect(nav.getByRole('link')).toHaveText(['Home', 'Kitchen', 'Bathroom', 'Flooring', 'About Us', 'Contact Us']);
  await nav.getByRole('link', { name: 'About Us', exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page).toHaveTitle('About Us | Frame & Finish Home Remodeling');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('About Us');
  if (isMobile) await header.getByRole('button', { name: 'Open menu' }).click();
  await expect(nav.getByRole('link', { name: 'About Us', exact: true })).toHaveAttribute('aria-current', 'page');
  if (isMobile) await header.getByRole('button', { name: 'Close menu' }).click();
  const main = page.getByRole('main');
  await expect(main.locator('.hero')).toHaveCount(0);
  await expect(main.getByRole('heading', { level: 2 })).toHaveText(['Our Story', 'Our Mission']);
  await expect(main).toContainText("For over 20 years, we've helped homeowners throughout Dallas, Texas, and surrounding communities");
  await expect(main.locator('.about-copy strong')).toHaveText(['Adam Blackwood', '2006', 'Dallas, Texas', 'kitchen remodeling', 'bathroom remodeling', 'flooring', 'Better Homes, Better Living']);
  await expect(main).toContainText("My name is Adam Blackwood, and I'm proud to carry on the foundation my father established in 2006.");
  await expect(main).not.toContainText('—');
  await expect(main.getByRole('img')).toHaveAccessibleName('Walnut kitchen island with cream cabinetry and bronze pendant lights');
  for (const [label, service] of [['kitchen remodeling', 'kitchen'], ['bathroom remodeling', 'bathroom'], ['flooring', 'flooring']]) {
    await main.getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp('/services/' + service + '$'));
    await page.goto('/about');
  }
  const connect = main.getByRole('link', { name: 'Connect With Us' });
  await connect.hover();
  await expect(connect).toHaveCSS('box-shadow', 'rgba(255, 96, 38, 0.5) 0px 0px 22px 0px');
  await connect.click();
  await expect(page).toHaveURL(/\/contact$/);
});

import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { site } from '../shared/content';
import { findServiceRoute, serviceRoutes } from '../shared/service-routes';
import { EstimateTrigger } from './estimate/Estimate';
import { StickyEstimate } from './estimate/StickyEstimate';
import { Icon } from './Icon';

const navigation = [
  { label: 'Home', href: '/' },
  ...serviceRoutes.map(service => ({ label: service.navLabel, href: service.href })),
  { label: 'Contact Us', href: '/contact' },
];

const footerNavigation = [
  { label: 'Our services', href: '/#services' },
  { label: 'How it works', href: '/#process' },
];

const locations = site.serviceAreas.flatMap(area => area.locations ?? [{ city: area.name, state: undefined }]);
const primaryArea = site.serviceAreas[0];
const companyPhone = site.phone || (site.phonePlaceholder ? '740-555-0142' : '');

export function ServiceAreaList() {
  return <ul role="list"><For each={locations}>{location =>
    <li>{location.city}{location.state && `, ${location.state}`}</li>
  }</For></ul>;
}

function Wordmark() {
  return <a class="wordmark" href="/" aria-label={site.businessName + ' home'}>
    <img src="/images/frame-finish-logo-white.png" width={2172} height={724} alt="" />
  </a>;
}

function CompanyPhone(props: { class?: string }) {
  return <Show when={site.phone && !site.phonePlaceholder} fallback={<Show when={site.phonePlaceholder}>
    <span class={props.class}><Icon name="phone" size={18} /><span>{companyPhone}</span></span>
  </Show>}>
    <a class={props.class} href={`tel:${site.phone.replace(/[^+\d]/g, '')}`}><Icon name="phone" size={18} /><span>{site.phone}</span></a>
  </Show>;
}

function HeaderLocation() {
  return <Show when={primaryArea}>
    <span class="header-location"><Icon name="pin" size={15} /><span>{primaryArea.shortName || primaryArea.name}</span></span>
  </Show>;
}

export function ContactLinks(props: { details?: boolean }) {
  return <div class="contact-links">
    <CompanyPhone />
    <Show when={site.email}>
      <Show when={props.details} fallback={<a href={`mailto:${site.email}`}><Icon name="mail" size={18} /><span>{site.email}</span></a>}>
        <span><Icon name="mail" size={18} />{site.email}</span>
      </Show>
    </Show>
    <span><Icon name="pin" size={18} />{site.address || '123 Example Street, Delaware, OH'}</span>
  </div>;
}

export function Header(props: { path: string }) {
  const [menu, setMenu] = createSignal(false);
  const [pastHero, setPastHero] = createSignal(false);
  const category = () => findServiceRoute(props.path)?.id;
  const hasQuoteHero = () => props.path === '/' || !!category();
  let header!: HTMLElement;
  let contactStrip!: HTMLDivElement;
  let navRow!: HTMLDivElement;
  let menuButton!: HTMLButtonElement;

  onMount(() => {
    const desktop = window.matchMedia('(min-width: 861px)');
    const resetMobileMenu = () => {
      if (!desktop.matches || !menu()) return;
      const focused = document.activeElement?.closest<HTMLAnchorElement>('.mobile-nav a');
      setMenu(false);
      if (focused) {
        Array.from(header.querySelectorAll<HTMLAnchorElement>('.desktop-nav a'))
          .find(link => link.href === focused.href)?.focus({ preventScroll: true });
      }
    };
    desktop.addEventListener('change', resetMobileMenu);
    onCleanup(() => desktop.removeEventListener('change', resetMobileMenu));
  });

  onMount(() => {
    if (!hasQuoteHero()) return;
    const hero = document.querySelector<HTMLElement>('main .quote-form-hero');
    if (!hero) return;
    let frame: number | undefined;
    const update = () => {
      frame = undefined;
      const expandedBottom = navRow.getBoundingClientRect().bottom + (pastHero() ? contactStrip.offsetHeight : 0);
      const next = hero.getBoundingClientRect().bottom <= expandedBottom + 72;
      if (next === pastHero()) return;
      const focused = document.activeElement;
      setPastHero(next);
      if (next && focused?.closest('.header-estimate')) {
        const stickyActions = header.querySelectorAll<HTMLElement>('.sticky-estimate-form button[type="submit"], .sticky-estimate-compact a');
        const target = menu() ? menuButton : Array.from(stickyActions).find(action => action.getClientRects().length);
        target?.focus({ preventScroll: true });
      } else if (!next && focused?.closest('.sticky-estimate')) {
        header.querySelector<HTMLElement>('.header-estimate')?.focus({ preventScroll: true });
      } else if (focused?.matches('a.header-phone')) {
        const selector = next ? '.header-actions a.header-phone' : '.contact-strip a.header-phone';
        header.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
      }
    };
    const scheduleUpdate = () => { frame ??= requestAnimationFrame(update); };
    const resize = new ResizeObserver(scheduleUpdate);
    resize.observe(hero);
    resize.observe(contactStrip);
    resize.observe(navRow);
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('pageshow', scheduleUpdate);
    update();
    onCleanup(() => {
      resize.disconnect();
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('pageshow', scheduleUpdate);
      if (frame !== undefined) cancelAnimationFrame(frame);
    });
  });

  return <header ref={header} class="site-header" data-past-hero={pastHero() ? '' : undefined} onKeyDown={event => {
    if (event.key === 'Escape' && menu()) { setMenu(false); menuButton.focus({ preventScroll: true }); }
  }}>
    <div ref={contactStrip} class="contact-strip">
      <div class="shell contact-strip-inner">
        <HeaderLocation />
        <CompanyPhone class="header-phone" />
      </div>
    </div>
    <div ref={navRow} class="shell header-inner">
      <Wordmark />
      <nav aria-label="Main navigation" class="desktop-nav">
        <For each={navigation}>{item => <a class="navigation-link" href={item.href} aria-current={props.path === item.href ? 'page' : undefined}>{item.label}</a>}</For>
      </nav>
      <div class="header-actions">
        <EstimateTrigger source="header" class="button button-primary header-estimate" prefill={() => {
          const serviceCategory = category();
          return serviceCategory ? { category: serviceCategory } : {};
        }} onOpen={() => setMenu(false)} />
        <Show when={pastHero()}>
          <div class="header-contact">
            <HeaderLocation />
            <Show when={primaryArea && companyPhone}><span class="header-contact-divider" aria-hidden="true">/</span></Show>
            <CompanyPhone class="header-phone" />
          </div>
        </Show>
        <button ref={menuButton} class="menu-toggle rounded" type="button" aria-label={menu() ? 'Close menu' : 'Open menu'} aria-expanded={menu()} aria-controls="mobile-navigation" onClick={() => setMenu(!menu())}><Icon name={menu() ? 'close' : 'menu'} /></button>
      </div>
    </div>
    <nav id="mobile-navigation" class="mobile-nav shell" aria-label="Mobile navigation" hidden={!menu()}>
      <For each={navigation}>{item => <a class="navigation-link" href={item.href} aria-current={props.path === item.href ? 'page' : undefined} onClick={() => setMenu(false)}>{item.label}</a>}</For>
    </nav>
    <Show when={hasQuoteHero()}><StickyEstimate visible={pastHero()} category={category()} /></Show>
  </header>;
}

export function Footer() {
  return <footer class="site-footer">
    <div class="shell" data-reveal-group="" data-reveal-children="">
      <div class="footer-main">
        <div class="footer-brand"><Wordmark /><p>Better Homes, Better Living</p><EstimateTrigger source="footer" class="button button-primary" /></div>
        <div><h2>Explore</h2><ul><For each={footerNavigation}>{item => <li><a href={item.href}>{item.label}</a></li>}</For><li><a href="/contact">Contact</a></li></ul></div>
        <div><h2>Remodeling</h2><ul><For each={serviceRoutes}>{item => <li><a href={item.href}>{item.navLabel}</a></li>}</For></ul></div>
        <div><h2>Service Areas</h2><ServiceAreaList /></div>
        <div><h2>Get in Touch</h2><ContactLinks /></div>
      </div>
      <div class="footer-bottom">
        <span>© {new Date().getUTCFullYear()} {site.legalName || site.businessName}</span>
        <div><a href="/privacy">Privacy Policy</a><a href="/terms">Terms and Conditions</a></div>
      </div>
    </div>
  </footer>;
}

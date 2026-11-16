import { generateHydrationScript, renderToString } from 'solid-js/web';
import App from './App';
import { preview, site } from './shared/content';
import { pages } from './shared/pages';
import { findServiceRoute } from './shared/service-routes';

export { pages };

export function renderPage(path: keyof typeof pages) {
  const [title, description] = pages[path];
  const canonical = site.url ? new URL(path, site.url).href : '';
  const organization = !preview && path === '/' ? {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.businessName,
    legalName: site.legalName || undefined,
    url: site.url,
    email: site.email || undefined,
    telephone: site.phone || undefined,
  } : undefined;
  return {
    html: renderToString(() => <App path={path} />),
    hydration: generateHydrationScript(),
    title,
    description,
    canonical,
    noindex: preview || path === '/404',
    image: site.url ? new URL(`/images/${findServiceRoute(path)?.photo.id ?? 'kitchen'}.webp`, site.url).href : '',
    organization,
  };
}

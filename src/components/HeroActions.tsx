import { For, Show } from 'solid-js';
import { EstimateTrigger } from './estimate/Estimate';
import HeroGoogleRating from './HeroGoogleRating';
import type { ServiceRoute } from '../shared/service-routes';

const trustPoints = [
  { label: 'Licensed & Insured', path: 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z M9 12l2 2 4-4' },
  { label: 'FREE In-Home Estimates', path: 'M4 5h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z M8 3v4m8-4v4M3 10h18m-12 5 2 2 4-4' },
  { label: 'Dallas-Based Team', path: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Zm6 11v-8h6v8' },
  { label: 'Fixed-Price Proposals', path: 'M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z M14 2v5h5m-11 8 2 2 4-4' },
];

export default function HeroActions(props: { workHref: string; category?: ServiceRoute['id'] }) {
  function scrollToWork(event: MouseEvent) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const target = document.getElementById(props.workHref.slice(1));
    if (!target) return;

    event.preventDefault();
    if (location.hash !== props.workHref) history.pushState(null, '', props.workHref);
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: 'smooth' });
  }

  return <div class="hero-actions">
    <div class="hero-cta-buttons">
      <EstimateTrigger source={props.category ? 'services' : 'hero'} class="button button-primary"
        prefill={() => props.category ? { category: props.category } : {}} />
      <a class="button button-secondary rounded" href={props.workHref} onClick={scrollToWork}>See Our Work</a>
    </div>
    <HeroGoogleRating />
    <Show when={!props.category || props.category === 'kitchen' || props.category === 'bathroom'}>
      <ul class="hero-trust-points" role="list">
        <For each={trustPoints}>{point => (
          <li>
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d={point.path} />
            </svg>
            <span>{point.label}</span>
          </li>
        )}</For>
      </ul>
    </Show>
  </div>;
}

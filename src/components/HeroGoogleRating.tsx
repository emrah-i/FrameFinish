import { createSignal, For, onMount, Show } from 'solid-js';
import { site } from '../shared/content';
import { Icon } from './Icon';
import googleWordmark from './google-wordmark.png';

const stars = [1, 2, 3, 4, 5];
const configured = site.googleRating as number | null;
const verifiedRating = typeof configured === 'number' && configured >= 1 && configured <= 5 ? configured : undefined;

export default function HeroGoogleRating() {
  const [rating, setRating] = createSignal(verifiedRating);

  if (import.meta.env.DEV || import.meta.env.MODE === 'local-preview') {
    onMount(() => {
      if (!verifiedRating && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) setRating(4.9);
    });
  }

  return <Show when={rating()}>{value => (
    <span class="hero-google-rating" role="img" aria-label={`Rated ${value()} out of 5 stars on Google`}>
      <span class="hero-rating-stars" aria-hidden="true">
        <For each={stars}>{star => <span class="hero-rating-star" style={{ '--star-fill': `${Math.min(1, Math.max(0, value() - star + 1)) * 100}%` }}>
          <Icon name="star" />
          <span><Icon name="star" /></span>
        </span>}</For>
      </span>
      <span aria-hidden="true">{value()} stars on</span>
      <img src={googleWordmark} alt="" width="auto" height={650} />
    </span>
  )}</Show>;
}

import { createSignal, For, onMount, Show } from 'solid-js';
import { site } from '../shared/content';
import { Icon } from './Icon';
import googleMark from './google-mark.svg';
import yelpMark from './yelp-mark.svg';

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
    <span class="hero-google-rating" role="img" aria-label={`Rated ${value()} out of 5 stars based on reviews on Google, Facebook, and Yelp`}>
      <span class="hero-review-logos" aria-hidden="true">
        <span class="hero-review-logo hero-review-yelp"><img src={yelpMark} alt="" width="24" height="24" /></span>
        <span class="hero-review-logo hero-review-facebook"><Icon name="facebook" size={24} /></span>
        <span class="hero-review-logo hero-review-google"><img src={googleMark} alt="" width="24" height="24" /></span>
      </span>
      <span class="hero-review-copy" aria-hidden="true">
        <span class="hero-review-score">
          <span>{value().toFixed(1)}</span>
          <span class="hero-rating-stars">
            <For each={stars}>{star => <span class="hero-rating-star" style={{ '--star-fill': `${Math.min(1, Math.max(0, value() - star + 1)) * 100}%` }}>
              <Icon name="star" />
              <span><Icon name="star" /></span>
            </span>}</For>
          </span>
        </span>
        <span class="hero-review-sources">Reviews based on Google, Facebook &amp; Yelp</span>
      </span>
    </span>
  )}</Show>;
}

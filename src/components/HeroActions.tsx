import { EstimateTrigger } from './estimate/Estimate';
import HeroGoogleRating from './HeroGoogleRating';
import type { ServiceRoute } from '../shared/service-routes';

export default function HeroActions(props: { workHref: string; category?: ServiceRoute['id'] }) {
  return <div class="hero-actions">
    <div class="hero-cta-buttons">
      <EstimateTrigger source={props.category ? 'services' : 'hero'} class="button button-primary"
        prefill={() => props.category ? { category: props.category } : {}} />
      <a class="button button-secondary rounded" href={props.workHref}>See Our Work</a>
    </div>
    <HeroGoogleRating />
  </div>;
}

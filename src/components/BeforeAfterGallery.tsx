import { Show } from 'solid-js';
import type { ServiceRoute } from '../shared/service-routes';
import LoopingMediaCarousel, { serviceCarouselImageSizes } from './LoopingMediaCarousel';
import SectionHeading from './SectionHeading';
import './before-after-gallery.css';

const photos = [
  { title: 'Kitchen Remodeling', id: 'kitchen-before', alt: 'Honey-oak kitchen cabinets and a square tan tile backsplash' },
  { title: 'Kitchen Remodeling', id: 'kitchen-after', alt: 'Cream shaker cabinets and a rectangular cream tile backsplash' },
  { title: 'Bathroom Remodeling', id: 'bathroom-before', alt: 'Bathroom with an oak vanity and a molded tub' },
  { title: 'Bathroom Remodeling', id: 'bathroom-after', alt: 'Walnut-toned vanity and a white tiled tub surround' },
  { title: 'Basement Family Room', id: 'basement-family', alt: 'Finished basement family room with seating and built-in storage' },
  { title: 'Basement Media Room', id: 'basement-media', alt: 'Basement media room with a sectional sofa and wall-mounted screen' },
  { title: 'Basement Office and Recreation Space', id: 'basement-office', alt: 'Finished basement with a home office and recreation area' },
].map(photo => ({ ...photo, src: `/images/remodel-${photo.id}-960.webp` }));

export default function BeforeAfterGallery(props: { service?: ServiceRoute['id']; placement?: 'estimate' }) {
  const inEstimate = !props.service || props.placement === 'estimate';
  const items = props.service ? photos.filter(photo => photo.id.startsWith(`${props.service}-`))
    .map(photo => {
      if (props.service === 'basement') return photo;
      const stage = photo.id.endsWith('-before') ? 'Before' : 'After';
      return { ...photo, title: inEstimate ? stage : `${photo.title}: ${stage}` };
    }) : photos;

  return <div id={inEstimate ? 'why-customers-return' : undefined} class={inEstimate ? 'remodel-gallery' : undefined}
    role={inEstimate ? 'group' : undefined} aria-labelledby={inEstimate ? 'remodel-gallery-title' : undefined}>
    <Show when={inEstimate}>
      <SectionHeading id="remodel-gallery-title" title="Why Homeowners Keep Returning" class="remodel-gallery-heading" />
    </Show>
    <LoopingMediaCarousel variant={inEstimate ? 'comparisons' : 'services'}
      label={props.service === 'basement' ? 'Basement remodeling ideas' : inEstimate && props.service ? 'Before and after photos for your quote' : 'Before and after remodels'} items={items}
      renderImage={photo => <img class="rounded" src={photo.src}
        srcset={`/images/remodel-${photo.id}-480.webp 480w, ${photo.src} 960w`}
        sizes={inEstimate ? '(max-width: 900px) 92vw, 45vw' : serviceCarouselImageSizes} width={960} height={640}
        alt={photo.alt} loading="lazy" decoding="async" draggable={false} />} />
  </div>;
}

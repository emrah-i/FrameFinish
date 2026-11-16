import { Show } from 'solid-js';
import { displayedCategories } from '../shared/content';
import LoopingMediaCarousel, { serviceCarouselImageSizes } from './LoopingMediaCarousel';
import { Photo } from './Photo';
import SectionHeading from './SectionHeading';
import './why-choose-us.css';

const photos = displayedCategories.map(item => ({
  title: item.name,
  src: `/images/${item.photo.id}.webp`,
  alt: item.photo.alt,
  image: item.photo,
}));

export default function WhyChooseUs() {
  return <section id="why-choose-us" class="why-choose-us" aria-labelledby="why-title" tabindex="-1">
    <div class="shell">
      <SectionHeading id="why-title" title="Why Choose Us" />
      <Show when={photos.length > 0}>
        <LoopingMediaCarousel variant="services" label="Remodeling inspiration" items={photos}
          renderImage={item => <Photo image={item.image} sizes={serviceCarouselImageSizes} class="rounded" draggable={false} />} />
      </Show>
    </div>
  </section>;
}

import { For, Show } from 'solid-js';
import { displayedCategories, photos } from '../shared/content';
import { findServiceRoute, serviceHref } from '../shared/service-routes';
import { EstimateTrigger, QuoteLabel } from '../components/estimate/Estimate';
import EstimateSection from '../components/estimate/EstimateSection';
import HeroEstimate from '../components/estimate/HeroEstimate';
import HeroActions from '../components/HeroActions';
import { Photo } from '../components/Photo';
import { Icon } from '../components/Icon';
import SectionHeading from '../components/SectionHeading';
import WhyChooseUs from '../components/WhyChooseUs';
import BeforeAfterGallery from '../components/BeforeAfterGallery';
import LocalPreviewReviews from '../components/LocalPreviewReviews';
import ProcessTimeline from '../components/ProcessTimeline';

export default function Home() {
  return <main id="main-content" class="home-page" tabindex="-1">
    <section id="home-hero" class="hero home-hero quote-form-hero" aria-labelledby="hero-title" data-reveal-group="" data-reveal-children="">
      <Photo image={photos.kitchen} priority sizes="100vw" class="hero-photo" />
      <div class="hero-copy">
        <h1 id="hero-title">Ohio’s Most Trusted Home Remodeling Experts Since 2010</h1>
        <p>Planning a kitchen, bathroom, or flooring update? Tell us about your project and get a free quote.</p>
        <HeroActions workHref="#why-choose-us" />
      </div>
      <HeroEstimate />
    </section>

    <section id="services" class="home-services" aria-labelledby="services-title">
      <div class="section shell">
        <SectionHeading id="services-title" title="Our Services" />
        <div class="service-grid">
          <For each={displayedCategories}>{item => <article id={item.id} class="service-card rounded" data-reveal-group="">
            <Photo image={item.photo} sizes="(max-width: 620px) 92vw, (max-width: 780px) 45vw, 31vw" />
            <div class="service-body">
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <div class="service-actions">
                <EstimateTrigger source="services" class="button button-primary" prefill={() => ({ category: item.id })}>
                  <span><QuoteLabel /><span class="sr-only"> for {item.name.toLowerCase()}</span></span>
                </EstimateTrigger>
                <Show when={findServiceRoute(serviceHref(item.id))}>{service =>
                  <a class="button button-secondary rounded" href={service().href}>
                    <span>Learn More<span class="sr-only"> about {item.name.toLowerCase()}</span></span><Icon name="chevron-right" size={18} />
                  </a>
                }</Show>
              </div>
            </div>
          </article>}</For>
        </div>
      </div>
    </section>

    <WhyChooseUs />

    <ProcessTimeline />

    <LocalPreviewReviews />
    <EstimateSection><BeforeAfterGallery /></EstimateSection>
  </main>;
}

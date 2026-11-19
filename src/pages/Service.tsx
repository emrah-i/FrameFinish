import { For, createSignal } from 'solid-js';
import BeforeAfterGallery from '../components/BeforeAfterGallery';
import { EstimateTrigger, QuoteLabel } from '../components/estimate/Estimate';
import EstimateSection from '../components/estimate/EstimateSection';
import HeroEstimate from '../components/estimate/HeroEstimate';
import HeroActions from '../components/HeroActions';
import { Icon } from '../components/Icon';
import LocalPreviewReviews from '../components/LocalPreviewReviews';
import { Photo } from '../components/Photo';
import SectionHeading from '../components/SectionHeading';
import type { ServiceRoute } from '../shared/service-routes';
import './service-page.css';

export default function Service(props: { service: ServiceRoute }) {
  const [openFaq, setOpenFaq] = createSignal<number>();

  return <main id="main-content" tabindex="-1" class="service-page">
    <section class="hero service-page-hero quote-form-hero" classList={{ 'hero-wide-copy': props.service.id !== 'flooring' }}
      aria-labelledby="service-page-title" data-reveal-group="" data-reveal-children="">
      <Photo image={props.service.photo} priority sizes="100vw" class="hero-photo" />
      <div class="hero-copy">
        <h1 id="service-page-title">
          {props.service.pageTitle.split(/(Dallas)/).map(part =>
            part === 'Dallas' ? <span class="hero-city">{part}</span> : part
          )}
        </h1>
        <p>{props.service.summary}</p>
        <HeroActions workHref="#featured-work" category={props.service.id} />
      </div>
      <HeroEstimate category={props.service.id} />
    </section>
    <section class="section shell service-page-details" aria-labelledby="service-project-title" data-reveal-group="" data-reveal-children="">
      <SectionHeading id="service-project-title" title="What’s Included" />
      <ul class="service-grid" role="list">
        <For each={props.service.highlights}>{highlight => <li class="service-card rounded">
          <div class="service-body">
            <h3>{highlight.title}</h3>
            <p>{highlight.description}</p>
            <div class="service-actions">
              <EstimateTrigger source="services" class="button button-primary" prefill={() => ({
                category: props.service.id,
              })}>
                <span><QuoteLabel /><span class="sr-only"> for {highlight.title}</span></span>
              </EstimateTrigger>
            </div>
          </div>
        </li>}</For>
      </ul>
    </section>

    <section id="featured-work" class="section featured-work" aria-labelledby="featured-work-title" tabindex="-1">
      <div class="shell">
        <SectionHeading id="featured-work-title" title="Featured Work" />
        <BeforeAfterGallery service={props.service.id} />
      </div>
    </section>

    <section class="section shell service-faq" aria-labelledby="service-faq-title">
      <SectionHeading id="service-faq-title" title="Frequently Asked Questions" />
      <div class="service-faq-list" data-reveal-group="">
        <For each={props.service.faqs}>{([question, answer], index) => {
          const expanded = () => openFaq() === index();
          const panelId = `service-faq-answer-${index() + 1}`;
          return <div class="service-faq-item">
            <h3><button type="button" aria-expanded={expanded()} aria-controls={panelId}
              onClick={() => setOpenFaq(expanded() ? undefined : index())}>
              {question}<Icon name="chevron-right" />
            </button></h3>
            <div class="service-faq-panel" id={panelId} inert={!expanded()}>
              <div><p>{answer}</p></div>
            </div>
          </div>;
        }}</For>
      </div>
    </section>

    <LocalPreviewReviews />
    <EstimateSection category={props.service.id}>
      <BeforeAfterGallery service={props.service.id} placement="estimate" />
    </EstimateSection>
  </main>;
}

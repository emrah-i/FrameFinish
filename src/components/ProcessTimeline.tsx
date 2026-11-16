import { createSignal, For, onCleanup, onMount } from 'solid-js';
import SectionHeading from './SectionHeading';
import { QuoteLabel } from './estimate/Estimate';
import './process-timeline.css';

const steps = [
  { title: 'Consultation', description: "Tell us what you'd like to change. We'll discuss your priorities and check your project ZIP code." },
  { title: 'Get a FREE Quote', description: 'Once we confirm your location is in our service area and the project is a good fit, we’ll visit your home to assess the space and give you a free quote.', quote: true },
  { title: 'Build', description: 'Once you approve the scope and quote, work begins. Our team keeps you informed about next steps.' },
  { title: 'Final Walkthrough', description: 'Walk through the finished space with our team and share what you like and what still needs attention.' },
];

export default function ProcessTimeline() {
  const [active, setActive] = createSignal(0);
  let timeline!: HTMLOListElement;
  let timer: number | undefined;
  let selectedManually = false;

  function select(index: number) {
    selectedManually = true;
    window.clearTimeout(timer);
    setActive(index);
  }

  onMount(() => {
    if (!('IntersectionObserver' in window)) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;

    function schedule() {
      window.clearTimeout(timer);
      if (!visible || document.hidden || reducedMotion.matches || selectedManually || active() === steps.length - 1) return;
      timer = window.setTimeout(() => {
        setActive(index => index + 1);
        schedule();
      }, 1400);
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    });
    observer.observe(timeline);
    document.addEventListener('visibilitychange', schedule);
    reducedMotion.addEventListener('change', schedule);
    onCleanup(() => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', schedule);
      reducedMotion.removeEventListener('change', schedule);
      window.clearTimeout(timer);
    });
  });

  return <section id="process" class="process" aria-labelledby="process-title">
    <div class="section shell">
      <SectionHeading id="process-title" title="How It Works" />
      <ol ref={timeline} class="process-grid" role="list" data-reveal-group="">
        <For each={steps}>{(step, index) => <li class="process-step" classList={{ 'process-step-complete': index() < active() }}>
          <button type="button" class="process-step-number" aria-label={`Step ${index() + 1}, ${step.title}`}
            aria-current={index() === active() ? 'step' : undefined} onClick={() => select(index())}>{index() + 1}</button>
          <div>
            <h3>{step.quote ? <QuoteLabel freeClass="estimate-free-mark" titleCase /> : step.title}</h3>
            <p>{step.description}</p>
          </div>
        </li>}</For>
      </ol>
    </div>
  </section>;
}

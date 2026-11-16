import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { Icon } from './Icon';
import SectionHeading from './SectionHeading';
import googleWordmark from './google-wordmark.png';
import './preview-reviews.css';

const sampleReviews = [
  { author: 'Morgan Reed', date: '2026-10-24', text: 'The kitchen layout discussion helped us narrow down what we wanted to change.', rating: 5 },
  { author: 'Jamie Holt', date: '2026-10-19', text: 'We had a lot of questions about the bathroom, and the next steps were easy to understand.', rating: 5 },
  { author: 'Robin Ellis', date: '2026-10-14', text: 'We wanted a floor that could handle muddy shoes and a dog. It helped to talk through the options.', rating: 5 },
  { author: 'Casey Wynn', date: '2026-10-07', text: 'The conversation gave us a good idea of what to plan for before starting the remodel.', rating: 4 },
  { author: 'Taylor Brooks', date: '2026-09-29', text: 'We were able to share our ideas and explain which parts of the kitchen mattered most to us.', rating: 5 },
  { author: 'Jordan Finch', date: '2026-09-22', text: 'It was helpful to look at both a small refresh and a more complete bathroom update.', rating: 5 },
  { author: 'Cameron Bell', date: '2026-09-15', text: 'We weren\'t sure where to start, and the follow-up helped us get organized.', rating: 4 },
  { author: 'Reese Hayes', date: '2026-09-08', text: 'We appreciated being able to ask about flooring for more than one room.', rating: 5 },
  { author: 'Quinn Miller', date: '2026-08-30', text: 'We talked through storage and lighting together, which made the kitchen plan feel more practical.', rating: 5 },
  { author: 'Alex Rowe', date: '2026-08-23', text: 'It was helpful to explain what we liked about the bathroom before talking about changes.', rating: 5 },
  { author: 'Devon Lane', date: '2026-08-16', text: 'The estimate process was straightforward, even though we were still weighing our options.', rating: 4 },
  { author: 'Riley Ford', date: '2026-08-09', text: 'We got a better sense of which updates to tackle first and which could wait.', rating: 5 },
  { author: 'Hayden Shaw', date: '2026-07-30', text: 'We wanted more room around the kitchen island and got to talk through our priorities.', rating: 5 },
  { author: 'Drew Stone', date: '2026-07-23', text: 'We discussed keeping the existing layout and focusing on fixtures and finishes.', rating: 4 },
  { author: 'Sam Hart', date: '2026-07-16', text: 'We had a mix of older floors and wanted the rooms to feel more connected.', rating: 5 },
  { author: 'Avery Blake', date: '2026-07-09', text: 'The conversation helped us put our ideas into a clear list for the next step.', rating: 5 },
];
const initialReviewCount = 12;
const averageRating = sampleReviews.reduce((total, review) => total + review.rating, 0) / sampleReviews.length;
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const stars = [1, 2, 3, 4, 5];

function Stars(props: { rating: number }) {
  return <span class="preview-review-stars" role="img" aria-label={`${props.rating.toFixed(1)} out of 5 stars`}>
    <span class="preview-review-stars-row" aria-hidden="true">
      <For each={stars}>{() => <Icon name="star" />}</For>
    </span>
    <span class="preview-review-stars-row preview-review-stars-fill" aria-hidden="true" style={{ '--rating-fill': `${props.rating * 20}%` }}>
      <For each={stars}>{() => <Icon name="star" />}</For>
    </span>
  </span>;
}

function ReviewText(props: { text: string; id: string }) {
  const [truncated, setTruncated] = createSignal(false);
  const [expanded, setExpanded] = createSignal(false);
  let paragraph!: HTMLParagraphElement;

  onMount(() => {
    const measure = () => setTruncated(paragraph.scrollHeight > parseFloat(getComputedStyle(paragraph).lineHeight) * 3 + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(paragraph);
    measure();
    onCleanup(() => observer.disconnect());
  });

  return <>
    <p ref={paragraph} id={props.id} classList={{ 'preview-review-clamped': !expanded() }}>{props.text}</p>
    <Show when={truncated()}><button class="preview-review-expand rounded" type="button" aria-controls={props.id} aria-expanded={expanded()} onClick={() => setExpanded(value => !value)}>{expanded() ? 'Read less' : 'Read more'}</button></Show>
  </>;
}

export default function PreviewReviews() {
  const [expanded, setExpanded] = createSignal(false);
  let firstExtraReview: HTMLLIElement | undefined;

  function showAllReviews() {
    setExpanded(true);
    queueMicrotask(() => firstExtraReview?.focus());
  }

  return <section class="preview-reviews" aria-labelledby="preview-reviews-title">
    <div class="section shell">
      <SectionHeading id="preview-reviews-title" title="What Our Customers Say" />

      <div class="preview-reviews-summary rounded" data-reveal-group="">
        <div>
          <p class="preview-reviews-platform"><img src={googleWordmark} alt="Google" width={1920} height={595} /> Reviews</p>
          <div class="preview-reviews-average">
            <strong aria-hidden="true">{averageRating.toFixed(1)}</strong>
            <Stars rating={averageRating} />
            <span aria-label={`${sampleReviews.length} reviews`}>({sampleReviews.length})</span>
          </div>
        </div>
        <button class="preview-reviews-google-action rounded" type="button" disabled>Review us on Google</button>
      </div>

      <ul class="preview-reviews-grid" id="preview-reviews-grid" role="list">
        <For each={sampleReviews.slice(0, expanded() ? sampleReviews.length : initialReviewCount)}>{(review, index) =>
          <li class="preview-review-card rounded" data-reveal-group="" tabindex="-1" ref={element => {
            if (index() === initialReviewCount) firstExtraReview = element;
          }}>
            <div class="preview-review-author">
              <span class="preview-review-avatar rounded" aria-hidden="true">{review.author[0]}</span>
              <div>
                <h3>{review.author}</h3>
                <time dateTime={review.date}>{dateFormat.format(new Date(review.date))}</time>
              </div>
            </div>
            <Stars rating={review.rating} />
            <ReviewText text={review.text} id={`preview-review-text-${index()}`} />
          </li>
        }</For>
      </ul>

      <Show when={!expanded()}>
        <div class="preview-reviews-action" data-reveal-group="">
          <button class="button preview-reviews-more rounded" type="button" aria-controls="preview-reviews-grid" onClick={showAllReviews}>Load more <Icon name="plus" size={16} /></button>
        </div>
      </Show>
    </div>
  </section>;
}

import AutoScroll from 'embla-carousel-auto-scroll';
import createEmblaCarousel from 'embla-carousel-solid';
import { createEffect, createSignal, For, onCleanup, onMount, Show, type JSX } from 'solid-js';
import { Icon } from './Icon';
import './media-carousel.css';

type GalleryPhoto = { title: string; src: string; alt: string };
export const serviceCarouselImageSizes = '(max-width: 620px) 80vw, (max-width: 1000px) 45vw, 30vw';

export default function LoopingMediaCarousel<T extends GalleryPhoto>(props: {
  variant: 'services' | 'comparisons';
  label: string;
  items: readonly T[];
  renderImage: (item: T) => JSX.Element;
}) {
  const count = props.items.length;
  const multiple = count > 1;
  // The desktop service strip shows three photos at once, so it needs extra slides to loop.
  const slides = [...props.items, ...(props.variant === 'services' && multiple ? props.items : [])];
  const autoScroll = AutoScroll({ speed: 1, startDelay: 800, playOnInit: false, stopOnFocusIn: false });
  const widths = new WeakMap<Element, number>();
  let resizeFrame: number | undefined;
  const [viewportRef, emblaApi] = createEmblaCarousel(
    () => ({
      loop: multiple, align: 'start', dragFree: true, watchDrag: multiple, watchFocus: false,
      watchResize(api, entries) {
        let changed = false;
        for (const { target, contentRect: { width } } of entries) {
          const previous = widths.get(target);
          if (previous !== undefined && Math.abs(width - previous) < 0.5) continue;
          widths.set(target, width);
          changed = true;
        }
        // Reinitializing during observer delivery can interrupt layout on iPhone WebKit.
        if (changed && resizeFrame === undefined) resizeFrame = requestAnimationFrame(() => {
          resizeFrame = undefined;
          api.reInit();
        });
        return false;
      },
    }),
    () => [autoScroll],
  );
  onCleanup(() => { if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame); });
  const [activeSlide, setActiveSlide] = createSignal(0);
  const [motionAllowed, setMotionAllowed] = createSignal(false);
  const [inView, setInView] = createSignal(false);
  const [pageVisible, setPageVisible] = createSignal(false);
  const [dragging, setDragging] = createSignal(false);
  const [photo, setPhoto] = createSignal<GalleryPhoto>();
  let carousel!: HTMLDivElement;
  let dialog!: HTMLDialogElement;
  let opener: HTMLButtonElement;

  onMount(() => {
    if (!multiple) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setMotionAllowed(!reducedMotion.matches);
    const updatePageVisibility = () => setPageVisible(!document.hidden);
    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => setInView(entry.isIntersecting))
      : undefined;
    updateMotionPreference();
    updatePageVisibility();
    setInView(!observer);
    observer?.observe(carousel);
    document.addEventListener('visibilitychange', updatePageVisibility);
    reducedMotion.addEventListener('change', updateMotionPreference);
    onCleanup(() => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', updatePageVisibility);
      reducedMotion.removeEventListener('change', updateMotionPreference);
    });
  });

  createEffect(() => {
    const api = emblaApi();
    if (!api || !multiple) return;
    const updateSlide = () => setActiveSlide(api.selectedScrollSnap());
    const startDrag = () => setDragging(true);
    const endDrag = () => setDragging(false);
    const releaseDrag = () => {
      if (api.internalEngine().scrollBody.settled()) endDrag();
    };

    updateSlide();
    api.on('select', updateSlide).on('reInit', updateSlide)
      .on('pointerDown', startDrag).on('pointerUp', releaseDrag).on('settle', endDrag).on('reInit', endDrag);
    onCleanup(() => {
      api.off('select', updateSlide).off('reInit', updateSlide)
        .off('pointerDown', startDrag).off('pointerUp', releaseDrag).off('settle', endDrag).off('reInit', endDrag);
    });
  });

  const shouldPlay = () => motionAllowed() && inView() && pageVisible() && !dragging() && !photo();
  createEffect(() => {
    const api = emblaApi();
    if (!api || !multiple) return;
    const play = shouldPlay();
    const update = () => { if (play) autoScroll.play(); else autoScroll.stop(); };
    update();
    api.on('reInit', update);
    onCleanup(() => api.off('reInit', update));
  });

  function moveSlide(event: KeyboardEvent) {
    const api = emblaApi();
    if (!api || !multiple || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const nodes = api.slideNodes();
    const focused = nodes.findIndex(node => node.contains(document.activeElement));
    const next = ((focused < 0 ? activeSlide() : focused) + (event.key === 'ArrowLeft' ? -1 : 1) + nodes.length) % nodes.length;
    event.preventDefault();
    autoScroll.stop();
    api.scrollTo(next, true);
    nodes[next].querySelector('button')?.focus({ preventScroll: true });
    if (shouldPlay()) autoScroll.play();
  }

  function open(trigger: HTMLButtonElement, image: GalleryPhoto) {
    opener = trigger;
    setPhoto(image);
    queueMicrotask(() => dialog.showModal());
  }

  return <div ref={carousel} class={`media-carousel media-carousel--${props.variant}`} role="group"
    aria-label={props.label} aria-roledescription="carousel" data-reveal-group="">
    <div class="media-carousel-viewport" ref={viewportRef} onKeyDown={moveSlide}>
      <div class="media-carousel-track">
        <For each={slides}>{(item, index) => {
          const active = () => index() === activeSlide();
          const activate = (event: KeyboardEvent & { currentTarget: HTMLButtonElement }) => {
            // Embla may suppress the next click after a swipe, including a keyboard-generated click.
            if (event.key !== (event.type === 'keydown' ? 'Enter' : ' ')) return;
            event.preventDefault();
            open(event.currentTarget, item);
          };
          return <div class="media-carousel-item" aria-hidden={index() >= count && !active() ? 'true' : undefined}>
            <figure>
              <figcaption>{item.title}</figcaption>
              <button type="button" class="gallery-photo-button rounded" tabindex={active() ? 0 : -1} onKeyDown={activate} onKeyUp={activate}
                aria-label={`Enlarge ${item.title}: ${item.alt}`} aria-haspopup="dialog" onClick={event => {
                  if (!event.defaultPrevented) open(event.currentTarget, item);
                }}>
                {props.renderImage(item)}
              </button>
            </figure>
          </div>;
        }}</For>
      </div>
    </div>
    <dialog ref={dialog} class="gallery-image-dialog rounded" aria-label={photo()?.title} onClose={() => {
      opener?.focus({ preventScroll: true });
      setPhoto(undefined);
    }} onClick={event => { if (event.target === dialog) dialog.close(); }}>
      <Show when={photo()}>{image => <div class="gallery-image-content">
        <div class="dialog-head">
          <h2>{image().title}</h2>
          <button type="button" class="dialog-close rounded" autofocus aria-label="Close image" onClick={() => dialog.close()}><Icon name="close" /></button>
        </div>
        <img class="rounded" src={image().src} alt={image().alt} />
      </div>}</Show>
    </dialog>
  </div>;
}

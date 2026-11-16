/** Let CSS entry fades finish before enhancing off-screen groups with Motion. */
export function deferReveals(root: Pick<ParentNode, 'querySelectorAll'>): () => void {
  let disposed = false;
  let cleanup: (() => void) | undefined;
  let frame = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const duration = getComputedStyle(document.documentElement).getPropertyValue('--animation-duration').trim();
  const durationMs = Number.parseFloat(duration) * (duration.endsWith('ms') ? 1 : 1000);
  if (!Number.isFinite(durationMs) || durationMs <= 0) return () => {};
  const revealTarget = (target: Element | null) => {
    for (const group of root.querySelectorAll<HTMLElement>('[data-reveal-group]')) {
      if (target && (group === target || group.contains(target))) group.dataset.reveal = 'done';
    }
  };
  const focus = (event: FocusEvent) => revealTarget(event.target instanceof Element ? event.target : null);
  const hash = () => {
    try { revealTarget(document.getElementById(decodeURIComponent(window.location.hash.slice(1)))); } catch { /* Ignore malformed fragments. */ }
  };
  const removeEarlyListeners = () => {
    document.removeEventListener('focusin', focus);
    window.removeEventListener('hashchange', hash);
  };
  document.addEventListener('focusin', focus);
  window.addEventListener('hashchange', hash);
  revealTarget(document.activeElement); hash();
  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      timer = setTimeout(async () => {
        try {
          const { startReveals } = await import('./reveal');
          if (!disposed) { cleanup = startReveals(root, durationMs); removeEarlyListeners(); }
        } catch { /* CSS completes independently, including failed chunk loads. */ }
      }, durationMs);
    });
  });
  return () => {
    disposed = true; cancelAnimationFrame(frame); clearTimeout(timer);
    removeEarlyListeners(); cleanup?.();
  };
}

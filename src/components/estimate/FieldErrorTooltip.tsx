import { createEffect, createSignal, onCleanup, Show } from 'solid-js';

export default function FieldErrorTooltip(props: { id: string; message?: string; attempt: number }) {
  const [visibleAttempt, setVisibleAttempt] = createSignal<number>();
  const [dismissing, setDismissing] = createSignal(false);
  createEffect(() => {
    const attempt = props.attempt;
    if (!props.message) return;
    setVisibleAttempt(attempt);
    setDismissing(false);
    const fadeTimer = window.setTimeout(() => setDismissing(true), 2300);
    const hideTimer = window.setTimeout(() => setVisibleAttempt(undefined), 2500);
    onCleanup(() => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    });
  });

  return <Show when={props.message}>
    <p class="field-error-tooltip" role="tooltip" id={props.id} hidden={visibleAttempt() !== props.attempt}
      data-dismissing={dismissing() ? '' : undefined}>{props.message}</p>
  </Show>;
}

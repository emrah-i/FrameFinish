import { createSignal, lazy, onMount, Show } from 'solid-js';

const PreviewReviews = import.meta.env.DEV || import.meta.env.MODE === 'local-preview'
  ? lazy(() => import('./PreviewReviews'))
  : undefined;

export default function LocalPreviewReviews() {
  if (!PreviewReviews) return null;

  const [visible, setVisible] = createSignal(false);
  onMount(() => setVisible(['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)));
  return <Show when={visible()}><PreviewReviews /></Show>;
}

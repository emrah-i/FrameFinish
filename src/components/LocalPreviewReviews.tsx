import { createSignal, lazy, onMount, Show } from 'solid-js';

const PreviewReviews = import.meta.env.DEV || import.meta.env.MODE === 'local-preview'
  ? lazy(() => import('./PreviewReviews'))
  : undefined;

export function useLocalPreviewReviews() {
  const [visible, setVisible] = createSignal(false);
  onMount(() => setVisible(!!PreviewReviews && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)));
  return visible;
}

export default function LocalPreviewReviews() {
  const visible = useLocalPreviewReviews();
  if (!PreviewReviews) return null;
  return <Show when={visible()}><PreviewReviews /></Show>;
}

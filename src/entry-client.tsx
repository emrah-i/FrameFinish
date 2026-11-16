import { onCleanup, onMount } from 'solid-js';
import { hydrate, render } from 'solid-js/web';
import App from './App';
import { deferReveals } from './lib/reveal-loader';
import { pages } from './shared/pages';
import './styles.css';
import './components/navigation.css';
import './reveals.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing application root.');
const view = () => {
  onMount(() => onCleanup(deferReveals(root)));
  return <App path={window.location.pathname} />;
};
if (root.childElementCount) hydrate(view, root);
else {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  document.title = pages[Object.hasOwn(pages, path) ? path : '/404'][0];
  render(view, root);
}

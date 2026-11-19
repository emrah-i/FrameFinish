import { Match, Switch } from 'solid-js';
import { EstimateProvider } from './components/estimate/Estimate';
import { Footer, Header } from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Service from './pages/Service';
import { Contact, Legal, NotFound } from './pages/Supporting';
import { findServiceRoute } from './shared/service-routes';

export default function App(props: { path: string }) {
  const path = () => props.path.replace(/\/$/, '') || '/';

  return <EstimateProvider>
    <a href="#main-content" class="skip-link">Skip to content</a>
    <Header path={path()} />
    <Switch fallback={<NotFound />}>
      <Match when={path() === '/'}><Home /></Match>
      <Match when={path() === '/about'}><About /></Match>
      <Match when={path() === '/contact'}><Contact /></Match>
      <Match when={path() === '/privacy'}><Legal type="privacy" /></Match>
      <Match when={path() === '/terms'}><Legal type="terms" /></Match>
      <Match when={findServiceRoute(path())}>{service => <Service service={service()} />}</Match>
    </Switch>
    <Footer />
  </EstimateProvider>;
}

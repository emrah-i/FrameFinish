import { Show, type JSX } from 'solid-js';

export default function SectionHeading(props: { id: string; title: JSX.Element; description?: string; class?: string }) {
  return <div class={props.class ? `section-head ${props.class}` : 'section-head'} data-reveal-group="">
    <h2 id={props.id}>{props.title}</h2>
    <Show when={props.description}>{description => <p>{description()}</p>}</Show>
  </div>;
}

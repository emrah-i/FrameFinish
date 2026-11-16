export function Photo(props: { image: { id: string; alt: string }; priority?: boolean; sizes: string; class?: string; draggable?: boolean }) {
  const base = () => `/images/${props.image.id}`;
  return <img
    class={props.class} src={`${base()}.webp`} srcset={`${base()}-480.webp 480w, ${base()}.webp 768w`}
    sizes={props.sizes} alt={props.image.alt} width={768} height={512}
    loading={props.priority ? 'eager' : 'lazy'} fetchpriority={props.priority ? 'high' : undefined}
    decoding={props.priority ? undefined : 'async'}
    draggable={props.draggable}
  />;
}

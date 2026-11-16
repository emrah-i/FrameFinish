import { faBars, faCheck, faChevronRight, faEnvelope, faLocationDot, faPhone, faPlus, faStar, faXmark } from '@fortawesome/free-solid-svg-icons';
import { For } from 'solid-js';

const icons = {
  'chevron-right': faChevronRight,
  menu: faBars,
  close: faXmark,
  check: faCheck,
  pin: faLocationDot,
  mail: faEnvelope,
  phone: faPhone,
  plus: faPlus,
  star: faStar,
};

export function Icon(props: { name: keyof typeof icons; size?: number }) {
  const icon = () => icons[props.name];
  const dimensions = () => icon().icon;
  return <svg aria-hidden="true" data-icon={icon().iconName} width={props.size ?? 20} height={props.size ?? 20}
    viewBox={`0 0 ${dimensions()[0]} ${dimensions()[1]}`} fill="currentColor">
    <For each={[dimensions()[4]].flat()}>{path => <path d={path} />}</For>
  </svg>;
}

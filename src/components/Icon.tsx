import { faBars, faCheck, faChevronRight, faClock, faEnvelope, faLocationDot, faPhone, faPlus, faStar, faXmark } from '@fortawesome/free-solid-svg-icons';
import { For } from 'solid-js';

const icons = {
  'chevron-right': faChevronRight,
  menu: faBars,
  close: faXmark,
  clock: faClock,
  check: faCheck,
  pin: faLocationDot,
  mail: faEnvelope,
  phone: faPhone,
  plus: faPlus,
  star: faStar,
  // Font Awesome Free Brands 7.3.1, CC BY 4.0.
  facebook: { iconName: 'facebook-f', icon: [320, 512, [], '', 'M80 299.3l0 212.7 116 0 0-212.7 86.5 0 18-97.8-104.5 0 0-34.6c0-51.7 20.3-71.5 72.7-71.5 16.3 0 29.4 .4 37 1.2l0-88.7C291.4 4 256.4 0 236.2 0 129.3 0 80 50.5 80 159.4l0 42.1-66 0 0 97.8 66 0z'] },
  instagram: { iconName: 'instagram', icon: [448, 512, [], '', 'M224.3 141a115 115 0 1 0 -.6 230 115 115 0 1 0 .6-230zm-.6 40.4a74.6 74.6 0 1 1 .6 149.2 74.6 74.6 0 1 1 -.6-149.2zm93.4-45.1a26.8 26.8 0 1 1 53.6 0 26.8 26.8 0 1 1 -53.6 0zm129.7 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM399 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z'] },
  linkedin: { iconName: 'linkedin-in', icon: [448, 512, [], '', 'M100.3 448l-92.9 0 0-299.1 92.9 0 0 299.1zM53.8 108.1C24.1 108.1 0 83.5 0 53.8 0 39.5 5.7 25.9 15.8 15.8s23.8-15.8 38-15.8 27.9 5.7 38 15.8 15.8 23.8 15.8 38c0 29.7-24.1 54.3-53.8 54.3zM447.9 448l-92.7 0 0-145.6c0-34.7-.7-79.2-48.3-79.2-48.3 0-55.7 37.7-55.7 76.7l0 148.1-92.8 0 0-299.1 89.1 0 0 40.8 1.3 0c12.4-23.5 42.7-48.3 87.9-48.3 94 0 111.3 61.9 111.3 142.3l0 164.3-.1 0z'] },
} as const;

const viewBoxes: Partial<Record<keyof typeof icons, string>> = {
  instagram: '-1 31 450 450',
  linkedin: '0 0 448 448',
};

export function Icon(props: { name: keyof typeof icons; size?: number }) {
  const icon = () => icons[props.name];
  const dimensions = () => icon().icon;
  const size = () => props.size ?? 18;
  return <svg aria-hidden="true" data-icon={icon().iconName} width={size()} height={size()}
    viewBox={viewBoxes[props.name] ?? `0 0 ${dimensions()[0]} ${dimensions()[1]}`} fill="currentColor">
    <For each={[dimensions()[4]].flat()}>{path => <path d={path} />}</For>
  </svg>;
}

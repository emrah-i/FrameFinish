import { EstimateForm } from './Estimate';

export default function HeroEstimate(props: { category?: string }) {
  return <EstimateForm prefix="hero" variant="hero" category={props.category} />;
}

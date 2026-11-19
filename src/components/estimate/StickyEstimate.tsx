import { EstimateForm, EstimateTrigger } from './Estimate';

export function StickyEstimate(props: { visible: boolean; category?: string }) {
  return <div class="sticky-estimate" hidden={!props.visible}>
    <EstimateForm prefix="sticky" variant="sticky" category={props.category} />
    <div class="shell sticky-estimate-compact"><EstimateTrigger class="button button-primary" source="sticky" prefill={() => props.category ? { category: props.category } : {}} /></div>
  </div>;
}

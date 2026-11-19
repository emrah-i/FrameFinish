import type { ParentProps } from 'solid-js';
import type { ServiceRoute } from '../../shared/service-routes';
import SectionHeading from '../SectionHeading';
import { BottomEstimateForm } from './Estimate';

export default function EstimateSection(props: ParentProps<{ category?: ServiceRoute['id'] }>) {
  return <section class="estimate-section" aria-labelledby="estimate-section-title">
    <div class="shell estimate-section-inner" id="estimate-section">
      <div class="estimate-section-copy">{props.children}</div>
      <div class="estimate-form-panel rounded">
        <SectionHeading id="estimate-section-title" title="Bring Your Dream Home to Life with Expert Remodeling"
          description="Tell us how to reach you, and we'll call to discuss your remodeling project." />
        <div data-reveal-group=""><BottomEstimateForm category={props.category} /></div>
      </div>
    </div>
  </section>;
}

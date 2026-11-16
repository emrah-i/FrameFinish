import type { ParentProps } from 'solid-js';
import type { ServiceRoute } from '../../shared/service-routes';
import SectionHeading from '../SectionHeading';
import { BottomEstimateForm, QuoteLabel } from './Estimate';

export default function EstimateSection(props: ParentProps<{ category?: ServiceRoute['id'] }>) {
  return <section class="estimate-section" aria-labelledby="estimate-section-title">
    <div class="shell estimate-section-inner" id="estimate-section">
      <div class="estimate-section-copy">
        <SectionHeading id="estimate-section-title" title={<QuoteLabel freeClass="estimate-free-mark" titleCase />}
          description="Tell us a little about your remodel. Our team will review your request and get in touch." />
        {props.children}
      </div>
      <div class="estimate-form-panel rounded"><div data-reveal-group=""><BottomEstimateForm category={props.category} /></div></div>
    </div>
  </section>;
}

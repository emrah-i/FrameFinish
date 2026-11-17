import { createSignal } from 'solid-js';
import { estimateFormIds, normalizeFields, validateFields, type FieldErrors } from '../../shared/estimates';
import { Icon } from '../Icon';
import { FormDisclosure, QuoteLabel, useEstimate } from './Estimate';
import FieldErrorTooltip from './FieldErrorTooltip';
import { useFormDraft } from './form-draft';
import { phonePlaceholder, rememberPhoneEdit, updatePhoneInput } from './phone';

export default function HeroEstimate(props: { category?: string }) {
  const openEstimate = useEstimate();
  const draft = useFormDraft();
  const [errors, setErrors] = createSignal<FieldErrors>({});
  const [attempt, setAttempt] = createSignal(0);
  let name!: HTMLInputElement;
  let phone!: HTMLInputElement;
  let submit!: HTMLButtonElement;
  const editName = () => draft.save({ name: name.value });
  const editPhone = (event: Event) => draft.save({ phone: updatePhoneInput(phone, event) });

  return <form id={estimateFormIds.hero} class="hero-estimate rounded" aria-labelledby="hero-estimate-title" action="/contact#estimate-contact" noValidate onSubmit={event => {
    event.preventDefault();
    const fields = { name: name.value, phone: updatePhoneInput(phone) };
    draft.save(fields);
    const contact = normalizeFields(fields);
    const problems = validateFields(contact);
    setErrors({ name: problems.name, phone: problems.phone });
    if (problems.name || problems.phone) {
      setAttempt(previous => previous + 1);
      (problems.name ? name : phone).focus();
      return;
    }
    const project = props.category ? { category: props.category } : {};
    openEstimate?.(submit, props.category ? 'services' : 'hero', project);
  }}>
    <h2 id="hero-estimate-title">Transform Your Home with Expert Remodeling Services</h2>
    <p class="hero-estimate-intro">Tell us how to reach you, and we'll call to discuss your remodeling project.</p>
    <label for="hero-name">Full Name</label>
    <div class="field-tooltip-anchor">
      <input ref={name} id="hero-name" class="rounded" type="text" autocomplete="name" maxlength={100} required placeholder="Jane Smith"
        aria-invalid={!!errors().name} aria-describedby={errors().name ? 'hero-name-error' : undefined}
        value={draft.value('name') ?? ''} onInput={editName} onChange={editName} />
      <FieldErrorTooltip id="hero-name-error" message={errors().name} attempt={attempt()} />
    </div>
    <label for="hero-phone">Phone Number</label>
    <div class="field-tooltip-anchor">
      <input ref={phone} id="hero-phone" class="rounded" type="tel" autocomplete="tel" required placeholder={phonePlaceholder}
        aria-invalid={!!errors().phone} aria-describedby={errors().phone ? 'hero-phone-error' : undefined}
        value={draft.value('phone') ?? ''} onBeforeInput={rememberPhoneEdit} onInput={editPhone} onChange={editPhone} onPaste={editPhone} />
      <FieldErrorTooltip id="hero-phone-error" message={errors().phone} attempt={attempt()} />
    </div>
    <div class="hero-estimate-actions">
      <button ref={submit} type="submit" class="button button-primary quote-action rounded"><QuoteLabel /> <Icon name="chevron-right" /></button>
    </div>
    <FormDisclosure />
  </form>;
}

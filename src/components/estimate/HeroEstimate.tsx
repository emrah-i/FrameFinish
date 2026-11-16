import { createEffect, createSignal, Show } from 'solid-js';
import { estimateFormIds, normalizeFields, validateFields, type FieldErrors } from '../../shared/estimates';
import { Icon } from '../Icon';
import { FormDisclosure, MarketingEmailCheckbox, QuoteLabel, useEstimate } from './Estimate';
import { useFormDraft } from './form-draft';
import { phonePlaceholder, rememberPhoneEdit, updatePhoneInput } from './phone';

export default function HeroEstimate(props: { category?: string }) {
  const openEstimate = useEstimate();
  const draft = useFormDraft();
  const [consentedEmail, setConsentedEmail] = createSignal<string>();
  const [errors, setErrors] = createSignal<FieldErrors>({});
  let email!: HTMLInputElement;
  let phone!: HTMLInputElement;
  let submit!: HTMLButtonElement;
  const savedEmail = () => normalizeFields({ email: draft.value('email') }).email;
  const editEmail = () => draft.save({ email: email.value });
  const editPhone = (event: Event) => draft.save({ phone: updatePhoneInput(phone, event) });
  createEffect(() => {
    if (consentedEmail() && consentedEmail() !== savedEmail()) setConsentedEmail(undefined);
  });

  return <form id={estimateFormIds.hero} class="hero-estimate rounded" aria-labelledby="hero-estimate-title" action="/contact#estimate-contact" noValidate onSubmit={event => {
    event.preventDefault();
    const fields = { email: email.value, phone: updatePhoneInput(phone) };
    draft.save(fields);
    const contact = normalizeFields(fields);
    const problems = validateFields(contact);
    setErrors({ email: problems.email, phone: problems.phone });
    if (problems.email || problems.phone) {
      (problems.email ? email : phone).focus();
      return;
    }
    const project = props.category ? { category: props.category } : {};
    openEstimate?.(submit, props.category ? 'services' : 'hero',
      { ...project, marketingOptIn: consentedEmail() === contact.email }, () => setConsentedEmail(undefined));
  }}>
    <h2 id="hero-estimate-title">Transform Your Home with Expert Remodeling Services</h2>
    <label for="hero-email">Email</label>
    <input ref={email} id="hero-email" class="rounded" type="email" autocomplete="email" maxlength={254} required placeholder="jane@example.com" aria-invalid={!!errors().email} aria-describedby={errors().email ? 'hero-email-error' : undefined}
      value={draft.value('email') ?? ''} onInput={editEmail} onChange={editEmail} />
    <Show when={errors().email}><p class="field-error" id="hero-email-error" role="alert">{errors().email}</p></Show>
    <label for="hero-phone">Phone</label>
    <input ref={phone} id="hero-phone" class="rounded" type="tel" autocomplete="tel" required placeholder={phonePlaceholder}
      aria-invalid={!!errors().phone} aria-describedby={errors().phone ? 'hero-phone-error' : undefined}
      value={draft.value('phone') ?? ''} onBeforeInput={rememberPhoneEdit} onInput={editPhone} onChange={editPhone} onPaste={editPhone} />
    <Show when={errors().phone}><p class="field-error" id="hero-phone-error" role="alert">{errors().phone}</p></Show>
    <MarketingEmailCheckbox checked={consentedEmail() === savedEmail()} onChange={checked => setConsentedEmail(checked ? savedEmail() : undefined)} />
    <div class="hero-estimate-actions">
      <button ref={submit} type="submit" class="button button-primary quote-action rounded"><QuoteLabel /> <Icon name="chevron-right" size={18} /></button>
    </div>
    <FormDisclosure />
  </form>;
}

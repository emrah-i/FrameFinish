import { createSignal, For } from 'solid-js';
import { estimateFormIds, normalizeFields, validateFields, zipPlaceholder } from '../../shared/estimates';
import { Icon } from '../Icon';
import { EstimateTrigger, QuoteLabel, useEstimate } from './Estimate';
import FieldErrorTooltip from './FieldErrorTooltip';
import { useFormDraft } from './form-draft';
import { phonePlaceholder, rememberPhoneEdit, updatePhoneInput } from './phone';

const fields = [
  { name: 'name', label: 'Full Name', type: 'text', autocomplete: 'name', maxLength: 100, placeholder: 'Jane Smith' },
  { name: 'email', label: 'Email', type: 'email', autocomplete: 'email', maxLength: 254, placeholder: 'jane@example.com' },
  { name: 'phone', label: 'Phone', type: 'tel', autocomplete: 'tel', maxLength: undefined, placeholder: phonePlaceholder },
  { name: 'zip', label: 'ZIP Code', type: 'text', autocomplete: 'postal-code', maxLength: 5, placeholder: zipPlaceholder },
] as const;
type StickyField = typeof fields[number]['name'];

export function StickyEstimate(props: { visible: boolean; category?: string }) {
  const openEstimate = useEstimate();
  const draft = useFormDraft();
  const [errors, setErrors] = createSignal<Partial<Record<StickyField, string>>>({});
  const [attempt, setAttempt] = createSignal(0);
  let phoneInput!: HTMLInputElement;
  const project = () => props.category ? { category: props.category } : {};

  function editPhone(event: Event) {
    draft.save({ phone: updatePhoneInput(phoneInput, event) });
    clearError('phone');
  }

  function clearError(field: StickyField) {
    if (errors()[field]) setErrors(current => ({ ...current, [field]: undefined }));
  }

  function continueEstimate(event: SubmitEvent) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const opener = event.submitter ?? form.querySelector('button');
    const input = new FormData(form);
    const value = (key: string) => String(input.get(key) ?? '');
    const contactFields = { name: value('name'), email: value('email'), zip: value('zip'), phone: updatePhoneInput(phoneInput) };
    draft.save(contactFields);
    const problems = validateFields(normalizeFields(contactFields));
    const fieldErrors: Partial<Record<StickyField, string>> = { name: problems.name, email: problems.email, phone: problems.phone, zip: problems.zip };
    setErrors(fieldErrors);
    const invalid = fields.find(field => fieldErrors[field.name]);
    if (invalid) {
      setAttempt(previous => previous + 1);
      form.querySelector<HTMLInputElement>(`input[name="${invalid.name}"]`)?.focus();
      return;
    }
    if (opener instanceof HTMLElement && openEstimate?.(opener, 'sticky', project())) return;
    window.location.assign('/contact#estimate-contact');
  }

  return <div class="sticky-estimate" hidden={!props.visible}>
    <form id={estimateFormIds.sticky} class="shell sticky-estimate-form gap-6" method="post" action="/api/estimates" aria-label="Quick quote request" data-reveal-on-open="" noValidate onSubmit={continueEstimate}>
      <fieldset class="sticky-estimate-fields gap-6">
        <legend class="sr-only">Contact and Project Details</legend>
        <For each={fields}>{field => {
          const inputId = `sticky-${field.name}`;
          const error = () => errors()[field.name];
          function edit(event: Event & { currentTarget: HTMLInputElement }) {
            if (field.name === 'phone') editPhone(event);
            else {
              draft.save({ [field.name]: event.currentTarget.value });
              clearError(field.name);
            }
          }
          return <div class="sticky-estimate-field">
            <label for={inputId}>
              <span>{field.label}</span>
              <input ref={input => { if (field.name === 'phone') phoneInput = input; }} class="rounded" name={field.name} type={field.type} autocomplete={field.autocomplete} maxlength={field.maxLength} placeholder={field.placeholder} inputmode={field.name === 'zip' ? 'numeric' : undefined}
                id={inputId} required aria-invalid={error() ? true : undefined}
                aria-describedby={error() ? `${inputId}-error` : undefined}
                value={draft.value(field.name) ?? ''}
                onBeforeInput={field.name === 'phone' ? rememberPhoneEdit : undefined} onInput={edit} onChange={edit}
                onPaste={field.name === 'phone' ? editPhone : undefined} />
            </label>
            <FieldErrorTooltip id={`${inputId}-error`} message={error()} attempt={attempt()} />
          </div>;
        }}</For>
      </fieldset>
      <button type="submit" class="button button-primary quote-action rounded"><QuoteLabel /><Icon name="chevron-right" /></button>
    </form>
    <div class="shell sticky-estimate-compact"><EstimateTrigger class="button button-primary" source="sticky" prefill={project} /></div>
  </div>;
}

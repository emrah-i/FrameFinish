import { createContext, createEffect, createSignal, For, onCleanup, onMount, Show, useContext, type ParentProps } from 'solid-js';
import { disclosure, disclosureVersion, displayedCategories, marketingConsentText, marketingConsentVersion, site } from '../../shared/content';
import { descriptionLimit, estimateFormIds, normalizeFields, validateFields, zipPlaceholder, type EstimateFields, type EstimateSource, type FieldErrors } from '../../shared/estimates';
import { Icon } from '../Icon';
import FieldErrorTooltip from './FieldErrorTooltip';
import { FormDraftProvider, useFormDraft } from './form-draft';
import { phonePlaceholder, rememberPhoneEdit, updatePhoneInput } from './phone';
import { loadTurnstile } from './Turnstile';

type ProjectPrefill = Partial<Pick<EstimateFields, 'category' | 'description'>>;
type OpenEstimate = (opener: HTMLElement, source: EstimateSource, prefill?: ProjectPrefill) => boolean;
const EstimateContext = createContext<OpenEstimate>();

export function useEstimate() {
  return useContext(EstimateContext);
}

export function QuoteLabel(props: { freeClass?: string; titleCase?: boolean }) {
  return <span>Get a <span class={props.freeClass}>FREE</span> {props.titleCase ? 'Quote' : 'quote'}</span>;
}

export function MarketingEmailCheckbox(props: { checked: boolean; onChange: (checked: boolean) => void }) {
  return <label class="marketing-email-choice">
    <span class="marketing-email-control">
      <input class="rounded" type="checkbox" checked={props.checked} onChange={event => props.onChange(event.currentTarget.checked)} />
      <Icon name="check" size={12} />
    </span>
    <span>{marketingConsentText}</span>
  </label>;
}

export function FormDisclosure() {
  return <p class="form-disclosure">{disclosure} <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>.</p>;
}

export function EstimateTrigger(props: ParentProps<{ source: EstimateSource; class: string; prefill?: () => ProjectPrefill; onOpen?: () => void }>) {
  const open = useEstimate();
  return <a class={`${props.class} quote-action rounded`} href="/contact#estimate-contact" aria-label={props.source === 'header' ? 'Get a FREE quote' : undefined} onClick={event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    if (open?.(event.currentTarget, props.source, props.prefill?.())) {
      event.preventDefault();
      props.onOpen?.();
    }
  }}>
    {props.children ?? (props.source === 'header'
      ? <><span class="estimate-label-wide"><QuoteLabel /></span><span class="estimate-label-compact">FREE quote</span></>
      : <QuoteLabel />)}
    <Icon name="chevron-right" />
  </a>;
}

const fieldConfig = [
  { name: 'name', label: 'Full Name', type: 'text', autocomplete: 'name', maxlength: 100, placeholder: 'Jane Smith' },
  { name: 'email', label: 'Email', type: 'email', autocomplete: 'email', maxlength: 254, placeholder: 'jane@example.com' },
  { name: 'phone', label: 'Phone', type: 'tel', autocomplete: 'tel', maxlength: undefined, placeholder: phonePlaceholder },
  { name: 'zip', label: 'Project ZIP Code', type: 'text', autocomplete: 'postal-code', maxlength: 5, placeholder: zipPlaceholder },
] as const;

type Receipt = { reference?: string; preview?: boolean };
type EstimateResponse = Receipt & { message?: string; fields?: FieldErrors; refreshToken?: boolean };
type FormControls = {
  prepare: (source: EstimateSource, prefill?: ProjectPrefill) => void;
  close: () => void;
};
type ModalForm = {
  isOpen: () => boolean;
  close: () => void;
  register: (controls: FormControls) => void;
};

function EstimateForm(props: { prefix: string; modal?: ModalForm; contact?: boolean; category?: string }) {
  const [ready, setReady] = createSignal(false);
  const draft = useFormDraft();
  const [suggested, setSuggested] = createSignal<ProjectPrefill>({});
  const detailsField = props.contact ? 'message' : 'description';
  const category = () => props.contact ? '' : suggested().category ?? draft.value('category') ?? props.category ?? '';
  const description = () => draft.value(detailsField) ?? suggested().description ?? '';
  const [errors, setErrors] = createSignal<FieldErrors>({});
  const [attempt, setAttempt] = createSignal(0);
  const [message, setMessage] = createSignal('');
  const [pending, setPending] = createSignal(false);
  const [receipt, setReceipt] = createSignal<Receipt>();
  const [verificationError, setVerificationError] = createSignal(false);
  const [token, setToken] = createSignal('');
  const email = () => normalizeFields({ email: draft.value('email') }).email;
  const [consentedEmail, setConsentedEmail] = createSignal<string>();
  createEffect(() => {
    if (consentedEmail() && consentedEmail() !== email()) setConsentedEmail(undefined);
  });
  const isActive = () => props.modal?.isOpen() ?? true;
  const id = (name: string) => `${props.prefix}-${name}`;
  const formId = props.modal ? estimateFormIds.modal : props.contact ? estimateFormIds.contact : estimateFormIds.inline;
  let verification!: HTMLDivElement;
  let phoneInput!: HTMLInputElement;
  const editPhone = (event: Event) => draft.save({ phone: updatePhoneInput(phoneInput, event) });
  let source: EstimateSource = props.contact ? 'contact' : 'inline';
  let latest: { key: string; fingerprint: string; consentedAt?: string } | undefined;
  let removeWidget: (() => void) | undefined;
  let verificationVersion = 0;
  let verificationStarted = false;

  function clearVerification() {
    verificationVersion++;
    verificationStarted = false;
    removeWidget?.();
    removeWidget = undefined;
    setToken('');
    setVerificationError(false);
  }

  async function showVerification() {
    clearVerification();
    if (!site.turnstileSiteKey || !isActive()) return;
    verificationStarted = true;
    const version = verificationVersion;
    try {
      const api = await loadTurnstile();
      if (version !== verificationVersion || !isActive()) return;
      const widget = api.render(verification, {
        sitekey: site.turnstileSiteKey,
        action: 'estimate',
        callback: setToken,
        'error-callback': () => { setToken(''); setVerificationError(true); },
        'expired-callback': () => setToken(''),
      });
      removeWidget = () => api.remove(widget);
    } catch {
      if (version === verificationVersion) setVerificationError(true);
    }
  }

  function startVerification() {
    if (site.turnstileSiteKey && !verificationStarted) void showVerification();
  }

  onMount(() => setReady(true));
  onCleanup(clearVerification);
  props.modal?.register({
    prepare(nextSource, prefill) {
      if (pending() || receipt()) return;
      source = nextSource;
      setSuggested(prefill ?? {});
      setConsentedEmail(undefined);
      setErrors({});
      setMessage('');
      queueMicrotask(() => { if (isActive()) startVerification(); });
    },
    close() {
      clearVerification();
      setReceipt(undefined);
    },
  });

  function focus(name: string) {
    queueMicrotask(() => {
      if (isActive()) document.getElementById(id(name))?.focus();
    });
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!ready() || pending()) return;
    const data = new FormData(event.target as HTMLFormElement);
    const get = (field: keyof EstimateFields) => String(data.get(field) ?? '');
    const fields = {
      name: get('name'), email: get('email'), phone: updatePhoneInput(phoneInput), zip: get('zip'),
      category: get('category'), description: get('description'),
    };
    const changes: Partial<EstimateFields> & { message?: string } = {};
    for (const { name } of fieldConfig) {
      if (fields[name] !== (draft.value(name) ?? '')) changes[name] = fields[name];
    }
    if (fields.category !== category()) changes.category = fields.category;
    if (fields.description !== description()) changes[detailsField] = fields.description;
    if (Object.keys(changes).length) draft.save(changes);
    const values = normalizeFields(fields);
    const fieldErrors = validateFields(values, props.contact);
    setErrors(fieldErrors);
    setMessage('');
    const invalid = Object.keys(fieldErrors) as (keyof EstimateFields)[];
    if (invalid.length) {
      setAttempt(previous => previous + 1);
      focus(invalid[0]);
      return;
    }
    if (site.turnstileSiteKey && !token()) {
      startVerification();
      setMessage('Complete verification before sending your request.');
      focus('error');
      return;
    }
    const consent = consentedEmail() === values.email ? marketingConsentVersion : undefined;
    const fingerprint = JSON.stringify({ ...values, source, consent });
    if (latest?.fingerprint !== fingerprint) latest = {
      key: crypto.randomUUID(), fingerprint, consentedAt: consent ? new Date().toISOString() : undefined,
    };
    const clearSubmittedDraft = draft.clearProjectAfterSuccess();
    setPending(true);
    try {
      const response = await fetch('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values, key: latest.key, formId, source, disclosureVersion, marketingConsentVersion: consent,
          marketingConsentedAt: latest.consentedAt, token: token(),
          website: data.get('website') || '',
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const result = await response.json() as EstimateResponse;
      if (!response.ok) {
        setErrors(result.fields ?? {});
        const firstInvalidField = Object.keys(result.fields ?? {})[0];
        if (firstInvalidField) setAttempt(previous => previous + 1);
        setMessage(response.status === 400 && firstInvalidField ? '' : result.message || 'Try again or contact us by email.');
        if (response.status === 409) latest = undefined;
        if (result.refreshToken || site.turnstileSiteKey) void showVerification();
        focus(firstInvalidField ?? 'error');
        return;
      }
      clearVerification();
      setReceipt(result);
      setSuggested({});
      clearSubmittedDraft();
      setConsentedEmail(undefined);
      latest = undefined;
      focus('receipt');
    } catch {
      setMessage('We couldn\'t confirm your request. Please try again or contact us by email.');
      void showVerification();
      focus('error');
    } finally {
      setPending(false);
    }
  }

  const attrs = (field: keyof EstimateFields, descriptionId?: string) => ({
    id: id(field),
    name: field,
    'aria-invalid': errors()[field] ? true : undefined,
    'aria-describedby': [descriptionId, errors()[field] ? id(`${field}-error`) : undefined].filter(Boolean).join(' ') || undefined,
  });
  function FieldError(props: { field: keyof EstimateFields }) {
    return <FieldErrorTooltip id={id(`${props.field}-error`)} message={errors()[props.field]} attempt={attempt()} />;
  }

  return <div class={props.modal ? 'modal-estimate-form' : 'bottom-estimate-form'}>
    <Show when={!receipt()} fallback={<div class="estimate-feedback" role="status">
      <h3 id={id('receipt')} tabindex="-1">{receipt()?.preview ? 'Preview Request Accepted' : props.contact ? 'We Received Your Message' : 'We Received Your Request'}</h3>
      <p>{receipt()?.preview ? 'No notifications were sent and no request was stored.' : props.contact ? 'Our team will follow up with you.' : 'Our team will review your project and contact you about next steps.'}</p>
      <Show when={receipt()?.reference}><p>Reference <strong>{receipt()?.reference}</strong></p></Show>
      <Show when={props.modal}><button type="button" class="button button-primary rounded" onClick={() => props.modal?.close()}>Done</button></Show>
    </div>}>
      <form id={formId} method="post" action="/api/estimates" aria-label={props.contact ? 'Send a message' : 'Quote request'} noValidate onSubmit={submit} onFocusIn={startVerification} aria-busy={pending()}>
        <fieldset class="estimate-form-fields" disabled={!ready()}>
          <legend class="sr-only">Contact and Project Details</legend>
          <div class="dialog-fields">
            <For each={fieldConfig}>{field => {
              function edit(event: Event & { currentTarget: HTMLInputElement }) {
                if (field.name === 'phone') editPhone(event);
                else if ((draft.value(field.name) ?? '') !== event.currentTarget.value) {
                  draft.save({ [field.name]: event.currentTarget.value });
                }
              }
              return <div class="dialog-field">
                <label for={id(field.name)}>{props.contact && field.name === 'zip' ? 'ZIP Code' : field.label}</label>
                <input ref={input => { if (field.name === 'phone') phoneInput = input; }} {...attrs(field.name)} class="rounded" type={field.type} autocomplete={field.autocomplete} maxlength={field.maxlength} inputmode={field.name === 'zip' ? 'numeric' : undefined} placeholder={field.placeholder} required value={draft.value(field.name) ?? ''}
                  onBeforeInput={field.name === 'phone' ? rememberPhoneEdit : undefined}
                  onChange={edit} onPaste={field.name === 'phone' ? editPhone : undefined} onInput={edit} />
                <FieldError field={field.name} />
              </div>;
            }}</For>
            <Show when={!props.contact}><div class="dialog-field dialog-field-full">
              <label for={id('category')}>Project Type</label>
              <select {...attrs('category')} class="rounded" required onChange={event => {
                draft.save({ category: event.currentTarget.value });
                setSuggested(project => ({ ...project, category: undefined }));
              }}>
                <option value="" selected={category() === ''}>Select project type</option>
                <For each={displayedCategories}>{item => <option value={item.id} selected={category() === item.id}>{item.name}</option>}</For>
                <option value="unsure" selected={category() === 'unsure'}>Not sure</option>
              </select>
              <FieldError field="category" />
            </div></Show>
            <div class="dialog-field dialog-field-full">
              <label for={id('description')}>{props.contact ? 'Message' : 'What would you like remodeled?'}</label>
              <div class="field-tooltip-anchor">
                <textarea {...attrs('description', props.contact ? undefined : id('description-count'))} class="rounded" required rows={props.contact ? 6 : 3} maxlength={descriptionLimit} placeholder={props.contact ? 'Tell us how we can help.' : 'Tell us about the rooms and changes you have in mind.'} value={description()}
                  onInput={event => draft.save({ [detailsField]: event.currentTarget.value })} />
                <FieldError field="description" />
              </div>
              <Show when={!props.contact}>
                <p class="description-count" id={id('description-count')}>{description().length.toLocaleString('en-US')} / {descriptionLimit.toLocaleString('en-US')}</p>
              </Show>
            </div>
          </div>
          <MarketingEmailCheckbox checked={consentedEmail() === email()} onChange={checked => setConsentedEmail(checked ? email() : undefined)} />
          <div class="honeypot" aria-hidden="true"><label>Website<input class="rounded" tabindex="-1" name="website" autocomplete="off" /></label></div>
          <div ref={verification} />
          <Show when={verificationError()}><button type="button" class="text-action rounded" onClick={() => void showVerification()}>Retry verification</button></Show>
          <Show when={message()}><p class="form-error rounded" id={id('error')} tabindex="-1" role="alert">{message()}</p></Show>
          <button type="submit" class="button button-primary rounded" classList={{ 'quote-action': !props.contact }} disabled={!ready() || pending()}>{pending() ? 'Sending…' : props.contact ? 'Send Message' : <QuoteLabel />} <Icon name="chevron-right" /></button>
          <FormDisclosure />
        </fieldset>
      </form>
    </Show>
  </div>;
}

export function BottomEstimateForm(props: { category?: string }) {
  return <EstimateForm prefix="bottom-estimate" category={props.category} />;
}

export function ContactForm() {
  return <EstimateForm prefix="contact" contact />;
}

export function EstimateProvider(props: ParentProps) {
  let dialog!: HTMLDialogElement;
  let title!: HTMLHeadingElement;
  let opener: HTMLElement | undefined;
  let form: FormControls | undefined;

  const open: OpenEstimate = (trigger, source, prefill) => {
    if (typeof dialog?.showModal !== 'function' || !form) return false;
    form.prepare(source, prefill);
    opener = trigger;
    if (!dialog.open) dialog.showModal();
    title.focus();
    return true;
  };

  const close = () => dialog.close();

  function afterClose() {
    form?.close();
    opener?.focus({ preventScroll: true });
    if (opener && document.activeElement !== opener) {
      for (const selector of ['.sticky-estimate:not([hidden]) button[type=submit]', '.sticky-estimate:not([hidden]) .sticky-estimate-compact a', '.header-estimate', '.menu-toggle', '.site-header .wordmark']) {
        const target = document.querySelector<HTMLElement>(selector);
        target?.focus({ preventScroll: true });
        if (document.activeElement === target) break;
      }
    }
  }

  return <FormDraftProvider><EstimateContext.Provider value={open}>
    {props.children}
    <dialog ref={dialog} class="estimate-dialog rounded" aria-labelledby="estimate-title" data-reveal-on-open="" onClose={afterClose}>
      <div class="dialog-head">
        <h2 ref={title} tabindex="-1" id="estimate-title"><QuoteLabel freeClass="estimate-free-mark" titleCase /></h2>
        <button class="dialog-close rounded" type="button" aria-label="Close quote request" onClick={close}><Icon name="close" /></button>
      </div>
      <EstimateForm prefix="estimate" modal={{ isOpen: () => dialog.open, close, register: controls => { form = controls; } }} />
    </dialog>
  </EstimateContext.Provider></FormDraftProvider>;
}

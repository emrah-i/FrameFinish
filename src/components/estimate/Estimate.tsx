import { createContext, createEffect, createSignal, For, onCleanup, onMount, Show, useContext, type ParentProps } from 'solid-js';
import { disclosureVersion, displayedCategories, marketingConsentText, marketingConsentVersion, site } from '../../shared/content';
import { descriptionLimit, estimateFormIds, normalizeFields, validateFields, zipPlaceholder, type EstimateFields, type EstimateSource, type FieldErrors } from '../../shared/estimates';
import { Icon } from '../Icon';
import FieldErrorTooltip from './FieldErrorTooltip';
import { FormDraftProvider, useFormDraft } from './form-draft';
import { phonePlaceholder, rememberPhoneEdit, updatePhoneInput } from './phone';
import { loadTurnstile } from './Turnstile';

type ProjectPrefill = Partial<Pick<EstimateFields, 'category'>>;
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
  { name: 'phone', label: 'Phone Number', type: 'tel', autocomplete: 'tel', maxlength: undefined, placeholder: phonePlaceholder },
  { name: 'email', label: 'Email Address', type: 'email', autocomplete: 'email', maxlength: 254, placeholder: 'jane@example.com' },
  { name: 'zip', label: 'ZIP Code', type: 'text', autocomplete: 'postal-code', maxlength: 5, placeholder: zipPlaceholder },
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

export function EstimateForm(props: { prefix: string; modal?: ModalForm; contact?: boolean; category?: string; variant?: 'hero' | 'sticky' }) {
  const [ready, setReady] = createSignal(false);
  const draft = useFormDraft();
  const [suggested, setSuggested] = createSignal<ProjectPrefill>({});
  const category = () => suggested().category ?? draft.value('category') ?? props.category ?? '';
  const description = () => props.contact ? draft.value('message') ?? '' : '';
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
  const formId = props.modal ? estimateFormIds.modal : props.contact ? estimateFormIds.contact : props.variant ? estimateFormIds[props.variant] : estimateFormIds.inline;
  let verification!: HTMLDivElement;
  let phoneInput!: HTMLInputElement;
  const editPhone = (event: Event) => draft.save({ phone: updatePhoneInput(phoneInput, event) });
  let source: EstimateSource = props.contact ? 'contact' : props.variant === 'hero' ? (props.category ? 'services' : 'hero') : props.variant ?? 'inline';
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
    if (props.contact && fields.description !== description()) changes.message = fields.description;
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

  return <div class={props.variant === 'hero' ? 'hero-estimate rounded' : props.variant === 'sticky' ? 'sticky-estimate-desktop shell' : props.modal ? 'modal-estimate-form' : 'bottom-estimate-form'}>
    <Show when={props.variant === 'hero'}>
      <h2 id="hero-estimate-title">Transform Your Home with Expert Remodeling Services</h2>
      <p class="hero-estimate-intro">Tell us how to reach you, and we'll call to discuss your remodeling project.</p>
    </Show>
    <Show when={!receipt()} fallback={<div class="estimate-feedback" role="status">
      <h3 id={id('receipt')} tabindex="-1">{receipt()?.preview ? 'Preview Request Accepted' : props.contact ? 'We Received Your Message' : 'We Received Your Request'}</h3>
      <p>{receipt()?.preview ? 'No notifications were sent and no request was stored.' : props.contact ? 'Our team will follow up with you.' : 'Our team will review your project and contact you about next steps.'}</p>
      <Show when={receipt()?.reference}><p>Reference <strong>{receipt()?.reference}</strong></p></Show>
      <Show when={props.modal}><button type="button" class="button button-primary rounded" onClick={() => props.modal?.close()}>Done</button></Show>
    </div>}>
      <form id={formId} class={props.variant === 'sticky' ? 'sticky-estimate-form' : undefined} method="post" action="/api/estimates" aria-label={props.contact ? 'Send a message' : props.variant === 'sticky' ? 'Quick quote request' : props.variant === 'hero' ? 'Hero quote request' : 'Quote request'} noValidate onSubmit={submit} onFocusIn={startVerification} aria-busy={pending()}>
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
              return <div class="dialog-field" classList={{ 'dialog-field-full': field.name === 'name' }}>
                <label for={id(field.name)}>{field.label}</label>
                <input ref={input => { if (field.name === 'phone') phoneInput = input; }} {...attrs(field.name)} class="rounded" type={field.type} autocomplete={field.autocomplete} maxlength={field.maxlength} inputmode={field.name === 'zip' ? 'numeric' : undefined} placeholder={field.placeholder} required value={draft.value(field.name) ?? ''}
                  onBeforeInput={field.name === 'phone' ? rememberPhoneEdit : undefined}
                  onChange={edit} onPaste={field.name === 'phone' ? editPhone : undefined} onInput={edit} />
                <FieldError field={field.name} />
              </div>;
            }}</For>
            <div class="dialog-field">
              <label for={id('category')}>Project Type</label>
              <select {...attrs('category')} class="rounded" required onChange={event => {
                draft.save({ category: event.currentTarget.value });
                setSuggested(project => ({ ...project, category: undefined }));
              }}>
                <option value="" selected={category() === ''}>Select Type</option>
                <For each={displayedCategories}>{item => <option value={item.id} selected={category() === item.id}>{item.name}</option>}</For>
                <option value="other" selected={category() === 'other'}>Other</option>
              </select>
              <FieldError field="category" />
            </div>
            <Show when={props.contact}><div class="dialog-field dialog-field-full">
              <label for={id('description')}>Message</label>
              <div class="field-tooltip-anchor">
                <textarea {...attrs('description')} class="rounded" required rows={6} maxlength={descriptionLimit} placeholder="Tell us how we can help." value={description()}
                  onInput={event => draft.save({ message: event.currentTarget.value })} />
                <FieldError field="description" />
              </div>
            </div></Show>
          </div>
          {/* Marketing emails are paused; uncomment to restore opt-in.
          <MarketingEmailCheckbox checked={consentedEmail() === email()} onChange={checked => setConsentedEmail(checked ? email() : undefined)} />
          */}
          <div class="honeypot" aria-hidden="true"><label>Website<input class="rounded" tabindex="-1" name="website" autocomplete="off" /></label></div>
          <div ref={verification} />
          <Show when={verificationError()}><button type="button" class="text-action rounded" onClick={() => void showVerification()}>Retry verification</button></Show>
          <Show when={message()}><p class="form-error rounded" id={id('error')} tabindex="-1" role="alert">{message()}</p></Show>
          <button type="submit" class="button button-primary quote-action rounded" disabled={!ready() || pending()}>{pending() ? 'Sending…' : <QuoteLabel />} <Icon name="chevron-right" /></button>
          <Show when={props.variant !== 'sticky'}>
            <p class="form-contact-notice">We’ll use the information you provide to contact you by phone or email about your inquiry.</p>
          </Show>
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

import { disclosureVersion, displayedCategories, marketingConsentVersion } from './content';

export const estimateSources = ['header', 'hero', 'services', 'banner', 'sticky', 'inline', 'footer', 'contact'] as const;
export type EstimateSource = typeof estimateSources[number];
export const estimateFormIds = {
  hero: 'hero-estimate-form',
  sticky: 'sticky-estimate-form',
  modal: 'estimate-modal-form',
  inline: 'bottom-estimate-form',
  contact: 'contact-form',
} as const;
export type EstimateFields = { name: string; email: string; phone: string; zip: string; category: string; description: string };
export type FieldErrors = Partial<Record<keyof EstimateFields, string>>;
export const descriptionLimit = 2000;
export const zipPlaceholder = '75201';
export const previousDisclosureVersion = 'intake-v2';
export const reviewDisclosureVersion = 'intake-v3';
export type EstimateRequest = EstimateFields & {
  key: string;
  source: EstimateSource;
  formId: typeof estimateFormIds[keyof typeof estimateFormIds] | 'legacy-estimate-form';
  disclosureVersion: typeof disclosureVersion | typeof previousDisclosureVersion | typeof reviewDisclosureVersion;
  marketingConsentVersion?: typeof marketingConsentVersion;
  marketingConsentedAt?: string;
  token?: string;
  website?: string;
};

export const emptyEstimate: EstimateFields = { name: '', email: '', phone: '', zip: '', category: '', description: '' };
export const fieldNames = Object.keys(emptyEstimate) as (keyof EstimateFields)[];
const fields = new Set([...fieldNames, 'key', 'source', 'formId', 'disclosureVersion', 'marketingConsentVersion', 'marketingConsentedAt', 'token', 'website']);
const categories = new Set(['other', 'unsure', ...displayedCategories.map(category => category.id)]);
const sources = new Set<string>(estimateSources);
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const control = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
const emailAddress = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim().normalize('NFC') : '';
}

export function normalizeFields(input: Partial<Record<keyof EstimateFields, unknown>>): EstimateFields {
  return {
    name: clean(input.name),
    email: clean(input.email).toLowerCase(),
    phone: clean(input.phone),
    zip: clean(input.zip),
    category: clean(input.category),
    description: clean(input.description).replace(/\r\n?/g, '\n'),
  };
}

export function validateFields(input: EstimateFields, contact = false): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.name || input.name.length > 100 || /[\r\n\t]/.test(input.name)) errors.name = 'Enter your name (up to 100 characters)';
  const phoneDigits = input.phone.replace(/\D/g, '');
  const completePhone = phoneDigits.length === 10 ? !input.phone.startsWith('+') : /^1\d{10}$/.test(phoneDigits);
  if (input.phone.length > 30 || !/^(?:\+1)?[\d ().-]+$/.test(input.phone) || !completePhone) {
    errors.phone = 'Enter a valid phone number';
  }
  if (input.email.length > 254 || !emailAddress.test(input.email)) errors.email = 'Enter a valid email address';
  if (!/^\d{5}$/.test(input.zip)) errors.zip = contact ? 'Enter a five-digit ZIP code' : 'Enter the five-digit ZIP code for your project';
  if (!categories.has(input.category)) errors.category = 'Select a project type or “Other”';
  if (input.description.length < (contact ? 10 : 0) || input.description.length > descriptionLimit) {
    errors.description = contact ? 'Enter a message in 10-2,000 characters' : 'Keep project details under 2,000 characters';
  }
  for (const name of fieldNames) if (control.test(input[name])) errors[name] = 'Remove unsupported characters';
  return errors;
}

type Validation = { ok: true; data: EstimateRequest } | { ok: false; message: string; fields?: FieldErrors };

export function validateEstimate(value: unknown): Validation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, message: 'Send a valid estimate request.' };
  const input = value as Record<string, unknown>;
  if (Object.entries(input).some(([key, item]) => !fields.has(key) || typeof item !== 'string')) {
    return { ok: false, message: 'Send a valid estimate request.' };
  }
  const data = normalizeFields(input);
  const version = input.disclosureVersion;
  if ((version !== disclosureVersion && version !== previousDisclosureVersion && version !== reviewDisclosureVersion) || !uuid.test(clean(input.key)) || typeof input.source !== 'string' || !sources.has(input.source)) {
    return { ok: false, message: 'Refresh the page before trying again.' };
  }
  const source = input.source as EstimateSource;
  const contact = source === 'contact' && input.formId === estimateFormIds.contact && version === disclosureVersion;
  const directForm = version === disclosureVersion && (
    (input.formId === estimateFormIds.hero && (source === 'hero' || source === 'services')) ||
    (input.formId === estimateFormIds.sticky && source === 'sticky')
  );
  const expectedForm = contact ? estimateFormIds.contact : source === 'inline' ? estimateFormIds.inline : estimateFormIds.modal;
  const formId = input.formId ?? (source === 'banner' ? 'legacy-estimate-form' : expectedForm);
  if ((input.formId !== undefined && input.formId !== expectedForm && !directForm) ||
      ((source === 'inline' || source === 'sticky') && input.formId === undefined)) {
    return { ok: false, message: 'Refresh the page before trying again.' };
  }
  const errors = validateFields(data, contact);
  // Older Contact pages did not collect a project type.
  if (contact && !data.category) delete errors.category;
  if (Object.keys(errors).length) return { ok: false, message: 'Check the highlighted fields.', fields: errors };
  const consent = input.marketingConsentVersion;
  if (consent !== undefined && (consent !== marketingConsentVersion ||
      (version !== disclosureVersion && (version !== reviewDisclosureVersion || source !== 'hero')))) {
    return { ok: false, message: 'Refresh the page before trying again.' };
  }
  const consentedAt = typeof input.marketingConsentedAt === 'string' ? input.marketingConsentedAt : undefined;
  if (consentedAt !== undefined && (!consent || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(consentedAt) ||
      !Number.isFinite(Date.parse(consentedAt)) || Date.parse(consentedAt) > Date.now() + 300_000)) {
    return { ok: false, message: 'Refresh the page before trying again.' };
  }
  const token = clean(input.token);
  if (token.length > 2048) return { ok: false, message: 'Please retry verification.' };
  return { ok: true, data: { ...data, key: clean(input.key).toLowerCase(), source, formId: formId as EstimateRequest['formId'], disclosureVersion: version, marketingConsentVersion: consent, marketingConsentedAt: consentedAt, token } };
}

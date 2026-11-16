import { disclosure, displayedCategories, marketingConsentText, site } from '../shared/content';
import { estimateFormIds, previousDisclosureVersion, reviewDisclosureVersion, type EstimateRequest, type EstimateSource } from '../shared/estimates';
import type { Env } from './env';

const previousDisclosure = 'Frame & Finish will use these details to review and respond to your request. We’ll ask your permission before sharing project details with another business.';
const reviewDisclosure = 'We use your information to review your project, check coverage, and follow up with you.';
const sources: Record<EstimateSource, string> = {
  hero: 'Homepage hero (' + estimateFormIds.hero + ')',
  sticky: 'Sticky estimate bar (' + estimateFormIds.sticky + ')',
  inline: 'Bottom of homepage (' + estimateFormIds.inline + ')',
  banner: 'Legacy homepage estimate form or sticky bar',
  header: 'Header estimate button',
  services: 'Service estimate',
  footer: 'Footer estimate button',
  contact: 'Contact page estimate button',
};

export async function sendEstimateEmails(env: Env, data: EstimateRequest, coverage: 'covered' | 'review') {
  const { RESEND_API_KEY: key, EMAIL_FROM: from, LEAD_EMAIL: recipient } = env;
  if (!key || !from || !recipient) return 'unavailable';
  const contact = data.formId === estimateFormIds.contact;
  const category = displayedCategories.find(item => item.id === data.category)?.name ?? 'Not sure';
  const intakeDisclosure = data.disclosureVersion === previousDisclosureVersion ? previousDisclosure
    : data.disclosureVersion === reviewDisclosureVersion ? reviewDisclosure : disclosure;
  const tags = [{ name: 'form_id', value: data.formId }, { name: 'source', value: data.source }];
  const details = [
    `Reference: ${data.key}`,
    `Form ID: ${data.formId}`,
    `Entry point: ${contact ? 'Contact page form' : sources[data.source]} [${data.source}]`,
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    `${contact ? 'ZIP code' : 'Project ZIP'}: ${data.zip}`,
    ...(contact ? [] : [
      `Project type: ${category} [${data.category}]`,
      `Coverage: ${coverage === 'covered' ? 'Covered' : 'Manual review'}`,
    ]),
    `Marketing email opt-in: ${data.marketingConsentVersion ? 'Yes' : 'No'}`,
    ...(data.marketingConsentVersion ? [
      `Marketing consent version: ${data.marketingConsentVersion}`,
      `Marketing consent wording: ${marketingConsentText}`,
      `Consent timestamp (UTC): ${data.marketingConsentedAt ?? 'See email timestamp for this older form'}`,
    ] : []),
    `Intake disclosure (${data.disclosureVersion}): ${intakeDisclosure}`,
    '',
    contact ? 'Message:' : 'Project description:',
    data.description,
  ].join('\n');

  try {
    const response = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `frame-finish/estimate/${data.key}`,
      },
      signal: AbortSignal.timeout(8_000),
      body: JSON.stringify([
        {
          from, to: [recipient], reply_to: data.email, tags,
          subject: `New Frame & Finish ${contact ? 'contact message' : 'estimate request'} [${data.formId}]`,
          text: details,
        },
        {
          from, to: [data.email], reply_to: site.email, tags,
          subject: `We received your Frame & Finish ${contact ? 'message' : 'estimate request'}`,
          text: `${contact ? 'Thanks for contacting us. Our team will follow up with you.' : 'We received your remodeling inquiry. Our team will review your project and contact you about next steps.'}\n\nReference: ${data.key}\n\n${site.businessName}`,
        },
      ]),
    });
    if (response.ok) {
      const result = await response.json<{ data?: { id?: unknown }[] }>();
      if (result.data?.length === 2 && result.data.every(item => typeof item?.id === 'string' && !!item.id)) return 'accepted';
    } else if (response.status === 409) {
      const result = await response.json<{ name?: string }>();
      if (result.name === 'invalid_idempotent_request') return 'changed';
    }
  } catch {
    // A timeout can follow provider acceptance. The next attempt uses the same key and payload.
  }
  return 'unavailable';
}

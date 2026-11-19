import { describe, expect, it } from 'vitest';
import { checkCoverage, disclosureVersion, marketingConsentVersion } from '../src/shared/content';
import { descriptionLimit, estimateFormIds, previousDisclosureVersion, reviewDisclosureVersion, validateEstimate } from '../src/shared/estimates';

const request = {
  name: ' Homeowner ',
  email: ' HomeOwner@example.invalid ',
  phone: '(614) 555-0142',
  zip: '43015',
  category: 'kitchen',
  description: 'Update the cabinets and lighting.\r\nKeep the existing layout.',
  key: '472e8c2d-74af-4791-b8ea-a2d880405e3b',
  source: 'hero',
  disclosureVersion,
};

describe('estimate intake', () => {
  it('normalizes contact details and preserves project description lines', () => {
    const result = validateEstimate(request);
    expect(result).toMatchObject({
      ok: true,
      data: { name: 'Homeowner', email: 'homeowner@example.invalid', description: 'Update the cabinets and lighting.\nKeep the existing layout.' },
    });
  });

  it('rejects unpublished categories, incomplete contact details and invalid ZIPs', () => {
    const result = validateEstimate({ ...request, category: 'outdoors', email: 'homeowner', zip: '430' });
    expect(result).toMatchObject({ ok: false, fields: { category: expect.any(String), email: expect.any(String), zip: expect.any(String) } });
  });

  it('requires a nonblank name, one email address, a five-digit ZIP, and a project selection', () => {
    const result = validateEstimate({ ...request, name: '  ', email: '', zip: '', category: '' });
    expect(result).toMatchObject({ ok: false, fields: { name: expect.any(String), email: expect.any(String), zip: expect.any(String), category: expect.any(String) } });
    for (const email of ['name@example..com', 'name@-example.com', 'name..other@example.com']) {
      expect(validateEstimate({ ...request, email })).toMatchObject({ ok: false, fields: { email: expect.any(String) } });
    }
    expect(validateEstimate({ ...request, email: 'name+project@example.com', zip: '01234', category: 'unsure' })).toMatchObject({ ok: true, data: { zip: '01234', category: 'unsure' } });
  });

  it('accepts empty quote descriptions and bounds legacy project details', () => {
    for (const description of ['a'.repeat(descriptionLimit + 1)]) {
      expect(validateEstimate({ ...request, description })).toMatchObject({ ok: false, fields: { description: expect.any(String) } });
    }
    for (const description of ['', ' ', '\n\t', 'a', 'a'.repeat(descriptionLimit)]) {
      expect(validateEstimate({ ...request, description }).ok).toBe(true);
    }
  });

  it('rejects unexpected values and disclosure versions', () => {
    expect(validateEstimate({ ...request, budget: '10,000' }).ok).toBe(false);
    expect(validateEstimate({ ...request, disclosureVersion: 'old' }).ok).toBe(false);
    expect(validateEstimate({ ...request, source: ' hero ' }).ok).toBe(false);
  });

  it('routes provisional coverage to review', () => {
    expect(checkCoverage('43015', 'kitchen')).toBe('review');
    expect(checkCoverage('43082', 'flooring')).toBe('review');
  });

  it('distinguishes the inline form from the sticky bar and accepts legacy sources', () => {
    expect(validateEstimate({ ...request, source: 'inline', formId: estimateFormIds.inline })).toMatchObject({ ok: true, data: { formId: estimateFormIds.inline } });
    expect(validateEstimate({ ...request, source: 'sticky', formId: estimateFormIds.modal })).toMatchObject({ ok: true, data: { formId: estimateFormIds.modal } });
    expect(validateEstimate({ ...request, source: 'inline', formId: estimateFormIds.modal }).ok).toBe(false);
    expect(validateEstimate({ ...request, source: 'banner' })).toMatchObject({ ok: true, data: { formId: 'legacy-estimate-form' } });
    expect(validateEstimate({ ...request, email: 'homeowner@example.invalid,second@example.invalid' }).ok).toBe(false);
  });

  it('accepts current marketing consent from every form while preserving older consent rules', () => {
    const older = validateEstimate({ ...request, disclosureVersion: previousDisclosureVersion });
    const optedIn = validateEstimate({ ...request, marketingConsentVersion });
    expect(older).toMatchObject({ ok: true, data: { disclosureVersion: previousDisclosureVersion } });
    expect(optedIn).toMatchObject({ ok: true, data: { marketingConsentVersion } });
    expect(validateEstimate({ ...request, disclosureVersion: previousDisclosureVersion, marketingConsentVersion }).ok).toBe(false);
    expect(validateEstimate({ ...request, source: 'footer', marketingConsentVersion }).ok).toBe(true);
    expect(validateEstimate({ ...request, source: 'footer', disclosureVersion: reviewDisclosureVersion, marketingConsentVersion }).ok).toBe(false);
    expect(validateEstimate({ ...request, disclosureVersion: reviewDisclosureVersion, marketingConsentVersion }).ok).toBe(true);
    expect(validateEstimate({ ...request, marketingConsentVersion: true }).ok).toBe(false);
    expect(validateEstimate({ ...request, marketingConsentVersion, marketingConsentedAt: 'not a timestamp' }).ok).toBe(false);
  });

  it('requires a valid phone on current and legacy requests', () => {
    for (const phone of ['', '614-555', '+1 (614) 555-014', '+1 (614) 555-01420', '26145550142', 'Call 6145550142']) {
      for (const version of [disclosureVersion, previousDisclosureVersion]) {
        expect(validateEstimate({ ...request, phone, disclosureVersion: version })).toMatchObject({ ok: false, fields: { phone: expect.any(String) } });
      }
    }
    for (const phone of ['6145550142', '16145550142', '+1 (614) 555-0142']) {
      expect(validateEstimate({ ...request, phone }).ok).toBe(true);
    }
  });

  it('requires a five-digit ZIP for general contact messages and accepts project types alongside older Contact requests', () => {
    const contact = { ...request, source: 'contact', formId: estimateFormIds.contact, zip: '90210', category: '' };
    expect(validateEstimate(contact)).toMatchObject({ ok: true, data: { source: 'contact', formId: estimateFormIds.contact, zip: '90210' } });
    for (const zip of ['', '9021', '90A10']) {
      expect(validateEstimate({ ...contact, zip })).toMatchObject({ ok: false, fields: { zip: expect.any(String) } });
    }
    expect(validateEstimate({ ...contact, phone: '' })).toMatchObject({ ok: false, fields: { phone: expect.any(String) } });
    expect(validateEstimate({ ...contact, category: 'kitchen' }).ok).toBe(true);
    expect(validateEstimate({ ...contact, category: 'other' }).ok).toBe(true);
    expect(validateEstimate({ ...contact, formId: estimateFormIds.modal }).ok).toBe(false);
    expect(validateEstimate({ ...contact, description: '' }).ok).toBe(false);
    expect(validateEstimate({ ...contact, description: '123456789' }).ok).toBe(false);
    expect(validateEstimate({ ...contact, description: '1234567890' }).ok).toBe(true);
  });
});


it('accepts direct hero and sticky requests and rejects mismatched form sources', () => {
  for (const source of ['hero', 'services']) {
    expect(validateEstimate({ ...request, source, formId: estimateFormIds.hero, category: 'other', description: '' }).ok).toBe(true);
  }
  expect(validateEstimate({ ...request, source: 'sticky', formId: estimateFormIds.sticky, description: '' }).ok).toBe(true);
  expect(validateEstimate({ ...request, source: 'header', formId: estimateFormIds.hero }).ok).toBe(false);
  expect(validateEstimate({ ...request, source: 'hero', formId: estimateFormIds.sticky }).ok).toBe(false);
  expect(checkCoverage('43015', 'other')).toBe(checkCoverage('43015', 'unsure'));
});

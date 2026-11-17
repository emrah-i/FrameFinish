import { describe, expect, it } from 'vitest';
import { formatPhone } from '../src/components/estimate/phone';
import { normalizeFields, validateFields } from '../src/shared/estimates';

describe('phone input', () => {
  it.each([
    ['', ''],
    ['1', '+1 (1'],
    ['1234567890', '+1 (123) 456-7890'],
    ['6', '+1 (6'],
    ['6145', '+1 (614) 5'],
    ['6145550142', '+1 (614) 555-0142'],
    ['1-614-555-0142', '+1 (614) 555-0142'],
    ['+1 (614) 555-0142', '+1 (614) 555-0142'],
    ['+16145550142', '+1 (614) 555-0142'],
  ])('formats %j as %j', (value, expected) => {
    expect(formatPhone(value)).toBe(expected);
  });

  it.each(['+44 20 7946 0958', '442079460958', '61455501423', '+1 (614)', '6145550142 extension 4'])(
    'rejects a pasted or autofilled value of %j',
    value => expect(formatPhone(value)).toBeUndefined(),
  );

  it('requires a complete number in the supported +1 format', () => {
    const phoneError = (phone: string) => validateFields(normalizeFields({ phone })).phone;
    expect(phoneError('+1 (614) 555-014')).toBe('Enter a valid phone number');
    expect(phoneError('+1 (614) 555-0142')).toBeUndefined();
    expect(phoneError('+44 20 7946 0958')).toBe('Enter a valid phone number');
  });
});

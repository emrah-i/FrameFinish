export const phonePlaceholder = '(614) 555-0142';

const prefix = '+1 (';
const phoneLength = 10;
const digits = (value: string) => value.replace(/\D/g, '');
const nationalDigits = (value: string) => digits(value.startsWith(prefix) ? value.slice(prefix.length) : value);

function importedDigits(value: string) {
  const input = value.trim();
  if (!input) return '';
  if (!/^(?:\+1)?[\d ().-]+$/.test(input)) return;

  const number = digits(input);
  if (input.startsWith('+') || number.length === phoneLength + 1) {
    if (number.length === phoneLength + 1 && number.startsWith('1')) return number.slice(1);
    return;
  }
  if (number && number.length <= phoneLength) return number;
}

function formatDigits(number: string) {
  if (!number) return '';
  const area = number.slice(0, 3);
  const exchange = number.slice(3, 6);
  const line = number.slice(6);
  return `${prefix}${area}${area.length === 3 ? ')' : ''}${exchange ? ` ${exchange}` : ''}${line ? `-${line}` : ''}`;
}

export function formatPhone(value: string) {
  const number = importedDigits(value);
  return number === undefined ? undefined : formatDigits(number);
}

function selection(input: HTMLInputElement) {
  return {
    value: input.value,
    start: input.selectionStart ?? input.value.length,
    end: input.selectionEnd ?? input.value.length,
  };
}

const phoneSelections = new WeakMap<HTMLInputElement, ReturnType<typeof selection>>();

export function rememberPhoneEdit(event: Event & { currentTarget: HTMLInputElement }) {
  phoneSelections.set(event.currentTarget, selection(event.currentTarget));
}

export function updatePhoneInput(input: HTMLInputElement, event?: Event) {
  const paste = event instanceof ClipboardEvent ? event : undefined;
  paste?.preventDefault();
  const previous = paste ? selection(input) : phoneSelections.get(input);
  const edit = event instanceof InputEvent ? event : undefined;

  function write(value: string, start = value.length, end = start) {
    if (input.value !== value) input.value = value;
    if (input.ownerDocument.activeElement === input) input.setSelectionRange(start, end);
    phoneSelections.set(input, { value, start, end });
    return value;
  }

  const backward = edit?.inputType === 'deleteContentBackward';
  const forward = edit?.inputType === 'deleteContentForward';
  const cut = edit?.inputType === 'deleteByCut';
  const typing = edit?.inputType === 'insertText' && edit.data !== null;
  if (previous && (paste || typing || backward || forward || cut)) {
    const number = nationalDigits(previous.value);
    const prefixLength = previous.value.startsWith(prefix) ? prefix.length : 0;
    let start = digits(previous.value.slice(prefixLength, previous.start)).length;
    let end = digits(previous.value.slice(prefixLength, previous.end)).length;
    const room = phoneLength - (number.length - (end - start));
    const typed = edit?.data ?? '';
    const added = paste ? importedDigits(paste.clipboardData?.getData('text') ?? '') : digits(typed).slice(0, room);
    if (added === undefined || added.length > room || ((paste || typing) && !added)) {
      return write(previous.value, previous.start, previous.end);
    }
    if (previous.start === previous.end) {
      if (backward) start = Math.max(0, start - 1);
      if (forward) end = Math.min(number.length, end + 1);
    }

    const value = formatDigits(number.slice(0, start) + added + number.slice(end));
    let position = value ? prefix.length : 0;
    let remaining = start + added.length;
    while (position < value.length && (remaining > 0 || !/\d/.test(value[position]))) {
      if (/\d/.test(value[position])) remaining--;
      position++;
    }
    return write(value, position);
  }

  if (previous?.value === input.value) return input.value;
  const national = nationalDigits(input.value);
  const formatted = national.length <= phoneLength && formatDigits(national) === input.value
    ? input.value : formatPhone(input.value);
  return formatted === undefined
    ? write(previous?.value ?? '', previous?.start, previous?.end)
    : write(formatted);
}

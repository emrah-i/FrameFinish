import { createContext, onCleanup, onMount, useContext, type ParentProps } from 'solid-js';
import { createStore, reconcile, unwrap } from 'solid-js/store';
import { descriptionLimit } from '../../shared/estimates';

const storageKey = 'frame-finish.form-draft';
const fieldLimits = {
  name: 201, firstName: 100, lastName: 100, email: 254, phone: 30, zip: 5,
  category: 100, description: descriptionLimit, message: descriptionLimit,
};
type Field = keyof typeof fieldLimits;
type Entry = { value: string; revision: string };
type Entries = Partial<Record<Field, Entry>>;
type Changes = Partial<Record<Field, string | undefined>>;
const fields = Object.keys(fieldLimits) as Field[];
const projectFields = ['category', 'description', 'message'] as const;

function decode(raw: string | null): Entries | undefined {
  if (raw === null) return {};
  try {
    const record = JSON.parse(raw);
    if (record?.version !== 1 || !record.fields || typeof record.fields !== 'object') return;
    const entries: Entries = {};
    for (const field of fields) {
      const entry = record.fields[field];
      if (typeof entry?.value === 'string' && typeof entry.revision === 'string') {
        entries[field] = { value: entry.value.slice(0, fieldLimits[field]), revision: entry.revision };
      }
    }
    return entries;
  } catch {
    return;
  }
}

function nameParts(entries: Entries) {
  const [, first = '', last = ''] = entries.name?.value.trim().match(/^(\S+)\s*(.*)$/) ?? [];
  return {
    firstName: entries.firstName?.value ?? first,
    lastName: entries.lastName?.value ?? last,
  };
}

type FormDraft = {
  value: (field: Field) => string | undefined;
  names: () => ReturnType<typeof nameParts>;
  save: (changes: Changes) => void;
  clearProjectAfterSuccess: () => () => void;
};
const DraftContext = createContext<FormDraft>();

export function useFormDraft() {
  return useContext(DraftContext)!;
}

export function FormDraftProvider(props: ParentProps) {
  const [entries, setEntries] = createStore<Entries>({});
  let storage: Storage | undefined;
  const current = (): Entries => {
    if (storage) {
      try {
        const saved = decode(storage.getItem(storageKey));
        if (saved) return saved;
      } catch {
        storage = undefined;
      }
    }
    return { ...unwrap(entries) };
  };

  function commit(next: Entries) {
    setEntries(reconcile(next));
    if (!storage) return;
    try {
      storage.setItem(storageKey, JSON.stringify({ version: 1, fields: next }));
    } catch {
      storage = undefined;
    }
  }

  function save(changes: Changes) {
    const next = current();
    if ('name' in changes) {
      changes = { ...changes, firstName: undefined, lastName: undefined };
    } else if ('firstName' in changes || 'lastName' in changes) {
      const names = { ...nameParts(next), ...changes };
      const name = [names.firstName?.trim(), names.lastName?.trim()].filter(Boolean).join(' ');
      changes = { ...changes, firstName: names.firstName, lastName: names.lastName, name };
    }
    const revision = `${Date.now()}-${Math.random()}`;
    for (const field of fields) {
      if (!(field in changes)) continue;
      const value = changes[field]?.slice(0, fieldLimits[field]);
      if (value === undefined) delete next[field];
      else if (next[field]?.value !== value) next[field] = { value, revision };
    }
    commit(next);
  }

  function clearProjectAfterSuccess() {
    const before = current();
    return () => {
      const next = current();
      for (const field of projectFields) {
        // Keep fields changed in another form or tab while the request was in flight.
        if (next[field]?.revision === before[field]?.revision) delete next[field];
      }
      commit(next);
    };
  }

  onMount(() => {
    try {
      storage = window.localStorage;
    } catch {
      return;
    }
    setEntries(reconcile(current()));
    const sync = (event: StorageEvent) => {
      if (event.storageArea === storage && (event.key === storageKey || event.key === null)) {
        setEntries(reconcile(current()));
      }
    };
    window.addEventListener('storage', sync);
    onCleanup(() => window.removeEventListener('storage', sync));
  });

  return <DraftContext.Provider value={{
    value: field => entries[field]?.value,
    names: () => nameParts(entries),
    save,
    clearProjectAfterSuccess,
  }}>{props.children}</DraftContext.Provider>;
}

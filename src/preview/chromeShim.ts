/**
 * Local preview only: a minimal stand-in for the chrome.* APIs Stepper uses,
 * backed by localStorage so the options page and the fake Azure page share data
 * across tabs. Never bundled into the extension.
 */

type StorageChanges = Record<string, chrome.storage.StorageChange>;
type ChangeListener = (changes: StorageChanges, area: string) => void;

const PREFIX = 'stepper-preview:';
const changeListeners = new Set<ChangeListener>();

function readKey(key: string): unknown {
  const raw = localStorage.getItem(PREFIX + key);
  return raw === null ? undefined : (JSON.parse(raw) as unknown);
}

function allKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key.slice(PREFIX.length));
  }
  return keys;
}

function emit(changes: StorageChanges): void {
  if (Object.keys(changes).length === 0) return;
  for (const listener of changeListeners) listener(changes, 'local');
}

// Changes made in another tab (e.g. the options page) arrive as storage events.
window.addEventListener('storage', (event) => {
  if (!event.key?.startsWith(PREFIX)) return;
  const parse = (value: string | null) => (value === null ? undefined : (JSON.parse(value) as unknown));
  emit({ [event.key.slice(PREFIX.length)]: { oldValue: parse(event.oldValue), newValue: parse(event.newValue) } });
});

const local = {
  async get(keys?: string | string[] | null): Promise<Record<string, unknown>> {
    const list = keys == null ? allKeys() : Array.isArray(keys) ? keys : [keys];
    const out: Record<string, unknown> = {};
    for (const key of list) {
      const value = readKey(key);
      if (value !== undefined) out[key] = value;
    }
    return out;
  },
  async set(items: Record<string, unknown>): Promise<void> {
    const changes: StorageChanges = {};
    for (const [key, value] of Object.entries(items)) {
      changes[key] = { oldValue: readKey(key), newValue: value };
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    }
    emit(changes);
  },
  async remove(keys: string | string[]): Promise<void> {
    const changes: StorageChanges = {};
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      const oldValue = readKey(key);
      if (oldValue === undefined) continue;
      localStorage.removeItem(PREFIX + key);
      changes[key] = { oldValue };
    }
    emit(changes);
  },
};

const ORIGINS_KEY = 'preview-origins';
const readOrigins = (): string[] => (readKey(ORIGINS_KEY) as string[] | undefined) ?? [];
const writeOrigins = (origins: string[]) => localStorage.setItem(PREFIX + ORIGINS_KEY, JSON.stringify(origins));

const openOptionsPage = async (): Promise<void> => {
  window.open('options.html', '_blank');
};

const shim = {
  storage: {
    local,
    onChanged: { addListener: (listener: ChangeListener) => changeListeners.add(listener) },
  },
  runtime: {
    openOptionsPage,
    async sendMessage(message: unknown): Promise<void> {
      if (message === 'stepper:open-options') await openOptionsPage();
    },
  },
  permissions: {
    async getAll() {
      return { origins: readOrigins() };
    },
    async request({ origins = [] }: { origins?: string[] }) {
      writeOrigins([...new Set([...readOrigins(), ...origins])]);
      return true;
    },
    async remove({ origins = [] }: { origins?: string[] }) {
      writeOrigins(readOrigins().filter((o) => !origins.includes(o)));
      return true;
    },
  },
};

(globalThis as unknown as { chrome: unknown }).chrome = shim;

import { DEMO_DATA_VERSION, freshDemoStore } from './demoData';

const STORE_KEY = `kkgt_demo_store_${DEMO_DATA_VERSION}`;
const DATASET_VERSION_KEY = 'kkgt_dataset_version';
const PRESERVED_KEYS = new Set(['kkgt_demo_session']);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
}

export function ensureDemoDatasetVersion() {
  const storage = getStorage();
  if (!storage || storage.getItem(DATASET_VERSION_KEY) === DEMO_DATA_VERSION) return;

  const sessionRaw = storage.getItem('kkgt_demo_session');
  if (sessionRaw) {
    try {
      const session = JSON.parse(sessionRaw);
      session.user = {
        ...session.user,
        email: 'demo-admin@beanledger.local',
        full_name: 'Selamawit Bekele',
      };
      storage.setItem('kkgt_demo_session', JSON.stringify(session));
    } catch {
      storage.removeItem('kkgt_demo_session');
    }
  }

  const staleKeys = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || PRESERVED_KEYS.has(key) || key === DATASET_VERSION_KEY) continue;
    if (
      key === 'kkgt_phase4_demo_store'
      || key === 'kkgt_offline_queue'
      || key.startsWith('kkgt_demo_store_')
      || key.startsWith('kkgt_cache_')
    ) {
      staleKeys.push(key);
    }
  }

  staleKeys.forEach((key) => storage.removeItem(key));
  storage.setItem(DATASET_VERSION_KEY, DEMO_DATA_VERSION);
}

export function readDemoStore() {
  const storage = getStorage();
  if (!storage) return freshDemoStore();
  ensureDemoDatasetVersion();

  const raw = storage.getItem(STORE_KEY);
  if (!raw) {
    const fresh = freshDemoStore();
    storage.setItem(STORE_KEY, JSON.stringify(fresh));
    return fresh;
  }

  try {
    const parsed = JSON.parse(raw);
    const fresh = freshDemoStore();
    const merged = { ...fresh, ...parsed };
    Object.keys(fresh).forEach((key) => {
      if (!Array.isArray(merged[key])) merged[key] = fresh[key];
    });
    storage.setItem(STORE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    const fresh = freshDemoStore();
    storage.setItem(STORE_KEY, JSON.stringify(fresh));
    return fresh;
  }
}

export function writeDemoStore(nextStore) {
  const normalized = clone(nextStore);
  const storage = getStorage();
  if (storage) storage.setItem(STORE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function createDemoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
